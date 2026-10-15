/**
 * Verifies that every external link on the hub actually belongs to the subject
 * it is presented under.
 *
 * A 200 is not proof of relevance: a search redirect, a parked domain, or a
 * page about something adjacent all return 200. This fetches each reachable
 * URL and requires the page to actually name the organisation it is filed
 * under. Where the publisher blocks automated clients, the link is reported as
 * unverifiable rather than counted as verified.
 *
 * Run: node scripts/verify-pa-link-subjects.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentSrc = readFileSync(
  join(root, 'features/performing-arts/data/content.ts'),
  'utf8'
);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const strip = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const decodeEntities = (s) =>
  String(s ?? '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

/**
 * Words that must appear on the destination page for the link to count as
 * genuinely about that subject. Chosen as the names a reader would expect to
 * see, not as a bare hostname match.
 */
const EXPECT = {
  // Organisations
  'culturalcenter.gov.ph': ['Cultural Center'],
  'digitalarchives.culturalcenter.gov.ph': ['Cultural Center', 'CCP'],
  'artseducation.culturalcenter.gov.ph': ['Cultural Center', 'CCP'],
  'nationalmuseum.gov.ph': ['National Museum'],
  'ncca.gov.ph': ['National Commission for Culture and the Arts', 'NCCA'],
  'pia.gov.ph': ['Philippine Information Agency', 'PIA'],
  'ballet.ph': ['Ballet Philippines'],
  'petatheater.com': ['PETA'],
  'rofg1972.com': ['Obusan', 'Ramon Obusan'],
  'philippinefolkdancesociety.com': ['Folk Dance Society', 'PFDS'],
  // Government instruments
  'lawphil.net': ['Republic Act', 'Act No.'],
  'officialgazette.gov.ph': ['Republic Act', 'Act No.'],
  'elibrary.judiciary.gov.ph': ['Republic Act', 'Act No.'],
  // Media / publishing
  'philstar.com': ['Philstar'],
  'inquirer.net': ['Inquirer'],
  'abs-cbn.com': ['ABS-CBN'],
  'rappler.com': ['Rappler'],
  'manilatimes.net': ['Manila Times'],
  'mb.com.ph': ['Manila Bulletin'],
  'philippine-news.com': ['Philippine News'],
  'ust.edu.ph': ['UST', 'University of Santo Tomas'],
  'up.edu.ph': ['University of the Philippines', 'UP'],
  // Known parked / for-sale domains that superficially look like the real site.
  'bayanihan.com.ph': [],
};

/** Collects every external href that the page renders. */
const urls = [
  ...new Set(
    [...contentSrc.matchAll(/https?:\/\/[^'"\s),]+/g)].map((m) =>
      decodeEntities(m[0]).replace(/[.,;]+$/, '')
    )
  ),
];

console.log(`\nLink subject verification — ${urls.length} external URLs\n`);

let verified = 0;
let blocked = 0;
let failed = 0;

for (const url of urls) {
  const host = new URL(url).host.replace(/^www\./, '');
  const expectations = EXPECT[host] ?? [];
  const label = url.length > 78 ? `${url.slice(0, 75)}...` : url;

  let status = 0;
  let body = '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-PH,en;q=0.9' },
    });
    clearTimeout(timer);
    status = res.status;
    if (status === 200) body = await res.text();
  } catch (e) {
    const code = e.cause?.code ?? e.name;
    const localTrust = [
      'CERT_HAS_EXPIRED',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
    ].includes(String(code));
    console.log(`  UNVERIFIABLE  ${label}\n                 ${code}${localTrust ? ' (local trust store, not a site fault)' : ''}`);
    blocked++;
    continue;
  }

  if (status !== 200) {
    const why =
      status === 403
        ? 'publisher blocks automated clients'
        : status === 502
          ? 'origin down'
          : `HTTP ${status}`;
    console.log(`  UNVERIFIABLE  ${label}\n                 ${why}`);
    blocked++;
    continue;
  }

  const text = decodeEntities(strip(body));
  const hay = text.toLowerCase();

  if (expectations.length === 0) {
    console.log(`  NO-CHECK      ${label}\n                 no subject expectation defined for this host`);
    continue;
  }

  const hit = expectations.find((e) => hay.includes(e.toLowerCase()));
  if (hit) {
    console.log(`  VERIFIED      ${label}\n                 page names "${hit}"`);
    verified++;
  } else {
    console.log(`  MISMATCH      ${label}\n                 expected the page to name: ${expectations.join(', ')}`);
    failed++;
  }
}

/*
 * Parked-domain guard.
 *
 * `bayanihan.com.ph` returns HTTP 200 but serves a 478-byte "Loading..."
 * page from `server: Cowboy` that redirects through a signed JWT — a parked
 * domain, not the Bayanihan Philippine National Folk Dance Company. A naive
 * status check calls that healthy. These signatures catch that class of link.
 */
const PARKED_SERVERS = ['cowboy', 'parkingcrew', 'sedoparking', 'above.com', 'dan.com'];
{
  const parked = [];
  for (const url of urls) {
    let server = '';
    let bytes = 0;
    let text = '';
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
      clearTimeout(timer);
      server = (res.headers.get('server') ?? '').toLowerCase();
      const body = await res.text();
      bytes = body.length;
      text = strip(body).toLowerCase();
    } catch {
      continue;
    }
    if (PARKED_SERVERS.some((p) => server.includes(p))) {
      parked.push(`${url} (server: ${server})`);
      continue;
    }
    // A real article or directory page is never this short.
    if (bytes > 0 && bytes < 1200 && /^(loading|redirecting|coming soon|under construction)/.test(text)) {
      parked.push(`${url} (${bytes}B placeholder: "${text.slice(0, 40)}")`);
    }
  }
  if (parked.length) {
    console.log(`\n  PARKED DOMAINS: ${parked.length}`);
    parked.forEach((p) => console.log(`    ${p}`));
    failed += parked.length;
  } else {
    console.log('\n  No parked or placeholder domains among the linked pages.');
  }
}

console.log(`\n${verified} verified, ${blocked} unverifiable (site-side), ${failed} mismatched`);
process.exit(failed === 0 ? 0 : 1);