/**
 * Enforces the image rules for the performing-arts hub.
 *
 *   1. No two ORGANISATION cards share a photograph.
 *   2. No two ARTICLE cards share a photograph.
 *   3. The ONLY permitted cross-collection duplicate is an article reusing the
 *      photograph of the organisation it is about, and each such case must be
 *      declared in INTENTIONAL_IMAGE_SHARES — so an accidental repeat fails.
 *   4. The six category cards each get a distinct photograph.
 *   5. Every referenced file exists under /public and is a real image, not a stub.
 *   6. Every image carries a credit; every stand-in says so in its own text.
 *   7. No stand-in names the organisation it stands in for — a card for
 *      Bayanihan must not show alt text claiming to depict Bayanihan.
 *   8. No remote or localhost image sources, so production cannot 404.
 *
 * Run: node scripts/verify-pa-image-map.mjs
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const edSrc = read('features/performing-arts/data/editorial.ts');
const contentSrc = read('features/performing-arts/data/content.ts');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
};

/**
 * Evaluates the real editorial module so the checks run against the shipped
 * data rather than a regex approximation of it. The file is plain data plus a
 * few type declarations, so stripping those is enough.
 */
function loadEditorial() {
  const js = edSrc
    .replace(/^\/\*\*[\s\S]*?\*\/\s*$/gm, '')
    .replace(/^import[\s\S]*?from\s*'[^']+';\s*$/gm, '')
    .replace(/^export interface[\s\S]*?^\}/gm, '')
    .replace(/^export type[\s\S]*?;$/gm, '')
    .replace(/^(export\s+)?const\s+(\w+)\s*:\s*[\s\S]*?=\s*(?=[^=])/gm, 'const $2 = ')
    .replace(/\bas const\b/g, '')
    .replace(/\bsatisfies\s+Record<string, HubImage>\s*;/g, ';')
    .replace(/\bsatisfies\s+[A-Za-z<>, ]+\s*;/g, ';')
    .replace(/\bas\s+Record<[^>]+>/g, '')
    .replace(/^export /gm, '')
    .trim();
  // The lucide icons are referenced as bare identifiers; supply each one so the
  // module evaluates. Their value is irrelevant to these checks.
  const ICON_NAMES = ['Footprints', 'Music2', 'Drama', 'Mic', 'Landmark', 'Sparkles',
    'CalendarDays', 'Users', 'Compass', 'GraduationCap'];
  const iconArgs = ICON_NAMES.map((n) => `const ${n} = "icon:${n}";`).join('\n');
  return new Function(
    `${iconArgs}\n${js}\nreturn { HUB_IMAGES, EDITORIAL_CATEGORIES, ORG_IMAGES, ` +
      `ARTICLE_IMAGES, INTENTIONAL_IMAGE_SHARES };`
  )();
}

const {
  HUB_IMAGES: HUB,
  EDITORIAL_CATEGORIES,
  ORG_IMAGES: ORGS,
  ARTICLE_IMAGES: ARTS,
  INTENTIONAL_IMAGE_SHARES: SHARES,
} = loadEditorial();

/** Bounds a collection's slice to its own declaration. */
const sliceOf = (name) => {
  const i = contentSrc.indexOf(`export const ${name}`);
  if (i === -1) return '';
  const rest = contentSrc.slice(i);
  const j = rest.indexOf('\nexport const', 1);
  return j === -1 ? rest : rest.slice(0, j);
};
const idsOf = (name) =>
  [...sliceOf(name).matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1]);

const orgIds = idsOf('ORGANIZATIONS');
const artIds = idsOf('ARTICLES');

/** Every name a placeholder must NOT claim to depict, keyed by record id. */
const NAMES_FOR_ID = {
  ncca: ['NCCA', 'National Commission'],
  ccp: ['Cultural Center'],
  'ccp-directory': ['CCP Directory', 'Cultural Center'],
  nmp: ['National Museum'],
  pia: ['Philippine Information Agency', 'PIA'],
  'ballet-ph': ['Ballet Philippines'],
  bayanihan: ['Bayanihan'],
  rofg: ['Ramon Obusan', 'ROFG'],
  'tanghalang-pilipino': ['Tanghalang Pilipino'],
  peta: ['PETA'],
  pfds: ['Philippine Folk Dance Society', 'PFDS'],
  'ccp-orchestra': ['Philippine Philharmonic'],
  'ccp-venues': ['Tanghalang Pambansa', 'CCP Venues'],
};

