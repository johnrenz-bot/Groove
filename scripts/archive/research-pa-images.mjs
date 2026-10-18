/**
 * Research helper: query Wikimedia Commons for freely-licensed photographs of
 * each subject, printing licence + author so a human/agent can choose
 * deliberately. Nothing is downloaded by this script — it only reports.
 *
 * Run: node scripts/research-pa-images.mjs "<search terms>"
 */
const terms = process.argv.slice(2);
if (terms.length === 0) {
  console.error('usage: node scripts/research-pa-images.mjs "<terms>" [...]');
  process.exit(1);
}

const UA = 'GroovePerformingArtsHub/1.0 (image research; contact: site admin)';

const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

for (const term of terms) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
    `&gsrsearch=${encodeURIComponent(term)}` +
    '&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1600&format=json';

  process.stdout.write(`\n=== ${term} ===\n`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.log(`  HTTP ${res.status}`); continue; }
    const j = await res.json();
    const pages = Object.values(j.query?.pages || {});
    if (!pages.length) { console.log('  (no results)'); continue; }

    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata || {};
      const lic = strip(m.LicenseShortName?.value) || '?';
      const author = strip(m.Artist?.value).slice(0, 60) || '?';
      const w = ii.width, h = ii.height;
      // Only JPEGs that are big enough to crop to 16:9 without upscaling.
      if (!/\.(jpe?g|png)$/i.test(p.title)) continue;
      if (w < 1200) continue;
      console.log(`  ${p.title.replace(/^File:/, '')}`);
      console.log(`     ${lic} | ${author} | ${w}x${h}`);
      console.log(`     ${ii.url}`);
    }
  } catch (e) {
    console.log(`  ERR ${e.message}`);
  }
}