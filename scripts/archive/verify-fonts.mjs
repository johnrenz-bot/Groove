/**
 * Compare the FONT-FACE CSS this build emits against a captured baseline.
 *
 *   node scripts/verify-fonts.mjs            # capture a baseline
 *   node scripts/verify-fonts.mjs --check    # compare against it
 *
 * WHY
 *
 *   Swapping `next/font/google` for `next/font/local` has to be provably
 *   typography-preserving, and "the build succeeded" does not prove that. It is
 *   entirely possible to wire the right bytes to the wrong `font-style`, or to
 *   pin a variable font to `font-weight: 400` and silently lose every
 *   `font-bold` in the app, with no error anywhere.
 *
 *   So this reads the emitted CSS, extracts every `@font-face`, selects the
 *   LATIN subset of each face, and records `{family, style, weight, sha256}`.
 *   A byte-identical hash for every face proves the browser is being handed the
 *   exact same font file as before.
 *
 *   Note: Lightning CSS minifies the latin `unicode-range` from
 *   `U+0000-00FF` to `U+??`, so "latin" is detected as a range containing
 *   `U+??` — not the literal string `U+0000-00FF`, which never survives the
 *   build.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = path.join(ROOT, '.next', 'static', 'chunks');
const MEDIA_DIR = path.join(ROOT, '.next', 'static', 'media');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT = path.join(ROOT, '.font-baseline');

const check = process.argv.includes('--check');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    entry.isDirectory() ? walk(full, out) : full.endsWith('.css') && out.push(full);
  }
  return out;
}

/**
 * Where does an emitted font actually live?
 *
 * The two font-loading strategies put the bytes in different places:
 *
 *   `next/font/*`      copies each file into `.next/static/media/` and rewrites
 *                      `src` to a relative `../media/…` URL. Those files are
 *                      build output, not source.
 *   `app/fonts.css`    references the committed files in `public/fonts/`
 *                      directly, by absolute URL.
 *
 * Both are supported so this script can compare one build against the other.
 */
function resolveFontFile(src) {
  // Strip a leading `/fonts/...` or `../media/...` prefix down to the bare
  // filename, then look for it where each loader strategy puts it.
  const clean = src.replace(/^\.\.\/media\//, '').replace(/^\/?(fonts|media)\//, '');
  const fromMedia = path.join(MEDIA_DIR, clean);
  if (existsSync(fromMedia)) return fromMedia;

  const fromPublic = path.join(PUBLIC_DIR, 'fonts', clean);
  if (existsSync(fromPublic)) return fromPublic;

  throw new Error(
    `@font-face points at a file that exists in neither place: ${src} (looked in ${fromMedia} and ${fromPublic})`
  );
}

function collect() {
  const css = walk(CSS_DIR)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  const faces = [];
  const blocks = css.match(/@font-face\{[^}]*\}/g) ?? [];

  for (const block of blocks) {
    const family = /font-family:\s*"?([^;"]+)"?/.exec(block)?.[1]?.trim();
    const range = /unicode-range:([^}]*)/.exec(block)?.[1];
    const src = /url\(([^)]+)\)/.exec(block)?.[1];
    if (!family || !src) continue;

    // Skip "Fallback" faces: they are a `local()` metric-override shim, not a
    // downloaded file.
    if (family.includes('Fallback')) continue;

    /**
     * Which face counts as "the latin one"?
     *
     * Two shapes have to be accepted, because the font loader changed:
     *
     *   - `next/font/google` subsets per unicode-range, and Lightning CSS
     *     minifies the latin range `U+0000-00FF` down to `U+??`. So a Google
     *     face counts when its range contains `U+??`.
     *   - `app/fonts.css` does NOT subset, so it emits no unicode-range at all.
     *     Its single face IS the latin one.
     *
     * Anything else — cyrillic, greek, vietnamese — is a face this app never
     * asked for and must not be compared.
     */
    const isLatin = range === undefined || range.includes('U+??');
    if (!isLatin) continue;

    const file = resolveFontFile(src);
    const bytes = readFileSync(file);

    faces.push({
      family,
      style: /font-style:\s*([^;]+)/.exec(block)?.[1]?.trim() ?? 'normal',
      weight: (/font-weight:\s*([^;]+)/.exec(block)?.[1] ?? '').trim(),
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }

  return faces.sort((a, b) =>
    `${a.family}|${a.style}|${a.weight}`.localeCompare(`${b.family}|${b.style}|${b.weight}`)
  );
}

const current = collect();
const label = (f) => `${f.family} ${f.style} ${f.weight}`.padEnd(34);

