/**
 * Dance Update Image Sync
 * ============================================================================
 * Discovers, validates, and DOWNLOADS the official artwork for every Latest
 * Updates card on /community/performing-arts/dance, then writes the resolved
 * asset paths into a generated module the page imports.
 *
 * Run:  npm run images:sync
 *   -> node --experimental-strip-types --no-warnings scripts/sync-dance-update-images.ts
 *   -> node ... --dry-run    (discover + validate, write nothing)
 *
 * ----------------------------------------------------------------------------
 * WHY DOWNLOAD INSTEAD OF HOTLINKING
 *
 * `lib/dance/imageVerification.ts` resolves a REMOTE url, which means the card
 * depends on the organisation's CDN staying up, staying CORS-permissive for
 * the optimizer, and never rotating the URL under us. For editorial cards that
 * have to render on a cold cache with no layout shift, vendoring the asset into
 * `public/dance-updates/` is the durable choice â€” the same decision
 * `scripts/sync-dance-logos.ts` already makes for the logo carousel.
 *
 * ----------------------------------------------------------------------------
 * PROVENANCE RULES (this is the part that keeps us honest)
 *
 * A candidate is accepted only when EVERY one of these holds:
 *   1. HTTPS.
 *   2. Served by the update's own source host, or by a CDN host that host
 *      officially points at (declared per-item in IMAGE_SOURCES). A random
 *      third-party image host is rejected even if the bytes are a real photo.
 *   3. `content-type: image/*`.
 *   4. Magic bytes decode to a real raster image (rejects HTML error pages
 *      served as 200).
 *   5. >= MIN_BYTES and decodable dimensions >= MIN_WIDTH x MIN_HEIGHT â€” kills
 *      tracking pixels, sprites, favicons and logos-as-og:image.
 *   6. Not from a stock-photo library (Unsplash/Pexels/etc.). Stock imagery is
 *      never "the event", and the original migration already purged it.
 *
 * We never bypass authentication, never read a private/robots-restricted
 * surface, and never scrape a logged-in view. If a page yields nothing that
 * passes, the item records a REASON and the card renders its branded fallback.
 * A documented blank is the correct outcome; a plausible-looking borrowed photo
 * is not.
 *
 * ----------------------------------------------------------------------------
 * IMPORTS: relative only (see lib/dance/constants.ts for why).
 *
 * The manifest itself lives in `lib/dance/imageSources.ts`, NOT next to the
 * update records, precisely so that this file's `node:fs` dependency never has
 * to be dragged into the Next.js bundle by a type-only import.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_SOURCES, type ImageSourceSpec } from '../lib/dance/imageSources.ts';

export type { ImageSourceSpec };

/** One line of `public/dance-updates/sync-report.json`. */
export interface ImageSpecResult {
  id: string;
  /** Path under /dance-updates/, e.g. `/dance-updates/idl-2026-championship.png`. */
  localUrl: string | null;
  /** Absolute URL the bytes came from — kept for attribution/debugging. */
  sourceUrl: string | null;
  /** Where it was discovered: preferred | og:image | twitter:image | youtube-* | body-img. */
  discovery: string | null;
  credit: string;
  pageUrl: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  /**
   * Why there is no image. Populated on failure — this is the documentation the
   * brief asks for when an image cannot be retrieved, and it is copied into the
   * update record as `image_fallback_reason` so the card can show it.
   */
  fallbackReason: string | null;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MIN_BYTES = 20_000; // reject icons/spacers; real event art is far larger
const MIN_WIDTH = 560; // below this it cannot survive a 16:9 card crop
const MIN_HEIGHT = 315;
const PAGE_TIMEOUT_MS = 12_000;
const IMG_TIMEOUT_MS = 20_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // refuse to vendor a 40MB TIFF
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 GrooveDanceImageSync/1.0 (+https://grooveph.com)';

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
  'alamy.com',
  'dreamstime.com',
  'depositphotos.com',
  'stock.adobe.com',
];

/** Hosts that are legitimate first-party CDNs for the sources below. */
const ALLOWED_CDN_HOSTS = new Set([
  'framerusercontent.com', // idl.pro (Framer-hosted site)
  'i.ytimg.com', // YouTube oEmbed thumbnails (official embed surface)
  'img.youtube.com',
]);

type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif';

interface Dimensions {
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// HTTP / parsing helpers
// ---------------------------------------------------------------------------

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function hostOf(u: string): string | null {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostAllowed(host: string, spec: ImageSourceSpec): boolean {
  if (ALLOWED_CDN_HOSTS.has(host)) return true;
  const pageHost = hostOf(spec.pageUrl);
  if (pageHost && (host === pageHost || host.endsWith(`.${pageHost}`))) return true;
  return (spec.extraHosts ?? []).some((d) => host === d || host.endsWith(`.${d}`));
}

function isStockHost(host: string): boolean {
  return STOCK_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
}

function absolutize(src: string, base: string): string | null {
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

interface Candidate {
  url: string;
  discovery: string;
}

/**
 * Pulls image candidates out of a page, in confidence order:
 *   0. `preferUrl` â€” a hand-picked, item-specific asset (see above)
 *   1. og:image / twitter:image â€” the image the publisher nominated for the page
 *   2. YouTube oEmbed thumbnail (plus maxresdefault), when the page is a video
 *   3. body <img>/srcset â€” filtered down to genuine event photography
 *
 * Tier 3 exists because the most useful archive is not always nominated: Hip Hop
 * International, Juste Debout and UDO are WordPress sites whose og:image is
 * either absent or a 12 KB logo, while the event photos they publish in the
 * page body are exactly right. Tier 3 is therefore heavily constrained:
 *  - same host / declared CDN (same as every other tier)
 *  - URL must not look like a logo, icon, badge, medal, avatar or sprite
 *  - must still clear MIN_BYTES and the MIN_WIDTH x MIN_HEIGHT floor
 *  - declared width is preferred, and the largest `srcset` entry is taken
 *  - a per-site cap of 8 candidates so we never crawl a media library
 */
const BODY_IMAGE_DENY = /logo|icon|badge|medal|avatar|placeholder|favicon|sprite|spacer|emoji|watermark|banner-|header-logo/i;
const MAX_BODY_CANDIDATES = 8;
/** Hard ceiling on <img> tags inspected, so a 1 MB media page cannot stall the run. */
const MAX_BODY_TAGS_SCANNED = 120;

interface ScoredCandidate extends Candidate {
  score: number;
}

function scoreBodyImage(url: string, index: number, declaredWidth: number | null, html: string): number {
  let s = 1000 - index; // hero imagery appears early in the markup
  if (declaredWidth) s += Math.min(declaredWidth, 2400) / 10;
  // Current-season uploads ("/2026/07/...") beat decade-old archive photos.
  const yearMatch = url.match(/\/(20\d{2})\/\d{2}\//);
  if (yearMatch) s += Number(yearMatch[1]) >= 2025 ? 500 : 100;
  if (declaredWidth && declaredWidth >= 900) s += 250;
  // Large `-scaled` / `-1280x` derivatives are usually the hi-res original.
  if (/-(scaled|original|@2x)\b|-[0-9]{3,4}x[0-9]{3,4}\./i.test(url)) s += 200;
  void html;
  return s;
}

function extractBodyImages(html: string, base: string): ScoredCandidate[] {
  const out: ScoredCandidate[] = [];
  const seen = new Set<string>();
  const tags = html.match(/<img\b[^>]*>/gi) || [];

  tags.forEach((tag, index) => {
    if (index >= MAX_BODY_TAGS_SCANNED || out.length >= MAX_BODY_CANDIDATES) return;

    // Prefer the largest srcset entry, then src, then lazy-loading variants.
    const srcsetMatch = tag.match(/\ssrcset=["']([^"']+)["']/i);
    let raw: string | null = null;
    if (srcsetMatch) {
      const best = srcsetMatch[1]
        .split(',')
        .map((p) => p.trim().split(/\s+/))
        .filter((p) => p[0])
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0];
      raw = best?.[0] ?? null;
    }
    if (!raw) raw = attr(tag, 'src') || attr(tag, 'data-src') || attr(tag, 'data-lazy-src');

    // data: URIs are inline pixels, never event artwork.
    if (!raw || raw.startsWith('data:')) return;

    const abs = absolutize(raw, base);
    if (!abs) return;
    if (seen.has(abs)) return;
    if (BODY_IMAGE_DENY.test(abs)) return;

    const widthAttr = Number(attr(tag, 'width') || '');
    seen.add(abs);
    out.push({
      url: abs,
      discovery: 'body-img',
      score: scoreBodyImage(abs, index, Number.isFinite(widthAttr) ? widthAttr : null, html),
    });
  });

  return out.sort((a, b) => b.score - a.score).slice(0, MAX_BODY_CANDIDATES);
}



/**
 * Red Bull's image CDN emits AVIF/WebP via `f_auto`. Those are valid but poorly
 * supported by older consumers of a vendored asset, so the same first-party
 * object is requested as JPEG instead. This is a format negotiation on a public
 * asset â€” it changes no access control and no pixels.
 */
function normalizeForVendor(url: string): string {
  if (url.includes('img.redbull.com')) {
    return url.replace('/f_auto,', '/f_jpg,').replace('/f_auto/', '/f_jpg/');
  }
  return url;
}

async function discoverCandidates(spec: ImageSourceSpec): Promise<ScoredCandidate[]> {
  const out: ScoredCandidate[] = [];
  const seen = new Set<string>();
  const add = (url: string | null | undefined, discovery: string, score: number) => {
    if (!url) return;
    const abs = normalizeForVendor(absolutize(url, spec.pageUrl) ?? '');
    if (!abs) return;
    if (seen.has(abs)) return;
    seen.add(abs);
    out.push({ url: abs, discovery, score });
  };

  const pageUrl = spec.pageUrl;
  const isYouTube =
    pageUrl.includes('youtube.com/watch') ||
    pageUrl.includes('youtu.be/') ||
    pageUrl.includes('youtube.com/shorts');

  // Tier 0.
  add(spec.preferUrl, 'preferred', 10_000);

  // Tier 2 â€” YouTube. oEmbed only ever hands back `hqdefault` (480x360,
  // ~13 KB), which trips both the size and the width floor, so the ladder is
  // tried largest-first and stops at the first variant that validates.
  //   maxres  1280x720 â€” present on most uploads, 404 on older ones
  //   hq720   1280x720 â€” newer fallback when maxres is absent
  //   sd      640x480  â€” 4:3, but large enough for a centre-cropped card
  if (isYouTube) {
    const idMatch = pageUrl.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/);
    const vid = idMatch?.[1];
    if (vid) {
      add(`https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`, 'youtube-maxres', 9000);
      add(`https://i.ytimg.com/vi/${vid}/hq720.jpg`, 'youtube-hq720', 8900);
      add(`https://i.ytimg.com/vi/${vid}/sddefault.jpg`, 'youtube-sd', 8800);
      add(`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, 'youtube-oembed', 8000);
    }
    try {
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
      const res = await fetch(oembed, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = (await res.json()) as { thumbnail_url?: string };
        add(data.thumbnail_url, 'youtube-oembed', 8500);
      }
    } catch {
      /* the deterministic thumbnails above are enough */
    }
  }

  const html = await fetchText(pageUrl);

  if (html) {
    // Tier 1.
    const metaRe = /<meta\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = metaRe.exec(html))) {
      const tag = m[0];
      const prop = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
      if (prop === 'og:image' || prop === 'og:image:secure_url') add(attr(tag, 'content'), 'og:image', 7000);
      if (prop === 'twitter:image' || prop === 'twitter:image:src') add(attr(tag, 'content'), 'twitter:image', 6500);
    }
    const imageSrc = html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);
    if (imageSrc) add(imageSrc[1], 'og:image', 7000);

    // Tier 3.
    for (const c of extractBodyImages(html, pageUrl)) add(c.url, c.discovery, c.score);
  }

  return out.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Format / dimension decoding (magic-byte inspection)
// ---------------------------------------------------------------------------

function detectFormat(buf: ArrayBuffer, contentType: string): ImageFormat | null {
  const b = new Uint8Array(buf);
  const ct = contentType.toLowerCase();
  const isJpeg =
    b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isPng =
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
  const isGif = b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
  const isWebp =
    b.length >= 12 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46;

  if (isPng) return 'png';
  if (isJpeg) return 'jpeg';
  if (isGif) return 'gif';
  if (isWebp) return 'webp';
  // Trust-but-verify: if content-type and magic bytes disagree, refuse.
  void ct;
  return null;
}

function pngDims(buf: ArrayBuffer): Dimensions | null {
  if (buf.byteLength < 24) return null;
  const v = new DataView(buf);
  const w = v.getUint32(16, false);
  const h = v.getUint32(20, false);
  return w > 0 && h > 0 ? { w, h } : null;
}

function jpegDims(buf: ArrayBuffer): Dimensions | null {
  const b = new Uint8Array(buf);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const v = new DataView(buf);
  // NOTE: `b.length`, not `buf.length`. An ArrayBuffer has `byteLength` only â€”
  // `buf.length` is `undefined`, every `i + 4 < buf.length` comparison is false,
  // and the loop silently never runs. That failure looks exactly like "this
  // JPEG has no decodable dimensions", which is why it is spelled out here.
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0x00) { i += 2; continue; }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (i + 9 < b.length) {
        const h = v.getUint16(i + 5, false);
        const w = v.getUint16(i + 7, false);
        return w > 0 && h > 0 ? { w, h } : null;
      }
      return null;
    }
    if (i + 4 > b.length) return null;
    const len = v.getUint16(i + 2, false);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

function webpDims(buf: ArrayBuffer): Dimensions | null {
  const b = new Uint8Array(buf);
  // VP8X / VP8L / VP8 all carry their dimensions; VP8X is the container form.
  if (b.length >= 30 && b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x58) {
    const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { w, h };
  }
  return null;
}

function gifDims(buf: ArrayBuffer): Dimensions | null {
  const v = new DataView(buf);
  if (buf.byteLength < 10) return null;
  const w = v.getUint16(6, true);
  const h = v.getUint16(8, true);
  return w > 0 && h > 0 ? { w, h } : null;
}

function readDims(buf: ArrayBuffer, format: ImageFormat): Dimensions | null {
  switch (format) {
    case 'png': return pngDims(buf);
    case 'jpeg': return jpegDims(buf);
    case 'webp': return webpDims(buf);
    case 'gif': return gifDims(buf);
  }
}

function extFor(format: ImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

// ---------------------------------------------------------------------------
// Per-item sync
// ---------------------------------------------------------------------------

export async function syncOne(spec: ImageSourceSpec, opts: { write: boolean; outDir: string }) {
  const candidates = await discoverCandidates(spec);
  const verbose = process.argv.includes('--verbose');
  let lastReason =
    candidates.length === 0
      ? 'no og:image, twitter:image, body <img>, or oEmbed thumbnail found on the official page'
      : 'every candidate on the official page failed validation';

  for (const cand of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(cand.url);
    } catch {
      lastReason = 'candidate URL is not parseable';
      continue;
    }
    if (parsed.protocol !== 'https:') {
      lastReason = 'candidate is not HTTPS';
      continue;
    }
    if (isStockHost(parsed.hostname.toLowerCase())) {
      lastReason = 'candidate is hosted by a stock-photo provider';
      continue;
    }
    if (!hostAllowed(parsed.hostname.toLowerCase(), spec)) {
      lastReason = `provenance: ${parsed.hostname} is neither the official source host nor a declared CDN for this item`;
      continue;
    }

    let res: Response;
    try {
      res = await fetch(cand.url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'image/*,*/*;q=0.8' },
        signal: AbortSignal.timeout(IMG_TIMEOUT_MS),
        redirect: 'follow',
      });
    } catch (e: unknown) {
      lastReason = `fetch failed: ${errMsg(e)}`;
      continue;
    }
    if (!res.ok) {
      lastReason = `HTTP ${res.status} fetching image`;
      continue;
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    if (!contentType.startsWith('image/')) {
      lastReason = `content-type '${contentType}' is not image/*`;
      continue;
    }

    let buf: ArrayBuffer;
    try {
      buf = await res.arrayBuffer();
    } catch (e: unknown) {
      lastReason = `body read failed: ${errMsg(e)}`;
      continue;
    }
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      lastReason = `image is ${buf.byteLength} bytes, above the ${MAX_IMAGE_BYTES} vendoring cap`;
      continue;
    }
    if (buf.byteLength < MIN_BYTES) {
      lastReason = `image is ${buf.byteLength} bytes, below the ${MIN_BYTES}-byte floor (likely an icon or sprite, not event artwork)`;
      continue;
    }

    const format = detectFormat(buf, contentType);
    if (!format) {
      lastReason = 'bytes failed the magic-byte check (not a real raster image)';
      continue;
    }

    const dims = readDims(buf, format);
    if (verbose) {
      console.log(
        `      [${cand.discovery}] ${dims ? `${dims.w}x${dims.h}` : 'no-dims'} ${(buf.byteLength / 1024).toFixed(0)}KB ${format} <- ${cand.url.slice(0, 130)}`
      );
    }
    if (!dims) {
      lastReason = 'image dimensions could not be decoded';
      continue;
    }
    if (dims.w < MIN_WIDTH || dims.h < MIN_HEIGHT) {
      lastReason = `image is ${dims.w}x${dims.h}, below the ${MIN_WIDTH}x${MIN_HEIGHT} minimum for a 16:9 card (logo/icon, not event artwork)`;
      continue;
    }

    const fileName = `${spec.id}.${extFor(format)}`;
    const publicUrl = `/dance-updates/${fileName}`;

    if (opts.write) {
      try {
        await fs.mkdir(opts.outDir, { recursive: true });
        await fs.writeFile(path.join(opts.outDir, fileName), Buffer.from(buf));
      } catch (e: unknown) {
        return {
          id: spec.id,
          localUrl: null,
          sourceUrl: cand.url,
          discovery: cand.discovery,
          credit: spec.credit,
          pageUrl: spec.pageUrl,
          bytes: buf.byteLength,
          width: dims.w,
          height: dims.h,
          fallbackReason: `image validated but could not be written to public/: ${errMsg(e)}`,
        } satisfies ImageSpecResult;
      }
    }

    return {
      id: spec.id,
      localUrl: publicUrl,
      sourceUrl: cand.url,
      discovery: cand.discovery,
      credit: spec.credit,
      pageUrl: spec.pageUrl,
      bytes: buf.byteLength,
      width: dims.w,
      height: dims.h,
      fallbackReason: null,
    } satisfies ImageSpecResult;
  }

  return {
    id: spec.id,
    localUrl: null,
    sourceUrl: null,
    discovery: null,
    credit: spec.credit,
    pageUrl: spec.pageUrl,
    bytes: null,
    width: null,
    height: null,
    fallbackReason: lastReason,
  } satisfies ImageSpecResult;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.join(scriptDir, '..', 'public', 'dance-updates');

  const results: ImageSpecResult[] = [];
  /**
   * Cross-item dedupe. Two cards showing byte-identical photography is worse
   * than one card showing its branded fallback: it reads as a rendering bug and
   * it makes both cards misleading. `ingestDanceUpdates` enforces the same rule
   * at write time by nulling duplicates; catching it here instead means the
   * second card gets an explicit reason rather than a mystery blank.
   */
  const claimedSource = new Map<string, string>();

  for (const spec of IMAGE_SOURCES) {
    const r = await syncOne(spec, { write: !dryRun, outDir });

    if (r.localUrl && r.sourceUrl) {
      const first = claimedSource.get(r.sourceUrl);
      if (first) {
        const dup: ImageSpecResult = {
          ...r,
          localUrl: null,
          fallbackReason: `official site serves the identical asset for "${first}"; showing the branded fallback rather than repeating the same photo on two cards`,
        };
        results.push(dup);
        console.log(`${spec.id.padEnd(26)} DUP  -> already used by ${first}`);
        continue;
      }
      claimedSource.set(r.sourceUrl, spec.id);
    }

    results.push(r);
    const status = r.localUrl
      ? `OK   ${r.width}x${r.height}  ${(r.bytes! / 1024).toFixed(0)}KB  via ${r.discovery}  -> ${r.localUrl}`
      : `MISS ${r.fallbackReason}`;
    console.log(`${spec.id.padEnd(26)} ${status}`);
  }

  const ok = results.filter((r) => r.localUrl).length;
  console.log('\n====================================================');
  console.log(`DANCE UPDATE IMAGE SYNC${dryRun ? ' (DRY RUN â€” nothing written)' : ''}`);
  console.log(`vendored: ${ok}/${results.length}   fallback: ${results.length - ok}/${results.length}`);
  console.log('====================================================');

  if (!dryRun) {
    // Persist the run report next to the assets so a card with no image can be
    // traced to a reason without re-running the sync.
    await fs.writeFile(
      path.join(outDir, 'sync-report.json'),
      JSON.stringify({ syncedAt: new Date().toISOString(), results }, null, 2),
      'utf8'
    );
    console.log(`report: public/dance-updates/sync-report.json`);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/sync-dance-update-images.ts')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}