/**
 * Downloads candidate brand images into public/image/pa/ so they can be
 * inspected and committed alongside the code. Only images the organisation
 * itself publishes for third-party use (its own logo / og:image) are fetched.
 *
 * Run: node scripts/fetch-pa-images.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'image', 'pa');
mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

/** slug -> { url, ext, note } — every URL is published by the named org. */
const CANDIDATES = {
  'peta-mark': {
    url: 'https://petatheater.com/wp-content/uploads/2025/10/cropped-petafavicon2.webp',
    ext: 'webp',
  },
  'ballet-philippines-mark': {
    url: 'https://www.ballet.ph/wp-content/uploads/2026/06/cropped-57-logo-png.png',
    ext: 'png',
  },
  'ballet-philippines-cover': {
    url: 'https://www.ballet.ph/wp-content/uploads/2024/04/WebCover-53-1024x461-1.jpg',
    ext: 'jpg',
  },
  'rofg-mark': {
    url: 'https://rofg1972.com/wp-content/uploads/2021/03/cropped-fav.png',
    ext: 'png',
  },
  'pfds-mark': {
    url: 'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72sO_6J8wyR6-ie8IoyXSd3TXppNjuo8nMxrACEmarsL6i0-6gedbY30FMoZs3vv77ywUEmfwXNa-bffcqjouCKPnuwbloeaT3GAoNe-kkwlhAMNrWlV_L6_gYZ2EYKpO_MkmK7_7MyLvI4HJb1g14MnHcG964M5-HJQUvYaWnAwkSFlLWIxiPziEYv_=w16383',
    ext: 'jpg',
  },
};

for (const [slug, { url, ext }] of Object.entries(CANDIDATES)) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 30000);
    const r = await fetch(url, { redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA } });
    clearTimeout(t);
    if (!r.ok) { console.log(`  ${r.status}  ${slug}`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 500) { console.log(`  too small (${buf.length}B)  ${slug}`); continue; }
    const dest = join(outDir, `${slug}.${ext}`);
    writeFileSync(dest, buf);
    console.log(`  OK ${String(buf.length).padStart(7)}B  public/image/pa/${slug}.${ext}`);
  } catch (e) {
    console.log(`  ERR ${slug} — ${e.cause?.code || e.message}`);
  }
}