console.log('\nPerforming arts — image map\n');

check(`HUB_IMAGES registry parsed (${Object.keys(HUB).length})`, Object.keys(HUB).length >= 16);
check(
  `every organisation has an image (${orgIds.length})`,
  orgIds.every((id) => ORGS[id]?.src),
  orgIds.filter((id) => !ORGS[id]?.src).join(', ')
);
check(
  `every article has an image (${artIds.length})`,
  artIds.every((id) => ARTS[id]?.src),
  artIds.filter((id) => !ARTS[id]?.src).join(', ')
);

/* 1-2. Within each collection, no repeats. */
const dupeWithin = (label, ids, map) => {
  const seen = new Map();
  const dupes = [];
  for (const id of ids) {
    const src = map[id]?.src;
    if (!src) continue;
    if (seen.has(src)) dupes.push(`${label} "${id}" reuses "${src}" from "${seen.get(src)}"`);
    else seen.set(src, id);
  }
  return dupes;
};
{
  const d = [...dupeWithin('ORG', orgIds, ORGS), ...dupeWithin('ARTICLE', artIds, ARTS)];
  check('no organisation card repeats another organisation\'s photo', !d.some((x) => x.startsWith('ORG')), d.filter((x) => x.startsWith('ORG')).join('\n        '));
  check('no article card repeats another article\'s photo', !d.some((x) => x.startsWith('ARTICLE')), d.filter((x) => x.startsWith('ARTICLE')).join('\n        '));
}

/* 3. Cross-collection repeats must be declared intentional shares. */
{
  const orgBySrc = new Map(orgIds.map((id) => [ORGS[id]?.src, id]));
  const undeclared = [];
  const declared = [];
  for (const id of artIds) {
    const src = ARTS[id]?.src;
    const orgId = orgBySrc.get(src);
    if (!orgId) continue;
    if (SHARES[id] === orgId) declared.push(`${id} -> ${orgId}`);
    else undeclared.push(`article "${id}" shares ${src} with org "${orgId}" but is not in INTENTIONAL_IMAGE_SHARES`);
  }
  check('every org/article photo overlap is a declared intentional share', undeclared.length === 0, undeclared.join('\n        '));
  check('every declared share actually resolves to that organisation', Object.entries(SHARES).every(([a, o]) => ORGS[o]?.src === ARTS[a]?.src),
    Object.entries(SHARES).filter(([a, o]) => ORGS[o]?.src !== ARTS[a]?.src).map(([a, o]) => `${a} -> ${o} (images differ)`).join('\n        '));
  console.log(`        (${declared.length} intentional article->organisation shares, all verified)`);

  const stale = Object.keys(SHARES).filter((a) => !artIds.includes(a));
  check('no declared share refers to a removed article', stale.length === 0, stale.join(', '));
}

/* 4. Category cards are distinct from each other. */
{
  const srcs = EDITORIAL_CATEGORIES.map((c) => c.image?.src);
  check('six category cards', EDITORIAL_CATEGORIES.length === 6, `found ${EDITORIAL_CATEGORIES.length}`);
  check('category cards use six distinct photographs', new Set(srcs).size === 6, `distinct: ${new Set(srcs).size}`);
}

