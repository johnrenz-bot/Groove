/**
 * Downloads a handful of PFDS site images so they can be eyeballed. PFDS's logo
 * alone is a poor card image on a performance page, so we look for a photograph
 * of dancers on their own site.
 *
 * Run: node scripts/fetch-pfds-candidates.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'image', 'pa', '_candidates');
mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const BASE =
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72s';

// Exact image URLs as they appear in the page (the Google Sites token is opaque
// and a `=w1200` suffix on a truncated id returns 400, so the full URL is used).
const URLS = [
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72sOgJ2LgwF6vTB8BNPsVI7Q3ENQAYwBdwiz0OZw8xMXuI1eJcsd2_hNuvzjjRH_eCO-HZs0',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72uRhfjJZYuLpIAQqZcWX4rw_9gPnnwgljfpAM_i11eaJ4qSCktjmp7E2sbAro3C0M6Z_1KJ',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72vM1cEvcVRktOzeoZWIjYQEqVh4p3hFKaspwTk-oVpu-W19cTu5C3E8DNt_bdbiAUJFtrea',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72txaCY_4RszVfiH05O_LRRMSC4CZN9wdYMP_8Z8sKXccb_uWdSdVNlqb0N-jq7kFV6wt-Cn',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72theAYOjiAYFnAT08nI1Ay21GCjahlwLOc7BHaAm0U1cJhTlBl0r8IpElzoxRLZNgkg4ZLK',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72vG1qD8-OwvyVBbrTRaiRaVBrkvvyb9ftPmUsFdple_ZniBklBfRrdi5cZlopMyf0p-P0MP',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72v-NSJxrxh0ElVv3q3C5JnJvIw96lSmOnxq3k5bC7CxlKlIKcbY8GKttq4wnF3icNb8q5zz',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72uG6vGyAMIzkcSmPWIqAJ4YPuhDpW8x8pmJ15ml4nKclP2J36j17wDIP8HJxp9wLkgJy0PL',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72sgO5Ay7VMKfptQJyDlTJ0gr-m4yGxYvBXRElk0a6atwfsNFykMIIBWp80A8qoHZhpKbWz9',
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72vUZ4urKxjeUlRhquk7glV_jwgYJsTtGZgGcKxQ4vqw2FtugyFlVIL_Tm5472m3J7AwlGRj',
  // The og:image already captured successfully — included for comparison.
  'https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72sO_6J8wyR6-ie8IoyXSd3TXppNjuo8nMxrACEmarsL6i0-6gedbY30FMoZs3vv77ywUEmfwXNa-bffcqjouCKPnuwbloeaT3GAoNe-kkwlhAMNrWlV_L6_gYZ2EYKpO_MkmK7_7MyLvI4HJb1g14MnHcG964M5-HJQUvYaWnAwkSFlLWIxiPziEYv_=w16383',
];

let i = 0;
for (const url of URLS) {
  i += 1;
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 25000);
    const r = await fetch(url, { redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA } });
    clearTimeout(t);
    if (!r.ok) { console.log(`  ${r.status} cand-${i}`); continue; }
    const type = r.headers.get('content-type') || '';
    const ext = type.includes('png') ? 'png' : 'jpg';
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2000) { console.log(`  tiny (${buf.length}B) cand-${i}`); continue; }
    writeFileSync(join(outDir, `cand-${i}.${ext}`), buf);
    console.log(`  OK ${String(buf.length).padStart(8)}B  cand-${i}.${ext}  (${type})`);
  } catch (e) {
    console.log(`  ERR cand-${i} ${e.cause?.code || e.message}`);
  }
}