/**
 * Harvests full image URLs from the CCP Digital Archives home page, decoding the
 * HTML entities that truncate the `src` attributes. These are the Cultural
 * Center's own published production images — the most authentic source
 * available for its resident companies.
 *
 * Run: node scripts/research-ccp-harvest.mjs
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const decode = (s) =>
  s
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const c = new AbortController();
const t = setTimeout(() => c.abort(), 30000);
const r = await fetch('https://digitalarchives.culturalcenter.gov.ph/', {
  redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA },
});
clearTimeout(t);
const html = await r.text();

const seen = new Map();
for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
  const url = decode(m[1]);
  if (url.endsWith('.png') && url.includes('/img/')) continue; // site chrome
  const name = url.split('/').pop();
  if (!/\.(jpe?g|png)$/i.test(name)) continue;
  seen.set(name, url);
}

console.log(`Found ${seen.size} CCP production images:\n`);
[...seen.entries()].forEach(([name, url]) => {
  console.log(`  ${name}`);
  console.log(`    ${url}`);
});