/**
 * Reads each organization's own public website and reports what branding assets
 * IT publishes (og:image, logo, favicon). These are the authoritative images for
 * that organization — unlike a stock photo or a search result, they come from
 * the subject itself.
 *
 * Nothing is downloaded here. This only reports candidates for review.
 *
 * Run: node scripts/research-pa-branding.mjs
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const sites = [
  ['PETA Theater', 'https://petatheater.com/'],
  ['Ballet Philippines', 'https://www.ballet.ph/'],
  ['Ramon Obusan Folkloric Group', 'https://rofg1972.com/'],
  ['Philippine Folk Dance Society', 'https://www.philippinefolkdancesociety.com/'],
  ['National Museum of the Philippines', 'https://www.nationalmuseum.gov.ph/'],
  ['National Commission for Culture and the Arts', 'https://www.ncca.gov.ph/'],
  ['Philippine Information Agency', 'https://www.pia.gov.ph/'],
];

for (const [name, url] of sites) {
  process.stdout.write(`\n=== ${name} (${url}) ===\n`);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    clearTimeout(timer);
    const html = await res.text();
    console.log(`  HTTP ${res.status}  (${html.length} bytes)`);

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch) console.log(`  og:image : ${ogMatch[1].slice(0, 140)}`);

    const logoMatch =
      html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)/i) ||
      html.match(/<meta[^>]+property=["']og:logo["'][^>]+content=["']([^"']+)/i);
    if (logoMatch) console.log(`  logo/icon: ${logoMatch[1].slice(0, 140)}`);

    // WordPress sites expose a site icon we can request directly.
    const m = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)/i);
    if (m) console.log(`  apple    : ${m[1].slice(0, 140)}`);

    if (!ogMatch && !logoMatch) console.log('  (no og:image or icon published)');
  } catch (e) {
    console.log(`  ERR ${e.cause?.code || e.message}`);
  }
}