/**
 * Downloads the CCP Digital Archives production images that correspond to a
 * specific resident company or subject, into public/image/pa/.
 *
 * All are published by the Cultural Center of the Philippines itself, on its
 * own digital-archives host, and are credited back to the CCP on the page.
 *
 * Run: node scripts/fetch-ccp-images.mjs
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

/** slug -> { remote, ext } */
const WANTED = {
  'ccp-tanghalang-pilipino': {
    remote: `${B}/banner-images/Banner-Tanghalang Pilipino - Mabining Mandirigma.jpeg`,
    ext: 'jpg',
  },
  'ccp-ballet-philippines-paglalakbay': {
    remote: `${B}/banner-images/Banner-Paglalakbay The Journey of the Sea People by Ballet Philippines 2.jpeg`,
    ext: 'jpg',
  },
  'ccp-philippine-philharmonic': {
    remote: `${B}/banner-images/Banner-Philippine Philharmonic Orchestra 41st Concert Season Concert VIII Coda 2.jpeg`,
    ext: 'jpg',
  },
  'ccp-vlf-hubot-hubad': {
    remote: `${B}/banner-images/Banner-05-19-2026 VLF XXI - Hubo't Hubad 4.jpeg`,
    ext: 'jpg',
  },
  'ccp-eastern-chamber-singers': {
    remote: `${B}/entity-images/Ent-02-01-2026 Eastern Chamber Singers [ADARNA]1.png`,
    ext: 'png',
  },
  'ccp-manila-sounds': {
    remote: `${B}/collection-images/Col-Manila Sounds Saliw ng Himig ng Maynila.jpg`,
    ext: 'jpg',
  },
  'ccp-intramuros-evenings': {
    remote: `${B}/entity-images/Ent-12-13-2025 Intramuros Evenings - Christmas Harmonies 2.jpeg`,
    ext: 'jpg',
  },
  'ccp-vamos-a-belen': {
    remote: `${B}/entity-images/Ent-12-20-2025 Vamos A Belen 5.jpeg`,
    ext: 'jpg',
  },
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
    console.log(`  OK ${String(buf.length).padStart(8)}B  public/image/pa/${slug}.${ext}`);
  } catch (e) {
    console.log(`  ERR ${slug} ${e.cause?.code || e.message}`);
  }
}