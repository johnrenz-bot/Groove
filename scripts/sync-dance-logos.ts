/**
 * Dance Organization Logo Sync
 * ============================================================================
 * Discovers, validates, and downloads the official logos for the dance
 * organizations shown in the community logo carousel, then upserts the
 * `dance_orgs` table by slug using the Supabase service role.
 *
 * Run manually:   npm run logos:sync
 *   -> node --experimental-strip-types --no-warnings scripts/sync-dance-logos.ts
 * Scheduled:      /api/cron/dance-logos  (weekly, via vercel.json)
 *
 * ----------------------------------------------------------------------------
 * IMPORTS: relative only. This file is run directly by `node
 * --experimental-strip-types` (which cannot resolve the `@/` webpack alias) AND
 * bundled by webpack into the cron route. Everything it pulls in must resolve
 * in both worlds: `@supabase/supabase-js` (node_modules), `node:` built-ins,
 * and `../lib/dance/constants.ts` (relative). See lib/dance/constants.ts header
 * comment for the import-free constraint rationale.
 *
 * LOGO VALIDATION: this deliberately does NOT reuse lib/dance/imageVerification.ts
 * — that module rejects favicons, logo.svg, and apple-touch-icons, which ARE
 * valid last-resort logo sources for a logo carousel. The validator below is
 * logo-tailored: it accepts SVG, PNG, JPEG, WebP, GIF, and the icon/link sources,
 * while still enforcing HTTPS, HTTP 200, image/* content-type, a >=1KB size
 * floor, official-domain provenance, and a real-image magic-byte check so an
 * HTML error page or tracking pixel served as 200 is never accepted.
 *
 * PRESERVATION: if a row already has logo_verified=true and the current run
 * cannot find a valid replacement, the existing logo_url / logo_source_url /
 * logo_verified are kept and only updated_at is refreshed. On read-only
 * filesystems (Vercel runtime), file writes are skipped gracefully and any
 * existing committed logo_url is preserved.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORGANIZATIONS } from '../lib/dance/constants.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CandidateKind =
  | 'header-logo'
  | 'inline-svg'
  | 'og-image'
  | 'apple-touch-icon'
  | 'favicon';

export interface OrgDef {
  slug: string;
  name: string;
  website_url: string;
  officialDomains: string[];
  candidatePaths: string[];
}

export interface OrgSyncResult {
  slug: string;
  name: string;
  logo_url: string | null;
  logo_source_url: string | null;
  logo_verified: boolean;
  fallbackReason: string | null;
  preserved: boolean;
  wroteFile: boolean;
  sourceKind: CandidateKind | null;
}

export interface SyncReport {
  ok: boolean;
  results: OrgSyncResult[];
  updated: number;
  preserved: number;
  fallbackCount: number;
  dbWriteSkipped: boolean;
}

interface Candidate {
  kind: CandidateKind;
  url?: string; // for fetched candidates
  svg?: string; // for inline-svg
  sourceUrl: string; // page the candidate came from (provenance)
}

interface ExistingRow {
  logo_url: string | null;
  logo_source_url: string | null;
  logo_verified: boolean;
}

type ImageFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'gif';

interface ValidationSuccess {
  valid: true;
  contentType: string;
  bytes?: ArrayBuffer; // raster
  text?: string; // svg
  format: ImageFormat;
}
interface ValidationFailure {
  valid: false;
  reason: string;
}
type ValidationResult = ValidationSuccess | ValidationFailure;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MIN_BYTES = 1024; // reject tracking pixels / tiny icons (spec: >= 1KB)
const OG_MAX_DIM = 600; // og:image must be logo-sized, not a 1200x630 social card
const PAGE_TIMEOUT_MS = 8000;
const IMG_TIMEOUT_MS = 10000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 GrooveDanceLogoSync/1.0';

// ---------------------------------------------------------------------------
// Org list — keep in sync with supabase/seed_dance_orgs.sql
// ---------------------------------------------------------------------------
// Required 7 + researched international (Battle of the Year, WDSF) + researched
// Philippine bodies. No strict .ph ccTLD domain could be confirmed for a major
// Philippine dance league during research; the two most reputable PH dance
// bodies with official sites are used (Hip Hop International Philippines — the
// official PH affiliate of HHI; Philippine DanceSport Federation — the national
// governing body for breaking/dancesport). Logos are resolved/verified by the
// sync and fall back to text pills when the network is unavailable.

const RAW_ORGS: Pick<OrgDef, 'slug' | 'name' | 'website_url'>[] = [
  { slug: 'idl', name: 'IDL (International Dance League)', website_url: 'https://www.thedancelebague.com' },
  { slug: 'steezy', name: 'STEEZY', website_url: 'https://www.steezy.com' },
  { slug: 'world-of-dance', name: 'World of Dance', website_url: 'https://www.worldofdance.com' },
  { slug: 'hhi', name: 'Hip Hop International', website_url: 'https://www.hiphopinternational.com' },
  { slug: 'red-bull-dance-your-style', name: 'Red Bull Dance Your Style', website_url: 'https://www.redbull.com/danceyourstyle' },
  { slug: 'juste-debout', name: 'Juste Debout', website_url: 'https://juste-debout.com' },
  { slug: 'udo', name: 'UDO (United Dance Organisation)', website_url: 'https://www.udodanceworld.com' },
  { slug: 'battle-of-the-year', name: 'Battle of the Year', website_url: 'https://www.battleoftheyear.net' },
  { slug: 'wdsf', name: 'WDSF (World DanceSport Federation)', website_url: 'https://www.worlddancesport.org' },
  { slug: 'hhi-philippines', name: 'Hip Hop International Philippines', website_url: 'https://hhiphilippines.com' },
  { slug: 'philippine-dancesport', name: 'Philippine DanceSport Federation', website_url: 'https://philippinedancesport.com' },
];

// Cross-reference the existing import-free org list so the official domains
// declared there stay authoritative for the 7 orgs it already covers.
const CONSTANTS_DOMAINS: Record<string, string[]> = {};
for (const o of ORGANIZATIONS) CONSTANTS_DOMAINS[o.id] = [...o.domains];

function deriveOfficialDomains(website_url: string, slug: string): string[] {
  const fromConstants = CONSTANTS_DOMAINS[slug];
  if (fromConstants && fromConstants.length) return fromConstants;
  try {
    const host = new URL(website_url).hostname.replace(/^www\./, '');
    return [host];
  } catch {
    return [];
  }
}

function buildCandidatePaths(website_url: string): string[] {
  const origin = new URL(website_url).origin;
  return [`${origin}/press`, `${origin}/media`];
}

const ORGS: OrgDef[] = RAW_ORGS.map((o) => ({
  slug: o.slug,
  name: o.name,
  website_url: o.website_url,
  officialDomains: deriveOfficialDomains(o.website_url, o.slug),
  candidatePaths: buildCandidatePaths(o.website_url),
}));

// ---------------------------------------------------------------------------
// HTTP / parsing helpers
// ---------------------------------------------------------------------------

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

async function fetchText(url: string, timeoutMs = PAGE_TIMEOUT_MS): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

function extractAttrValue(tag: string, attr: string): string | null {
  const re = new RegExp(`\\s${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? m[1] : null;
}

/**
 * Scans raw HTML (no DOM parser available in a node script) for logo image
 * candidates in priority order: og/twitter image -> <img> logo -> inline <svg>
 * logo -> apple-touch-icon -> favicon (largest first). The caller re-tiers by
 * source page (press kit vs homepage) when building the final ordered list.
 */
