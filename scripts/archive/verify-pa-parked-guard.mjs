/**
 * Negative control for the parked-domain guard in verify-pa-link-subjects.mjs.
 *
 * A test that never fails proves nothing. This runs the same parked-domain
 * signatures against a page known to be parked (bayanihan.com.ph) and against
 * pages known to be genuine, to confirm the guard fires on one and not the
 * others.
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const PARKED_SERVERS = ['cowboy', 'parkingcrew', 'sedoparking', 'above.com', 'dan.com'];
const strip = (s) =>
  String(s ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function judge(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    clearTimeout(timer);
    const server = (res.headers.get('server') ?? '').toLowerCase();
    const body = await res.text();
    const text = strip(body).toLowerCase();
    const reasons = [];
    if (PARKED_SERVERS.some((p) => server.includes(p))) reasons.push(`server: ${server}`);
    if (body.length > 0 && body.length < 1200 && /^(loading|redirecting|coming soon|under construction)/.test(text)) {
      reasons.push(`${body.length}B placeholder: "${text.slice(0, 40)}"`);
    }
    return { status: res.status, bytes: body.length, server, flagged: reasons.length > 0, reasons };
  } finally {
    clearTimeout(timer);
  }
}

const CASES = [
  ['https://bayanihan.com.ph/', true, 'parked domain — MUST be flagged'],
  ['https://www.ballet.ph/', false, 'genuine company site — must NOT be flagged'],
  ['https://petatheater.com/', false, 'genuine company site — must NOT be flagged'],
  ['https://tanghalangpilipino.org/', false, 'genuine company site — must NOT be flagged'],
  ['https://rofg1972.com/', false, 'genuine company site — must NOT be flagged'],
];

let pass = 0;
let fail = 0;
console.log('\nParked-domain guard — negative control\n');

for (const [url, shouldFlag, why] of CASES) {
  try {
    const r = await judge(url);
    const ok = r.flagged === shouldFlag;
    ok ? pass++ : fail++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${url}`);
    console.log(`        HTTP ${r.status}, ${r.bytes}B, server=${r.server || '(none)'} — ${why}`);
    if (r.reasons.length) console.log(`        flagged: ${r.reasons.join('; ')}`);
  } catch (e) {
    fail++;
    console.log(`  ERROR ${url} — ${e.cause?.code ?? e.message}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);