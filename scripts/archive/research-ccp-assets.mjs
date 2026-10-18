/**
 * Probes the CCP subdomains (which answered earlier when the apex timed out) for
 * published og:image assets. Those are CCP's own images and are the most likely
 * place to obtain an authentic, correctly-licensed photograph of its buildings,
 * resident companies and productions.
 *
 * Run: node scripts/research-ccp-assets.mjs
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const urls = [
  'https://digitalarchives.culturalcenter.gov.ph/',
  'https://artseducation.culturalcenter.gov.ph/ccpdirectory',
];

for (const u of urls) {
  process.stdout.write(`\n=== ${u} ===\n`);
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 30000);
    const r = await fetch(u, { redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA } });
    clearTimeout(t);
    console.log(`  HTTP ${r.status}`);
    if (!r.ok) continue;
    const b = await r.text();

    const og =
      (b.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1];
    console.log(`  og:image: ${og || '(none)'}`);

    // Collect distinct image sources for review.
    const imgs = [...new Set([...b.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))];
    console.log(`  <img> sources: ${imgs.length}`);
    imgs.slice(0, 12).forEach((i) => console.log('    ' + i.slice(0, 130)));
  } catch (e) {
    console.log(`  ERR ${e.cause?.code || e.message}`);
  }
}