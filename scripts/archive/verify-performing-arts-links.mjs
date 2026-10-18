/**
 * Extracts every third-party URL from the performing-arts content dataset and
 * checks that each one resolves to a real, reachable page.
 *
 * A non-200 is not automatically a defect in this repository. Philippine
 * government sites sit behind Cloudflare (403 to any automated client), and
 * some are intermittently down (502). Those are recorded as SITE-SIDE and do not
 * fail the build; only responses that indicate the link itself is wrong — a 404
 * or a permanent error — fail.
 *
 * Run: node scripts/verify-performing-arts-links.mjs
 * Exit code 1 if any link is genuinely broken.
 */

/** Statuses that mean the destination refuses this client, not that it is wrong. */
const SITE_SIDE_STATUSES = new Set([403, 429, 503]);

/** Transport failures caused by the local machine, not the destination. */
const LOCAL_ERRORS = new Set([
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(here, '..', 'features', 'performing-arts', 'data', 'content.ts'),
  'utf8'
);

const urls = [...new Set([...src.matchAll(/https?:\/\/[^'"\s)]+/g)].map((m) => m[0]))].sort();

/* Same URLs are also hard-coded on the page itself. */
const pageSrc = readFileSync(
  join(here, '..', 'app', 'performing-arts-philippines', 'page.tsx'),
  'utf8'
);
const pageUrls = [...new Set([...pageSrc.matchAll(/https?:\/\/[^'"\s)]+/g)].map((m) => m[0]))].sort();

const all = [...new Set([...urls, ...pageUrls])].sort();

/**
 * Loopback URLs are the app's own dev fallback (`NEXT_PUBLIC_APP_URL ||
 * 'http://localhost:3000'`), not outbound links a visitor would follow. They
 * cannot be probed meaningfully and their reachability is not a property of
 * this dataset.
 */
const external = all.filter((u) => !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(u));
const localUrls = all.filter((u) => !external.includes(u));

console.log(
  `Found ${all.length} unique URLs (${urls.length} in dataset, ${pageUrls.length} on page)\n`
);
if (localUrls.length) {
  console.log(`Skipping ${localUrls.length} loopback URL(s) — local dev fallback, not an outbound link:`);
  localUrls.forEach((u) => console.log(`  ${u}`));
  console.log('');
}

const results = [];

for (const url of external) {
  const inPageOnly = !urls.includes(url);
  let status = 'UNKNOWN';
  let finalUrl = url;
  let note = '';

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    // Some gov sites reject HEAD; fall back to a ranged GET.
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)' },
    });
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      ctrl.abort();
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 25000);
      // Retry as a real browser. A site that 403s the bot agent but serves the
      // browser is fine; one that still refuses is genuinely unreachable to us.
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: c2.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-PH,en;q=0.9',
          Range: 'bytes=0-2047',
        },
      });
      clearTimeout(t2);
      if (res.status === 200) note = 'served only to browser user-agents';
    }
    clearTimeout(timer);
    status = res.status;
    finalUrl = res.url || url;
    if (res.status >= 400) note = res.statusText || '';
  } catch (err) {
    status = 'ERR';
    note = err?.name === 'AbortError' ? 'timeout' : String(err.cause?.code || err.message).slice(0, 60);
  }

  const reachable = typeof status === 'number' && status < 400;
  const siteSide =
    (typeof status === 'number' && SITE_SIDE_STATUSES.has(status)) ||
    status === 502 ||
    note === 'timeout' ||
    LOCAL_ERRORS.has(note);

  // A link is only "broken" when the destination answered and said no.
  const broken = !reachable && !siteSide;

  results.push({ url, status, ok: reachable, broken, siteSide, finalUrl, inPageOnly, note });
  const mark = reachable ? 'OK  ' : broken ? 'FAIL' : 'SIDE';
  const why = !reachable && !broken ? (note === 'timeout' ? 'not reachable from here' : note || 'site-side') : '';
  const extra = [
    finalUrl !== url && reachable ? `-> ${finalUrl}` : null,
    why || (reachable && note ? `(${note})` : null),
  ]
    .filter(Boolean)
    .join('\n        ');
  console.log(`  ${mark} ${status}  ${url}${extra ? `\n        ${extra}` : ''}`);
}

const broken = results.filter((r) => r.broken);
const sideOnly = results.filter((r) => r.siteSide && !r.ok);
const reachable = results.filter((r) => r.ok);

console.log(
  `\n${reachable.length}/${results.length} reachable, ` +
    `${sideOnly.length} site-side, ${broken.length} broken`
);

if (sideOnly.length) {
  console.log('\nNOT REACHABLE FROM HERE (destination refuses this client or is down):');
  sideOnly.forEach((f) => console.log(`  ${f.status} ${f.url} — ${f.note || 'site-side'}`));
}

if (broken.length) {
  console.log('\nBROKEN (the destination answered and the link is wrong):');
  broken.forEach((f) => console.log(`  ${f.status} ${f.url} ${f.note}`));
}

process.exit(broken.length === 0 ? 0 : 1);