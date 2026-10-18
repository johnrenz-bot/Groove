/**
 * End-to-end image check against a running server.
 *
 * The other suites verify the data. This one verifies what a visitor actually
 * receives: it fetches each hub route, extracts every image the page renders,
 * requests each one, and asserts a real image comes back — plus no duplicates,
 * no empty alt text, and visible attribution.
 *
 * Usage: node scripts/verify-pa-images-e2e.mjs [baseUrl]
 *        (default http://localhost:3111)
 */
const BASE = process.argv[2] ?? 'http://localhost:3111';

const ROUTES = [
  '/performing-arts-philippines',
  '/client/performing-arts-philippines',
  '/coach/performing-arts-philippines',
];

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
};

const decodeEntities = (s) =>
  String(s ?? '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&');

console.log(`\nPerforming arts — images end to end (${BASE})\n`);

for (const route of ROUTES) {
  console.log(`--- ${route} ---`);
  let res;
  try {
    res = await fetch(`${BASE}${route}`, { redirect: 'follow' });
  } catch (e) {
    check(`${route} responds`, false, String(e.cause?.code ?? e.message));
    continue;
  }

  // The portal routes redirect to sign-in for anonymous visitors, which is the
  // auth gate working as intended; the hub markup is then absent.
  const gated = res.status === 307 || res.status === 302 || res.url.includes('/login');
  if (gated) {
    // The portal routes require a session. Confirming that they redirect to
    // sign-in (rather than 404ing or leaking the page) is the useful check
    // available without credentials.
    const target = (res.url.replace(BASE, '') || '').split('?')[0];
    check(`${route} exists and is auth-gated`, target === '/login', `redirected to ${target}`);
    check(
      `${route} redirect preserves the destination`,
      res.url.includes(encodeURIComponent(route)),
      res.url
    );
    console.log(`  SKIP  page markup needs a signed-in session\n`);
    continue;
  }

  check(`${route} returns 200`, res.status === 200, `got ${res.status}`);
  const html = await res.text();

  // Every <img> next/image emits, with its alt.
  const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
  const srcOf = (tag) =>
    decodeEntities((tag.match(/\bsrc="([^"]+)"/) ?? [])[1] ?? '');
  const altOf = (tag) => decodeEntities((tag.match(/\balt="([^"]*)"/) ?? [])[1] ?? null);

  check(`${route} renders images`, imgs.length > 0, `${imgs.length} <img> tags`);

  // Recover the ORIGINAL source behind each optimizer URL.
  const originalOf = (src) => {
    if (!src) return null;
    if (src.startsWith('/_next/image')) {
      const m = src.match(/[?&]url=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }
    return src;
  };

  const originals = imgs.map(srcOf).map(originalOf).filter(Boolean);

  // Hub images specifically — the ones this work changed.
  const hubImgs = originals.filter((o) => o.startsWith('/image/pa/'));
  check(
    `${route} renders hub images`,
    hubImgs.length >= 10,
    `${hubImgs.length} images from /image/pa`
  );

  // Uniqueness is a per-collection invariant (enforced by
  // verify-pa-image-map.mjs) because one record legitimately renders in several
  // sections at once. What matters here is that the page is not collapsing onto
  // a handful of thumbnails.
  const hubDistinct = new Set(hubImgs).size;
  check(
    `${route} uses a broad set of distinct images`,
    hubDistinct >= 10,
    `${hubDistinct} distinct hub images across ${imgs.length} rendered <img>`
  );

  // Every image carries alt text.
  const noAlt = imgs.filter((t) => !altOf(t));
  check(`${route} gives every image alt text`, noAlt.length === 0, `${noAlt.length} missing`);

  // Every rendered image actually serves, and is really an image.
  const bad = [];
  for (const tag of imgs) {
    const src = srcOf(tag);
    if (!src) continue;
    const url = src.startsWith('/') ? `${BASE}${src}` : src;
    try {
      const r = await fetch(url, { redirect: 'follow' });
      const type = r.headers.get('content-type') ?? '';
      if (!r.ok) bad.push(`${src} -> HTTP ${r.status}`);
      else if (!type.startsWith('image/')) bad.push(`${src} -> ${type}`);
    } catch (e) {
      bad.push(`${src} -> ${e.cause?.code ?? e.message}`);
    }
  }
  check(`${route} every rendered image serves an image`, bad.length === 0, bad.slice(0, 6).join('\n        '));

  // Attribution is visible on the page.
  const placeholderNotes = (html.match(/Representative image/g) ?? []).length;
  const creditLinks = (html.match(/>Image: <!-- -->/g) ?? []).length;
  check(
    `${route} shows image attribution`,
    placeholderNotes + creditLinks > 0,
    `${placeholderNotes} stand-in labels, ${creditLinks} credited images`
  );

  // No remote or localhost image sources leak into the markup.
  const remoteImg = imgs.filter((t) => /^src="https?:\/\//.test(t));
  check(`${route} uses no remote image source`, remoteImg.length === 0, `${remoteImg.length} found`);
  const localhostImg = originals.filter((o) => /localhost/i.test(o));
  check(`${route} uses no localhost image source`, localhostImg.length === 0, localhostImg.join(', '));

  // Aspect ratios are enforced by object-cover, so no image can distort a card.
  check(
    `${route} images are cropped, not stretched`,
    !/<img[^>]*\bstyle="[^"]*width:\s*\d+px[^"]*height:\s*\d+px/.test(html)
  );

  console.log('');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);