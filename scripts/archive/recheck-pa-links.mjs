/**
 * Re-checks the links that verify-performing-arts-links.mjs could not resolve.
 *
 * Those failures split into three groups, and only one of them means a broken
 * link:
 *
 *   - 403 Forbidden — Cloudflare / bot protection rejecting the script's
 *     user-agent. The URL may well be fine.
 *   - 502 Bad Gateway / timeout — the origin is down or refusing this client.
 *   - certificate errors — local trust store, not a site fault.
 *
 * This script retries with a browser user-agent and reports what actually
 * happens, so the distinction is recorded rather than guessed.
 *
 * Run: node scripts/recheck-pa-links.mjs
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const TARGETS = [
  // Previously 403 (bot protection) — retry as a browser.
  ['NCCA apex', 'https://www.ncca.gov.ph/'],
  ['NCCA national artists', 'https://www.ncca.gov.ph/about-culture-and-arts/culture-profile/national-artists-of-the-philippines/'],
  ['NCCA dance research', 'https://www.ncca.gov.ph/about-ncca-3/subcommissions/subcommission-on-the-arts-sca/dance/philippine-dance-research-and-documentation/'],
  ['NCCA mandates', 'https://www.ncca.gov.ph/transparency/agency-mandates-and-functions/'],
  ['PIA apex', 'https://www.pia.gov.ph/'],
  // Previously 502 — check whether the outage is site-wide.
  ['National Museum apex', 'https://www.nationalmuseum.gov.ph/'],
  ['National Museum anthropology', 'https://www.nationalmuseum.gov.ph/our-museums/national-museum-of-anthropology/'],
  ['National Museum ethnology', 'https://www.nationalmuseum.gov.ph/our-collections/ethnology/'],
  ['National Museum kaban', 'https://www.nationalmuseum.gov.ph/exhibitions/anthropology/kaban/'],
  // Previously timed out — check whether the apex is down or just slow.
  ['CCP apex', 'https://culturalcenter.gov.ph/'],
  ['CCP resident companies', 'https://culturalcenter.gov.ph/resident-companies/'],
  ['CCP Bayanihan', 'https://culturalcenter.gov.ph/resident-companies/bayanihan-dance-company/'],
  ['CCP Tanghalang Pilipino', 'https://culturalcenter.gov.ph/resident-companies/tanghalang-pilipino/'],
  ['CCP venues', 'https://culturalcenter.gov.ph/venues-and-tours/'],
  // CCP subdomains that answered earlier — potential replacements.
  ['CCP digital archives', 'https://digitalarchives.culturalcenter.gov.ph/'],
  ['CCP arts education', 'https://artseducation.culturalcenter.gov.ph/'],
];

/**
 * Every image sourceUrl published in the editorial layer. These are rendered as
 * visible attribution links, so a dead one is a real defect.
 */
const IMAGE_SOURCES = [
  ['img tanghalang pilipino', 'https://digitalarchives.culturalcenter.gov.ph/storage/banner-images/Banner-Tanghalang%20Pilipino%20-%20Mabining%20Mandirigma.jpeg'],
  ['img ballet paglalakbay', 'https://digitalarchives.culturalcenter.gov.ph/storage/banner-images/Banner-Paglalakbay%20The%20Journey%20of%20the%20Sea%20People%20by%20Ballet%20Philippines%202.jpeg'],
  ['img philharmonic', 'https://digitalarchives.culturalcenter.gov.ph/storage/banner-images/Banner-Philippine%20Philharmonic%20Orchestra%2041st%20Concert%20Season%20Concert%20VIII%20Coda%202.jpeg'],
  ['img eastern chamber singers', 'https://digitalarchives.culturalcenter.gov.ph/storage/entity-images/Ent-02-01-2026%20Eastern%20Chamber%20Singers%20%5BADARNA%5D1.png'],
  ['img manila sounds', 'https://digitalarchives.culturalcenter.gov.ph/storage/collection-images/Col-Manila%20Sounds%20Saliw%20ng%20Himig%20ng%20Maynila.jpg'],
  ['img vlf hubo\'t hubad', 'https://digitalarchives.culturalcenter.gov.ph/storage/banner-images/Banner-05-19-2026%20VLF%20XXI%20-%20Hubo%27t%20Hubad%204.jpeg'],
  ['img vamos a belen', 'https://digitalarchives.culturalcenter.gov.ph/storage/entity-images/Ent-12-20-2025%20Vamos%20A%20Belen%205.jpeg'],
  ['img intramuros evenings', 'https://digitalarchives.culturalcenter.gov.ph/storage/entity-images/Ent-12-13-2025%20Intramuros%20Evenings%20-%20Christmas%20Harmonies%202.jpeg'],
  ['img ppo opera', 'https://digitalarchives.culturalcenter.gov.ph/storage/entity-images/Ent-03-13-2026%20Philippine%20Philharmonic%20Orchestra%20Versatile%20%E2%80%93%20Concert%20VII%20Opera%202.jpeg'],
  ['img ppo preludi', 'https://digitalarchives.culturalcenter.gov.ph/storage/entity-images/Ent-01-16-2026%20PPO%2041%20Versatile%20%5BConcert%20V%20%E2%80%93%20Preludi%5D5.png'],
  ['img vamos a belen alt', 'https://digitalarchives.culturalcenter.gov.ph/storage/entity-images/Ent-12-19-2025%20Vamos%20A%20Belen%201.jpeg'],
  ['org site ballet', 'https://www.ballet.ph/'],
  ['org site peta', 'https://petatheater.com/'],
  ['org site pfds', 'https://www.philippinefolkdancesociety.com/'],
];

async function probe(url, { method = 'GET', timeout = 45000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-PH,en;q=0.9',
      },
    });
    return { status: res.status, finalUrl: res.url, type: res.headers.get('content-type') ?? '' };
  } finally {
    clearTimeout(timer);
  }
}

async function run(title, list, opts) {
  console.log(`\n=== ${title} ===`);
  for (const [label, url] of list) {
    process.stdout.write(`  ${label.padEnd(28)} `);
    try {
      const { status, finalUrl, type } = await probe(url, opts);
      const kind = /image\//.test(type) ? 'image' : 'page';
      const note =
        status === 200
          ? `OK  ${status} ${kind}${finalUrl !== url ? ` -> ${new URL(finalUrl).host}` : ''}`
          : `HTTP ${status}${status === 403 ? ' (bot protection)' : status === 502 ? ' (origin down)' : ''}`;
      console.log(note);
    } catch (e) {
      const code = e.cause?.code ?? e.name;
      const isLocal = ['CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT'].includes(String(code));
      console.log(`ERR ${code}${isLocal ? ' (local trust store, not a site fault)' : ''}`);
    }
  }
}

await run('previously failing links (browser UA)', TARGETS);
await run('image attribution source URLs', IMAGE_SOURCES, { method: 'HEAD' });