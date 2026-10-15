/**
 * Server-side image verification and extraction for Dance Community updates.
 *
 * Priorities:
 *  a) og:image / twitter:image of the item's own source_url
 *  b) Official YouTube thumbnail via oEmbed
 *  c) Organization's official press kit
 *  d) Fallback: dark branded card (imageUrl: null, imageVerified: false)
 *
 * Validation:
 *  - Must be HTTPS
 *  - Must return HTTP 200 with an image content-type
 *  - Must not be from stock photo libraries (Unsplash, Pexels, Shutterstock, etc.)
 *  - Must not be a generic favicon or tiny icon
 *  - Must match the domain of the source URL or an official organization domain
 */

import { ORGANIZATIONS } from './constants.ts';

export interface ImageVerificationResult {
  imageUrl: string | null;
  imageCredit: string | null;
  imageVerified: boolean;
  fallbackReason?: string;
}

const STOCK_DOMAINS = [
  'unsplash.com',
  'images.unsplash.com',
  'pexels.com',
  'images.pexels.com',
  'pixabay.com',
  'shutterstock.com',
  'istockphoto.com',
  'freepik.com',
  'gettyimages.com',
];

const GENERIC_ICON_PATTERNS = [
  /favicon/i,
  /icon-\d+/i,
  /apple-touch-icon/i,
  /default[-_]avatar/i,
  /logo\.svg/i,
  /site[-_]logo/i,
  /placeholder/i,
];

/**
 * Checks if a candidate URL meets the strict verification rules.
 */
export async function validateCandidateImageUrl(
  candidateUrl: string,
  sourceUrl: string,
  organizationName: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const parsedUrl = new URL(candidateUrl);

    // 1. Must be https
    if (parsedUrl.protocol !== 'https:') {
      return { valid: false, reason: 'Protocol is not HTTPS' };
    }

    // 2. Reject stock photo providers
    const hostname = parsedUrl.hostname.toLowerCase();
    if (STOCK_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return { valid: false, reason: 'Image originates from a stock photo provider' };
    }

    // 3. Reject generic icons, favicons, and avatars
    const pathname = parsedUrl.pathname.toLowerCase();
    if (GENERIC_ICON_PATTERNS.some((pat) => pat.test(pathname) || pat.test(candidateUrl))) {
      return { valid: false, reason: 'Image appears to be a generic icon, favicon, or logo mark' };
    }

    // 4. Domain matching check:
    // Either matches sourceUrl domain, or is an official YouTube CDN, or an official org domain
    const sourceHostname = new URL(sourceUrl).hostname.toLowerCase();
    const isSourceDomain =
      hostname === sourceHostname ||
      hostname.endsWith(`.${sourceHostname}`) ||
      sourceHostname.endsWith(`.${hostname}`);

    const isYouTubeCdn =
      hostname === 'i.ytimg.com' ||
      hostname === 'img.youtube.com' ||
      hostname.endsWith('.ytimg.com');

    const isOfficialOrgDomain = ORGANIZATIONS.some((org) =>
      org.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`))
    );

    if (!isSourceDomain && !isYouTubeCdn && !isOfficialOrgDomain) {
      return { valid: false, reason: 'Image domain does not match source or organization official domains' };
    }

    // 5. Head check: HTTP 200, Content-Type image, Content-Length
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const headRes = await fetch(candidateUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'GrooveDanceBeatAgent/1.0 (+https://grooveph.com)',
      },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!headRes || !headRes.ok) {
      return { valid: false, reason: 'Image URL did not return HTTP 200 OK' };
    }

    const contentType = headRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return { valid: false, reason: `Invalid content-type: ${contentType}` };
    }

    const contentLength = headRes.headers.get('content-length');
    if (contentLength && Number(contentLength) < 10000) {
      // Under 10KB is almost always a tiny tracking pixel, icon, or placeholder
      return { valid: false, reason: 'Image size is under minimum 10KB threshold' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Validation check failed: ${err?.message || err}` };
  }
}

/**
 * Resolves verified image from source page og:image or YouTube oEmbed.
 */
export async function resolveVerifiedItemImage(
  sourceUrl: string,
  organizationName: string,
  candidateImageUrl?: string | null
): Promise<ImageVerificationResult> {
  if (!sourceUrl || !sourceUrl.startsWith('https://')) {
    return {
      imageUrl: null,
      imageCredit: null,
      imageVerified: false,
      fallbackReason: 'Invalid or missing source URL',
    };
  }

  // Priority B: YouTube video URL via official oEmbed
  const isYouTube =
    sourceUrl.includes('youtube.com/watch') ||
    sourceUrl.includes('youtu.be/') ||
    sourceUrl.includes('youtube.com/shorts');

  if (isYouTube) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail_url) {
          const validation = await validateCandidateImageUrl(data.thumbnail_url, sourceUrl, organizationName);
          if (validation.valid) {
            return {
              imageUrl: data.thumbnail_url,
              imageCredit: data.author_name ? `${data.author_name} (YouTube)` : organizationName,
              imageVerified: true,
            };
          }
        }
      }
    } catch {
      // Proceed to fallback
    }
  }

  // Priority A: Server-side extract og:image / twitter:image from source_url HTML
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const pageRes = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (pageRes.ok) {
      const html = await pageRes.text();
      // Extract og:image
      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);

      let extracted = ogMatch?.[1] || twitterMatch?.[1];

      if (extracted) {
        // Resolve relative URL
        if (extracted.startsWith('/')) {
          const base = new URL(sourceUrl).origin;
          extracted = `${base}${extracted}`;
        }

        const validation = await validateCandidateImageUrl(extracted, sourceUrl, organizationName);
        if (validation.valid) {
          return {
            imageUrl: extracted,
            imageCredit: organizationName,
            imageVerified: true,
          };
        }
      }
    }
  } catch {
    // Proceed to candidate check or fallback
  }

  // Priority C: Check candidateImageUrl (if passed from official press kit)
  if (candidateImageUrl && candidateImageUrl.startsWith('https://')) {
    const validation = await validateCandidateImageUrl(candidateImageUrl, sourceUrl, organizationName);
    if (validation.valid) {
      return {
        imageUrl: candidateImageUrl,
        imageCredit: organizationName,
        imageVerified: true,
      };
    }
  }

  // Priority D: Fallback to dark branded card
  return {
    imageUrl: null,
    imageCredit: null,
    imageVerified: false,
    fallbackReason: 'No verified official source image found; rendering dark branded fallback card',
  };
}