function extractCandidatesFromHtml(html: string, pageUrl: string): Candidate[] {
  const out: Candidate[] = [];
  const pushUrl = (kind: CandidateKind, rawUrl: string) => {
    const u = resolveUrl(rawUrl, pageUrl);
    if (u) out.push({ kind, url: u, sourceUrl: pageUrl });
  };

  let m: RegExpExecArray | null;

  // og:image / twitter:image (lowest "real logo" confidence — gated in validator)
  const metaRe = /<meta\b[^>]*>/gi;
  while ((m = metaRe.exec(html))) {
    const tag = m[0];
    const prop = (extractAttrValue(tag, 'property') || extractAttrValue(tag, 'name') || '').toLowerCase();
    if (prop === 'og:image' || prop === 'twitter:image') {
      const content = extractAttrValue(tag, 'content');
      if (content) pushUrl('og-image', content);
    }
  }

  // <img> with "logo" in src/class/id/alt
  const imgRe = /<img\b[^>]*>/gi;
  while ((m = imgRe.exec(html))) {
    const tag = m[0];
    const src = extractAttrValue(tag, 'src') || extractAttrValue(tag, 'data-src');
    if (!src) continue;
    const cls = extractAttrValue(tag, 'class') || '';
    const id = extractAttrValue(tag, 'id') || '';
    const alt = extractAttrValue(tag, 'alt') || '';
    if (/logo/i.test(`${src} ${cls} ${id} ${alt}`)) pushUrl('header-logo', src);
  }

  // inline <svg> with "logo" in class/id
  const svgRe = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
  while ((m = svgRe.exec(html))) {
    const tag = m[0];
    if (/(class|id)\s*=\s*["'][^"']*logo/i.test(tag)) {
      out.push({ kind: 'inline-svg', svg: tag, sourceUrl: pageUrl });
    }
  }

  // <link rel> icons — apple-touch-icon first, then generic icons (largest first)
  const icons: { url: string; size: number; isApple: boolean }[] = [];
  const linkRe = /<link\b[^>]*>/gi;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const rel = (extractAttrValue(tag, 'rel') || '').toLowerCase();
    const href = extractAttrValue(tag, 'href');
    if (!href) continue;
    const sizes = extractAttrValue(tag, 'sizes') || '';
    let size = 0;
    const sm = sizes.match(/(\d+)\s*x\s*\d+/i);
    if (sm) size = parseInt(sm[1], 10);
    if (rel.includes('apple-touch-icon')) {
      icons.push({ url: href, size: size || 180, isApple: true });
    } else if (rel === 'icon' || rel === 'shortcut icon' || rel.includes('icon')) {
      icons.push({ url: href, size, isApple: false });
    }
  }
  const apples = icons.filter((f) => f.isApple).sort((a, b) => b.size - a.size);
  const favicons = icons.filter((f) => !f.isApple).sort((a, b) => b.size - a.size);
  for (const f of apples) pushUrl('apple-touch-icon', f.url);
  for (const f of favicons) pushUrl('favicon', f.url);

  return out;
}

