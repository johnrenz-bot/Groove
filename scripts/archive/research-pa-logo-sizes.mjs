/**
 * Reports every plausible full-size brand/logo image URL inside each site's own
 * HTML, along with the pixel size WordPress publishes alongside it. Favicons
 * (32px) are too small to use; these are the -300x / -512x / full originals.
 *
 * Run: node scripts/research-pa-logo-sizes.mjs
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const sites = [
  ['PETA', 'https://petatheater.com/'],
  ['Ballet Philippines', 'https://www.ballet.ph/'],
  ['ROFG', 'https://rofg1972.com/'],
  ['PFDS', 'https://www.philippinefolkdancesociety.com/'],
];

for (const [name, url] of sites) {
  process.stdout.write(`\n=== ${name} ===\n`);
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 30000);
    const r = await fetch(url, { redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA } });
    clearTimeout(t);
    const html = await r.text();

    // WordPress emits <link rel="icon" sizes="32x32" href="...-32x32.png">.
    // Collect every (href, sizes) pair, keeping only the largest declared size.
    const best = new Map();
    const re = /<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi;
    for (const tag of html.matchAll(re)) {
      const href = (tag[0].match(/href=["']([^"']+)/i) || [])[1];
      const sizes = parseInt((tag[0].match(/sizes=["'](\d+)x/i) || [])[1] || '0', 10);
      if (!href) continue;
      const prev = best.get(href) || 0;
      if (sizes > prev) best.set(href, sizes);
    }

    // Also grab the og:image if any (already a full-size asset).
    const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1];

    // Derive the un-suffixed original from a "-NNNxNNN" WordPress thumbnail.
    const originals = new Set();
    for (const href of best.keys()) {
      const orig = href.replace(/-\d+x\d+(?=\.\w+$)/, '');
      const size = best.get(href);
      originals.add(`${size}px  ${orig}`);
    }
    if (og) originals.add(`og      ${og}`);

    [...originals].sort().forEach((l) => console.log('  ' + l));
    if (!originals.size) console.log('  (none)');
  } catch (e) {
    console.log(`  ERR ${e.cause?.code || e.message}`);
  }
}