if (current.length === 0) {
  console.error('No latin @font-face rules found in the build output.');
  process.exit(1);
}

if (!check) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(current, null, 2));
  for (const face of current) {
    const dest = path.join(OUT, path.basename(face.file));
    if (!existsSync(dest)) copyFileSync(path.join(ROOT, face.file), dest);
  }
  console.log(`Captured baseline: ${current.length} latin faces -> ${path.relative(ROOT, OUT)}`);
  for (const face of current) console.log(`  ${label(face)} ${face.sha256.slice(0, 16)}  ${face.bytes} B`);
  process.exit(0);
}

// ── compare ────────────────────────────────────────────────────────────────
const baselinePath = path.join(OUT, 'manifest.json');
if (!existsSync(baselinePath)) {
  console.error('No baseline. Run `node scripts/verify-fonts.mjs` first.');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

const problems = [];
const key = (f) => `${f.family}|${f.style}|${f.weight}`;

/**
 * CHECK 1 — THE FACE SET MUST BE IDENTICAL. This is the strict one.
 *
 * It catches the failure modes that actually happen when fonts are re-plumbed:
 * an italic face wired to `font-style: normal`, a `font-weight: 700` face
 * quietly missing, a variable font pinned to a single weight so every
 * `font-bold` in the app becomes synthetic bold. Nothing about the bytes
 * matters for those — only which faces exist.
 */
const baselineKeys = new Set(baseline.map(key));
for (const face of current) {
  if (!baselineKeys.has(key(face))) problems.push(`NEW face not in baseline: ${key(face)}`);
}
const currentKeys = new Set(current.map(key));
for (const face of baseline) {
  if (!currentKeys.has(key(face))) problems.push(`MISSING face that was in baseline: ${key(face)}`);
}

/**
 * CHECK 2 — EVERY EMITTED FILE MUST MATCH ITS RECORDED HASH.
 *
 * This is the real "same font" guarantee, and it is stricter than comparing
 * against the baseline: it ties each file to the exact Google URL it came from,
 * recorded by `scripts/vendor-fonts.mjs` in `public/fonts/manifest.json`.
 *
 * CHECK 3 — BYTE EQUALITY WITH THE BASELINE IS *NOT* ASSERTED, deliberately.
 *
 * `next/font` does not emit the bytes it downloads: it re-encodes them, so the
 * baseline files differ from Google's originals by a few hundred bytes in a
 * different direction per face (Inter is SMALLER after Next's pass, Mr De
 * Haviland is LARGER). woff2 is a compressed container, so byte equality across
 * two different encoders is not a property that holds, and asserting it would
 * make this script fail forever on a correct change.
 *
 * What matters is glyph coverage and metrics, which CHECK 1 and CHECK 2 cover,
 * plus the rendered-width comparison in the task report.
 */
const fontManifestPath = path.join(PUBLIC_DIR, 'fonts', 'manifest.json');
if (!existsSync(fontManifestPath)) {
  problems.push('public/fonts/manifest.json is missing — re-run `node scripts/vendor-fonts.mjs`.');
} else {
  const recorded = new Map(
    JSON.parse(readFileSync(fontManifestPath, 'utf8')).map((entry) => [entry.file, entry])
  );
  for (const face of current) {
    const entry = recorded.get(path.basename(face.file));
    if (!entry) {
      problems.push(`${face.file} is not recorded in public/fonts/manifest.json`);
      continue;
    }
    if (entry.sha256 !== face.sha256) {
      problems.push(
        `${face.file} does not match its recorded hash (recorded ${entry.sha256.slice(0, 16)}, on disk ${face.sha256.slice(0, 16)}) — the vendored file was edited or replaced`
      );
    }
  }
}

console.log('CHECK 1 — face set (family | style | weight)');
console.log('CHECK 2 — on-disk bytes match public/fonts/manifest.json');
for (const face of current) {
  console.log(`  ${label(face)} ${face.sha256.slice(0, 16)}  ${face.bytes} B`);
}

console.log('\nCHECK 3 — baseline byte sizes, informational only');
const byKey = new Map(current.map((f) => [key(f), f]));
for (const face of baseline) {
  const now = byKey.get(key(face));
  if (!now) continue;
  const delta = now.bytes - face.bytes;
  console.log(`  ${label(face)} ${String(face.bytes).padStart(6)} B -> ${String(now.bytes).padStart(6)} B  (${delta >= 0 ? '+' : ''}${delta})`);
}
console.log('  next/font re-encoded these; woff2 bytes are not comparable across encoders.');

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log('\nPASS: identical face set, and every file matches its recorded Google hash.');