/**
 * Builds the ordered candidate list for one org, in discovery priority order:
 *   1. press/brand kit pages -> header logos / inline svg / apple-touch
 *   2. homepage header logo / inline svg
 *   3. og:image (confirmation-gated in the validator)
 *   4. apple-touch-icon, then favicon (largest first)
 */
async function discoverLogoCandidates(org: OrgDef): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const add = (c: Candidate) => {
    const key = c.url || `svg:${c.sourceUrl}:${(c.svg || '').slice(0, 64)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  };

  // Tier 1: press/brand kit pages.
  for (const pageUrl of org.candidatePaths) {
    const html = await fetchText(pageUrl);
    if (!html) continue;
    for (const c of extractCandidatesFromHtml(html, pageUrl)) {
      if (c.kind === 'header-logo' || c.kind === 'inline-svg' || c.kind === 'apple-touch-icon') add(c);
    }
  }

  // Tiers 2-4: homepage.
  const homeHtml = await fetchText(org.website_url);
  if (homeHtml) {
    const extracted = extractCandidatesFromHtml(homeHtml, org.website_url);
    for (const c of extracted) if (c.kind === 'header-logo' || c.kind === 'inline-svg') add(c);
    for (const c of extracted) if (c.kind === 'og-image') add(c);
    for (const c of extracted) if (c.kind === 'apple-touch-icon') add(c);
    for (const c of extracted) if (c.kind === 'favicon') add(c);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Image format detection / dimension decoding (magic-byte inspection)
// ---------------------------------------------------------------------------

function detectImageFormat(buf: ArrayBuffer, contentType: string): ImageFormat | null {
  const bytes = new Uint8Array(buf);
  if (contentType.includes('svg')) {
    const text = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart();
    if (text.startsWith('<svg') || text.startsWith('<?xml') || text.includes('<svg')) return 'svg';
    return null;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  // GIF: 47 49 46 38
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'gif';
  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

function pngDimensions(buf: ArrayBuffer): { w: number; h: number } | null {
  if (buf.byteLength < 24) return null;
  const view = new DataView(buf);
  try {
    const w = view.getUint32(16, false); // IHDR width, big-endian
    const h = view.getUint32(20, false); // IHDR height
    return w > 0 && h > 0 ? { w, h } : null;
  } catch {
    return null;
  }
}

function jpegDimensions(buf: ArrayBuffer): { w: number; h: number } | null {
  const view = new DataView(buf);
  if (buf.byteLength < 4 || view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null;
  let i = 2;
  while (i + 4 < buf.byteLength) {
    if (view.getUint8(i) !== 0xff) return null;
    const marker = view.getUint8(i + 1);
    if (marker === 0x00) { i += 2; continue; } // fill byte
    // standalone markers (no payload): SOI/EOI/RSTn/TEM
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    // SOF markers carry the frame dimensions: 0xC0-0xCF except DHT(0xC4), JPG(0xC8), DAC(0xCC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (i + 9 < buf.byteLength) {
        const h = view.getUint16(i + 5, false);
        const w = view.getUint16(i + 7, false);
        if (w > 0 && h > 0) return { w, h };
      }
      return null;
    }
    // every other marker: skip by its 2-byte length
    if (i + 4 > buf.byteLength) return null;
    const len = view.getUint16(i + 2, false);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validator (logo-tailored — accepts favicons / apple-touch-icon / logo.svg)
// ---------------------------------------------------------------------------

function hostMatchesOfficial(host: string, officialDomains: string[]): boolean {
  const h = host.toLowerCase();
  return officialDomains.some((d) => h === d || h.endsWith(`.${d}`));
}

async function validateCandidate(c: Candidate, org: OrgDef): Promise<ValidationResult> {
  // Inline SVG: validate the markup directly (no fetch); provenance = source page.
  if (c.kind === 'inline-svg' && c.svg) {
    let srcHost = '';
    try {
      srcHost = new URL(c.sourceUrl).hostname.toLowerCase();
    } catch {
      return { valid: false, reason: 'inline-svg source URL is invalid' };
    }
    if (!hostMatchesOfficial(srcHost, org.officialDomains)) {
      return { valid: false, reason: `inline-svg provenance: ${srcHost} is not an official domain` };
    }
    const text = c.svg.trimStart();
    if (!text.startsWith('<svg')) return { valid: false, reason: 'inline-svg markup does not start with <svg' };
    if (text.length < MIN_BYTES) return { valid: false, reason: `inline-svg size ${text.length}B < ${MIN_BYTES}B minimum` };
    return { valid: true, contentType: 'image/svg+xml', text, format: 'svg' };
  }

  if (!c.url) return { valid: false, reason: 'candidate has no URL' };

  let parsed: URL;
  try {
    parsed = new URL(c.url);
  } catch {
    return { valid: false, reason: 'candidate URL is invalid' };
  }
  if (parsed.protocol !== 'https:') return { valid: false, reason: 'protocol is not HTTPS' };
  if (!hostMatchesOfficial(parsed.hostname, org.officialDomains)) {
    return { valid: false, reason: `provenance: ${parsed.hostname} is not an official domain` };
  }

  let res: Response;
  try {
    res = await fetch(c.url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, Accept: 'image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(IMG_TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch (e: unknown) {
    return { valid: false, reason: `fetch failed: ${errMsg(e)}` };
  }
  if (!res.ok) return { valid: false, reason: `HTTP ${res.status}` };

  const contentType = (res.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
  if (!contentType.startsWith('image/')) {
    return { valid: false, reason: `content-type '${contentType}' is not image/*` };
  }

  let buf: ArrayBuffer;
  try {
    buf = await res.arrayBuffer();
  } catch (e: unknown) {
    return { valid: false, reason: `body read failed: ${errMsg(e)}` };
  }
  if (buf.byteLength < MIN_BYTES) {
    return { valid: false, reason: `size ${buf.byteLength}B < ${MIN_BYTES}B minimum` };
  }

  // Inspect the actual bytes — reject HTML/JSON error pages or trackers served as 200.
  const format = detectImageFormat(buf, contentType);
  if (!format) return { valid: false, reason: 'bytes failed magic-byte/format check (not a real image)' };

  // og:image confirmation gate: only accept if it is logo-sized (not a social/hero card).
  if (c.kind === 'og-image') {
    let dims: { w: number; h: number } | null = null;
    if (format === 'png') dims = pngDimensions(buf);
    else if (format === 'jpeg') dims = jpegDimensions(buf);
    if (!dims) return { valid: false, reason: 'og:image could not be confirmed as a logo (no decodable dimensions)' };
    if (dims.w > OG_MAX_DIM || dims.h > OG_MAX_DIM) {
      return {
        valid: false,
        reason: `og:image ${dims.w}x${dims.h} exceeds ${OG_MAX_DIM}px (likely a social/hero image, not a logo)`,
      };
    }
  }

  const text = format === 'svg' ? new TextDecoder().decode(buf) : undefined;
  return { valid: true, contentType, bytes: format === 'svg' ? undefined : buf, text, format };
}

function extForFormat(format: ImageFormat): string {
  switch (format) {
    case 'svg':
      return 'svg';
    case 'png':
      return 'png';
    case 'jpeg':
      return 'jpg';
    case 'webp':
      return 'webp';
    case 'gif':
      return 'gif';
  }
}

// ---------------------------------------------------------------------------
// Per-org sync
// ---------------------------------------------------------------------------

async function syncOneOrg(
  org: OrgDef,
  ctx: { writeFiles: boolean; existing: ExistingRow | null; logosDir: string }
): Promise<OrgSyncResult> {
  const candidates = await discoverLogoCandidates(org);
  let lastReason =
    candidates.length === 0
      ? 'no candidates discovered (page fetch failed or no logo references found on the official site)'
      : '';

  for (const c of candidates) {
    const v = await validateCandidate(c, org);
    if (!v.valid) {
      lastReason = v.reason;
      continue;
    }

    // First valid candidate found.
    const ext = extForFormat(v.format);
    const fileName = `${org.slug}.${ext}`;
    const absPath = path.join(ctx.logosDir, fileName);
    let wrote = false;
    if (ctx.writeFiles) {
      try {
        await fs.mkdir(ctx.logosDir, { recursive: true });
        if (v.format === 'svg' && v.text !== undefined) await fs.writeFile(absPath, v.text, 'utf8');
        else if (v.bytes) await fs.writeFile(absPath, Buffer.from(v.bytes));
        wrote = true;
      } catch {
        // Read-only filesystem (e.g. Vercel runtime) — skip the write; the
        // committed asset remains the source of truth for image files.
        wrote = false;
      }
    }

    const sourceUrl = c.url || c.sourceUrl;

    if (wrote) {
      return {
        slug: org.slug,
        name: org.name,
        logo_url: `/logos/${fileName}`,
        logo_source_url: sourceUrl,
        logo_verified: true,
        fallbackReason: null,
        preserved: false,
        wroteFile: true,
        sourceKind: c.kind,
      };
    }

    // Write skipped (writeFiles=false or read-only FS): keep any existing
    // logo_url, record the verified source, and refresh updated_at via upsert.
    const existingLogoUrl = ctx.existing?.logo_url ?? null;
    return {
      slug: org.slug,
      name: org.name,
      logo_url: existingLogoUrl,
      logo_source_url: sourceUrl,
      logo_verified: true,
      fallbackReason: existingLogoUrl
        ? null
        : 'verified source found but file write skipped (read-only FS); logo_url stays null until a writable sync writes the file',
      preserved: Boolean(existingLogoUrl),
      wroteFile: false,
      sourceKind: c.kind,
    };
  }

  // No valid candidate. Preserve an existing verified asset instead of nulling it.
  if (ctx.existing && ctx.existing.logo_verified === true && ctx.existing.logo_url) {
    return {
      slug: org.slug,
      name: org.name,
      logo_url: ctx.existing.logo_url,
      logo_source_url: ctx.existing.logo_source_url ?? null,
      logo_verified: true,
      fallbackReason: `no valid new candidate; existing verified asset preserved (${ctx.existing.logo_source_url || ctx.existing.logo_url})`,
      preserved: true,
      wroteFile: false,
      sourceKind: null,
    };
  }

  return {
    slug: org.slug,
    name: org.name,
    logo_url: null,
    logo_source_url: null,
    logo_verified: false,
    fallbackReason: lastReason || 'no valid logo candidate found',
    preserved: false,
    wroteFile: false,
    sourceKind: null,
  };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(results: OrgSyncResult[]): void {
  const line = '-'.repeat(100);
  console.log('\n====================================================');
  console.log('DANCE ORG LOGO SYNC — SUMMARY');
  console.log('====================================================');
  console.log('Organization | Logo | Source | Verified | Fallback reason');
  console.log(line);
  for (const r of results) {
    const logo = r.logo_url ?? 'TEXT PILL';
    const src = r.logo_source_url ?? '-';
    const verified = r.logo_verified ? 'yes' : 'no';
    const reason = r.fallbackReason ?? (r.preserved ? 'preserved existing asset' : '-');
    console.log(`${r.name} | ${logo} | ${src} | ${verified} | ${reason}`);
  }
  console.log(line);
  console.log(
    `Verified + written: ${results.filter((r) => r.logo_verified && r.wroteFile).length} | ` +
      `Preserved: ${results.filter((r) => r.preserved).length} | ` +
      `Text-pill fallbacks (no logo_url): ${results.filter((r) => !r.logo_url).length}`
  );
  console.log('====================================================\n');
}

// ---------------------------------------------------------------------------
// Core (reusable by the cron route)
// ---------------------------------------------------------------------------

export async function runDanceLogoSync(opts?: { writeFiles?: boolean }): Promise<SyncReport> {
  const writeFiles = opts?.writeFiles ?? true;
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const logosDir = path.join(scriptDir, '..', 'public', 'logos');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasDb = Boolean(supabaseUrl && serviceKey);

  let supabase: SupabaseClient | null = null;
  if (hasDb) {
    supabase = createClient(supabaseUrl as string, serviceKey as string, {
      auth: { persistSession: false },
    });
  } else {
    console.error(
      '[dance-logos] DB upsert skipped: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in the environment. ' +
        'Credential values are intentionally not printed. Discovery/validation results below are still reported.'
    );
  }

  const results: OrgSyncResult[] = [];

  for (let i = 0; i < ORGS.length; i++) {
    const org = ORGS[i];
    const sort_order = i;

    let existing: ExistingRow | null = null;
    if (supabase) {
      const { data } = await supabase
        .from('dance_orgs')
        .select('*')
        .eq('slug', org.slug)
        .maybeSingle();
      existing = (data as ExistingRow | null) ?? null;
    }

    const result = await syncOneOrg(org, { writeFiles, existing, logosDir });
    results.push(result);

    if (supabase) {
      const { error } = await supabase.from('dance_orgs').upsert(
        {
          name: org.name,
          slug: org.slug,
          website_url: org.website_url,
          logo_url: result.logo_url,
          logo_source_url: result.logo_source_url,
          logo_verified: result.logo_verified,
          sort_order,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      );
      if (error) console.error(`[dance-logos] upsert failed for ${org.slug}: ${error.message}`);
    }
  }

  printSummary(results);

  const updated = results.filter((r) => r.logo_verified && r.wroteFile).length;
  const preserved = results.filter((r) => r.preserved).length;
  const fallbackCount = results.filter((r) => !r.logo_url).length;

  return {
    ok: hasDb,
    results,
    updated,
    preserved,
    fallbackCount,
    dbWriteSkipped: !hasDb,
  };
}

// ---------------------------------------------------------------------------
// CLI entry — guarded so importing this module from the cron route never
// auto-runs. Only `node ... scripts/sync-dance-logos.ts` triggers main().
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const report = await runDanceLogoSync({ writeFiles: true });
  if (report.dbWriteSkipped) {
    console.error(
      '\n[dance-logos] Exiting with status 1: DB write skipped (missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL). ' +
        'Discovery/validation results above remain valid; run again with credentials to persist verified logos.'
    );
    process.exit(1);
  }
  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/sync-dance-logos.ts')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