/* 5. Every referenced file exists and is a real image. */
{
  const missing = [];
  const tiny = [];
  for (const [key, img] of Object.entries(HUB)) {
    if (!img.src || !img.src.startsWith('/')) { missing.push(`${key}: not a local path (${img.src})`); continue; }
    const p = join(root, 'public', img.src.replace(/^\//, ''));
    if (!existsSync(p)) { missing.push(`${key}: ${img.src}`); continue; }
    if (statSync(p).size < 2000) tiny.push(`${key}: ${img.src} (${statSync(p).size}B)`);
  }
  check('every referenced image exists in /public', missing.length === 0, missing.join('\n        '));
  check('no referenced image is a stub (<2KB)', tiny.length === 0, tiny.join('\n        '));
}

/* 6. Attribution + honesty of stand-ins, checked on the ASSIGNED images. */
{
  const assigned = [
    ...orgIds.map((id) => [`ORG ${id}`, ORGS[id]]),
    ...artIds.map((id) => [`ARTICLE ${id}`, ARTS[id]]),
    ...EDITORIAL_CATEGORIES.map((c) => [`CATEGORY ${c.id}`, c.image]),
  ];
  const noCredit = assigned.filter(([, i]) => !i?.credit).map(([l]) => l);
  check('every card image records a credit', noCredit.length === 0, noCredit.join(', '));

  const noAlt = assigned.filter(([, i]) => !i?.alt || i.alt.length < 20).map(([l]) => l);
  check('every card image has descriptive alt text', noAlt.length === 0, noAlt.join(', '));

  const phs = assigned.filter(([, i]) => i?.isPlaceholder);
  check(
    'stand-in cards say so in their own alt text or credit',
    phs.every(([, i]) => /representative/i.test(i.alt) || /representative/i.test(i.credit)),
    phs.filter(([, i]) => !/representative/i.test(i.alt) && !/representative/i.test(i.credit)).map(([l]) => l).join(', ')
  );
  check('the page distinguishes real photos from stand-ins', phs.length > 0 && phs.length < assigned.length,
    `${phs.length} stand-ins of ${assigned.length} cards`);
}

/* 7. A stand-in must never claim to depict the organisation it stands in for. */
{
  const offenders = [];
  for (const [label, img] of [
    ...orgIds.map((id) => [`ORG ${id}`, ORGS[id]]),
    ...artIds.map((id) => [`ARTICLE ${id}`, ARTS[id]]),
  ]) {
    if (!img?.isPlaceholder) continue;
    const id = label.split(' ')[1];
    for (const n of NAMES_FOR_ID[id] ?? []) {
      if (new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(img.alt)) {
        offenders.push(`${label}: stand-in alt text names "${n}"`);
      }
    }
  }
  check('no stand-in alt text names the organisation it stands in for', offenders.length === 0, offenders.join('\n        '));
}

/* 8. Authenticity requires an authentic source: a third-party photo must link
      back to where it was published. */
{
  const thirdParty = Object.entries(HUB).filter(([, i]) => /Cultural Center|Ballet Philippines|PETA|Folk Dance/.test(i.credit));
  const noSource = thirdParty.filter(([, i]) => !i.sourceUrl).map(([k]) => k);
  check('every third-party image links to its publisher', noSource.length === 0, noSource.join(', '));
}

/* 9. No remote or localhost image sources — production must not depend on a
      third-party host, and localhost would break immediately on deploy. */
{
  const remote = [...edSrc.matchAll(/src:\s*['"`](https?:\/\/[^'"`]+)/g)].map((m) => m[1]);
  check('no remote image sources', remote.length === 0, remote.join(', '));
  check('no localhost image sources', !/localhost/.test(edSrc));
}

/* 10. No dead assets left in the bundle, and no unused registry entries. */
{
  const dir = join(root, 'public', 'image', 'pa');
  if (existsSync(dir)) {
    const used = new Set(Object.values(HUB).map((i) => i.src).filter(Boolean));
    const orphans = [];
    for (const f of readdirSync(dir)) {
      const rel = `/image/pa/${f}`;
      if (!used.has(rel)) orphans.push(rel);
    }
    check('no unreferenced files in public/image/pa', orphans.length === 0, orphans.join('\n        '));
  }

  // An entry nothing points at is either dead weight in the registry or a card
  // that lost its image — both are worth failing on.
  const usedSrcs = new Set(
    [
      ...orgIds.map((id) => ORGS[id]?.src),
      ...artIds.map((id) => ARTS[id]?.src),
      ...EDITORIAL_CATEGORIES.map((c) => c.image?.src),
      // Fallback images used directly by the component are legitimately unused
      // by any card, so they are exempt.
      HUB.stockStage?.src,
    ].filter(Boolean)
  );
  const unused = Object.entries(HUB)
    .filter(([, i]) => !usedSrcs.has(i.src))
    .map(([k]) => `${k} (${HUB[k].src})`);
  check('no unused image in the HUB_IMAGES registry', unused.length === 0, unused.join('\n        '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);