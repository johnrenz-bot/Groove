/**
 * Follows up on the organisations whose ORIGINAL asset URL 404s but whose
 * sized variant resolves (WordPress serves -NNNxNNN crops). Also scans PFDS's
 * own site for a performance photograph, since its logo alone is a poor card
 * image for a performance-focused page.
 *
 * Run: node scripts/research-pa-followup.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'image', 'pa');
mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

// ROFG: the sized 180px apple-touch-icon resolved in the earlier probe.
const ROFG = 'https://rofg1972.com/wp-content/uploads/2021/03/cropped-fav-180x180.png';

try {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 25000);
  const r = await fetch(ROFG, { redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA } });
  clearTimeout(t);
  const buf = Buffer.from(await r.arrayBuffer());
  console.log(`ROFG  HTTP ${r.status}  ${buf.length}B  ${r.headers.get('content-type')}`);
  if (r.ok && buf.length > 500) {
    writeFileSync(join(outDir, 'rofg-mark.png'), buf);
    console.log('  saved public/image/pa/rofg-mark.png');
  }
} catch (e) {
  console.log(`ROFG  ERR ${e.cause?.code || e.message}`);
}

// PFDS: look for a real performance photograph on their own site.
try {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 25000);
  const r = await fetch('https://www.philippinefolkdancesociety.com/', {
    redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA },
  });
  clearTimeout(t);
  const html = await r.text();
  // Google Sites images live on lh3/lh7-us.googleusercontent.com
  const imgs = [...new Set([...html.matchAll(/https:\/\/lh\d-us\.googleusercontent\.com\/[^"')\s]+/g)].map((m) => m[0]))];
  console.log(`\nPFDS site images (${imgs.length}):`);
  imgs.slice(0, 15).forEach((u) => console.log('  ' + u.slice(0, 130)));
} catch (e) {
  console.log(`PFDS  ERR ${e.cause?.code || e.message}`);
}