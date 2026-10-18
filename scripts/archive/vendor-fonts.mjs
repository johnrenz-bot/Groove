/**
 * Vendor the Google Fonts the app uses, so `next/font/local` can serve them.
 *
 * WHY THIS EXISTS
 *
 *   `app/layout.tsx` used `next/font/google`. On Vercel that import is resolved
 *   by Vercel's Turbopack through its own package,
 *   `@vercel/turbopack-next/internal/font/google/font`, and that resolution fails:
 *
 *     Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
 *
 *   Nothing in this repository or in the `next` package references
 *   `@vercel/turbopack-next` — that specifier only exists inside Vercel's build
 *   image — so there is nothing here to patch. What the repository CAN control
 *   is whether it reaches that code path at all. `next/font/local` reads files
 *   from disk and emits its own `@font-face`; it never touches the Google Fonts
 *   loader module, never resolves `@vercel/turbopack-next`, and never needs
 *   network access at build time. See `app/layout.tsx`.
 *
 * WHAT IT DOES
 *
 *   Downloads exactly the faces `app/layout.tsx` declares, as woff2, latin
 *   subset, and writes them to `public/fonts/` with deterministic names so
 *   re-running it produces no diff. `app/fonts.css` declares the matching
 *   `@font-face` rules and `app/layout.tsx` preloads them.
 *
 *   They are plain `@font-face` rules rather than `next/font/local` because
 *   `next/font/local` fails on Vercel too, for the same underlying reason:
 *
 *     Module not found: Can't resolve '@vercel/turbopack-next/internal/font/local/cssmodule.module.css'
 *
 *   See the long note at the top of `app/fonts.css`.
 *
 *   The request URLs mirror `getGoogleFontsUrl()` +
 *   `getFontAxes()` in `next/dist/compiled/@next/font/dist/google/`, because the
 *   *response* determines what ships:
 *
 *     - `Inter` declares NO weight, so `next/font/google` treated it as variable
 *       and requested `wght@100..900`; Google then serves one variable file
 *       described as `font-weight: 100 900`. Requesting `wght@400` instead
 *       returns a DIFFERENT, smaller file that cannot render `font-bold` /
 *       `font-semibold` — a silent typographic regression across the whole app.
 *     - `Source Serif 4` declares three weights, so it was requested
 *       discretely. Google backs 400, 600 and 700 with the SAME variable file
 *       per style, so those three faces deduplicate to two files here.
 *
 *   Every downloaded face is checked against the weight/style this file
 *   expects, and the script fails loudly on a mismatch. Getting that wrong is
 *   not a build error — it is the right bytes wired to the wrong font-style,
 *   which looks like a font bug nobody can find.
 *
 * USAGE
 *
 *   node scripts/vendor-fonts.mjs
 *
 *   Output is committed. Build machines do NOT need network access.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/**
 * `public/fonts/` rather than a private directory, because `app/fonts.css`
 * references these by URL and `public/` is the one place Next serves as-is.
 */
const OUT_DIR = path.join(ROOT, 'public', 'fonts');

/**
 * A modern browser UA is what makes the Google CSS API serve woff2 rather than
 * legacy truetype — the same format `next/font/google` was downloading.
 */
const MODERN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * One entry per family. `css` is what Next would put in the URL; `expect` lists
 * the latin faces that MUST come back, as `{ style, weight, file }` where
 * `weight` is the descriptor Next would end up emitting in `@font-face`.
 *
 * `file` may repeat. Google backs Source Serif 4's 400, 600 and 700 with ONE
 * variable file per style, so all three descriptors resolve to the same bytes;
 * listing them separately keeps the emitted `@font-face` set identical in shape
 * to what `next/font/google` produces today, while the download happens once.
 */
const FAMILIES = [
  {
    // No `weight` in app/layout.tsx => variable => `wght@100..900`, so Google
    // describes the latin face as the whole 100-900 range.
    css: 'Inter:wght@100..900',
    expect: [{ style: 'normal', weight: '100 900', file: 'inter-variable-100-900.woff2' }],
  },
  {
    css: 'Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700',
    expect: [
      { style: 'normal', weight: '400', file: 'source-serif-4-normal-400-700.woff2' },
      { style: 'normal', weight: '600', file: 'source-serif-4-normal-400-700.woff2' },
      { style: 'normal', weight: '700', file: 'source-serif-4-normal-400-700.woff2' },
      { style: 'italic', weight: '400', file: 'source-serif-4-italic-400-700.woff2' },
      { style: 'italic', weight: '600', file: 'source-serif-4-italic-400-700.woff2' },
      { style: 'italic', weight: '700', file: 'source-serif-4-italic-400-700.woff2' },
    ],
  },
  {
    css: 'Mr+De+Haviland:wght@400',
    expect: [{ style: 'normal', weight: '400', file: 'mr-de-haviland-400.woff2' }],
  },
];

