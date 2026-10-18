/**
 * Fetches additional Cultural Center production images so that no two cards in
 * the hub have to share a photograph. Same provenance as fetch-ccp-images.mjs:
 * published by the CCP on its own Digital Archives host.
 *
 * Run: node scripts/fetch-ccp-images-extra.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'image', 'pa');
mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const B = 'https://digitalarchives.culturalcenter.gov.ph/storage';

const WANTED = {
  'ccp-ppo-opera': {
    remote: `${B}/entity-images/Ent-03-13-2026 Philippine Philharmonic Orchestra Versatile – Concert VII Opera 2.jpeg`,
    ext: 'jpg',
  },
  'ccp-ppo-concert-vi': {
    remote: `${B}/entity-images/Ent-02-13-2026 PPO Concert VI (Samsung Theater)4.jpeg`,
    ext: 'jpg',
  },
  'ccp-ppo-preludi': {
    remote: `${B}/entity-images/Ent-01-16-2026 PPO 41 Versatile [Concert V – Preludi]5.png`,
    ext: 'png',
  },
  'ccp-vamos-a-belen-alt': {
    remote: `${B}/entity-images/Ent-12-19-2025 Vamos A Belen 1.jpeg`,
    ext: 'jpg',
  },
  'ccp-banner-main': { remote: `${B}/banner-images/Banner-0.png`, ext: 'png' },
  'ccp-collection-himig': { remote: `${B}/collection-images/Col-himig-himbing.jpg`, ext: 'jpg' },
};

for (const [slug, { remote, ext }] of Object.entries(WANTED)) {
  const url = encodeURI(remote);
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 30000);
    const r = await fetch(url, { redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA } });
    clearTimeout(t);
    if (!r.ok) { console.log(`  ${r.status}  ${slug}`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 5000) { console.log(`  too small (${buf.length}B)  ${slug}`); continue; }
    writeFileSync(join(outDir, `${slug}.${ext}`), buf);
    console.log(`  OK ${String(buf.length).padStart(8)}B  ${slug}.${ext}`);
  } catch (e) {
    console.log(`  ERR ${slug} ${e.cause?.code || e.message}`);
  }
}