/**
 * Split the stylesheet into `/* label *\/`-tagged blocks.
 *
 * Google emits one `@font-face` per unicode-range and labels each with a
 * comment. `subsets: ['latin']` in `app/layout.tsx` keeps only the `latin`
 * block, so this must too — vendoring every range would ship several times the
 * bytes for subsets the app never requested.
 */
function parseLatinFaces(css) {
  const faces = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/gi;
  let match;
  while ((match = re.exec(css)) !== null) {
    const [, subset, body] = match;
    if (subset !== 'latin') continue;
    const url = /src:\s*url\(([^)]+)\)/i.exec(body)?.[1];
    const style = /font-style:\s*([a-z]+)/i.exec(body)?.[1];
    const weight = /font-weight:\s*([0-9][0-9\s]*[0-9])/i.exec(body)?.[1]?.trim();
    if (url) faces.push({ url, style, weight });
  }
  return faces;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Several descriptors can resolve to one file (Source Serif 4's three weights
  // are one variable font per style). Download each distinct file once.
  const done = new Set();
  /** The provenance record, consumed by `scripts/verify-fonts.mjs`. */
  const manifest = [];
  let written = 0;

  for (const family of FAMILIES) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.css}&display=swap`;
    const res = await fetch(cssUrl, { headers: { 'User-Agent': MODERN_UA } });
    if (!res.ok) throw new Error(`GET ${cssUrl} -> ${res.status}`);
    const faces = parseLatinFaces(await res.text());

    for (const spec of family.expect) {
      // Match on (style, weight) taken from Google's OWN response, never on
      // position. Google orders faces however it likes — for Source Serif 4 with
      // both styles it returns italic before normal — so an index-based mapping
      // writes every italic file under a `-normal-` name and nothing complains.
      const face = faces.find((f) => f.style === spec.style && f.weight === spec.weight);

      if (!face) {
        const seen = faces.map((f) => `${f.style}/${f.weight}`).join(', ') || 'none';
        throw new Error(
          `${family.css}: expected a latin face for ${spec.style}/${spec.weight}, Google returned [${seen}]`
        );
      }

      if (done.has(spec.file)) continue;
      done.add(spec.file);

      const fileRes = await fetch(face.url, { headers: { 'User-Agent': MODERN_UA } });
      if (!fileRes.ok) throw new Error(`GET ${face.url} -> ${fileRes.status}`);

      const buffer = Buffer.from(await fileRes.arrayBuffer());
      // A woff2 file starts with the signature "wOF2"; anything else is an
      // error page that happened to arrive with a 200.
      if (buffer.subarray(0, 4).toString('latin1') !== 'wOF2') {
        throw new Error(`${spec.file}: response is not a woff2 file`);
      }

      await writeFile(path.join(OUT_DIR, spec.file), buffer);
      manifest.push({
        file: spec.file,
        // Where these bytes came from, so the file can be traced back to the
        // exact face Google served rather than to "a font we had lying around".
        source: face.url,
        family: family.css.split(':')[0].replace(/\+/g, ' '),
        style: spec.style,
        weight: spec.weight,
        bytes: buffer.length,
        sha256: createHash('sha256').update(buffer).digest('hex'),
      });
      console.log(`${spec.file.padEnd(38)} ${(buffer.length / 1024).toFixed(1).padStart(6)} KB`);
      written += 1;
    }

    // Every face Google returned for a declared weight must be covered by an
    // expectation above, otherwise a new weight would silently not be vendored.
    const covered = new Set(family.expect.map((e) => `${e.style}/${e.weight}`));
    for (const face of faces) {
      const key = `${face.style}/${face.weight}`;
      if (!covered.has(key)) {
        throw new Error(
          `${family.css}: Google returned latin ${key}, which scripts/vendor-fonts.mjs does not vendor`
        );
      }
    }
  }

  await writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`\nVendored ${written} font files into ${path.relative(ROOT, OUT_DIR)}/`);
  console.log('Wrote manifest.json — `node scripts/verify-fonts.mjs --check` asserts these hashes.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});