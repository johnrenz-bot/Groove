/**
 * Data-integrity checks for the performing-arts hub dataset and page.
 *
 * Verifies the things that silently rot: duplicate ids, dangling category
 * references, dead in-page anchors, and external links missing safe rel/target.
 *
 * Run: node scripts/verify-performing-arts-data.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = readFileSync(join(root, 'features', 'performing-arts', 'data', 'content.ts'), 'utf8');
/* `page` is the RENDERED body of every hub route. The public route is now a
   thin shell (nav links + metadata + JSON-LD) that delegates to the shared
   component, so the content-level checks below must read that component. */
const page = readFileSync(
  join(root, 'features', 'performing-arts', 'components', 'PerformingArtsHub.tsx'),
  'utf8'
);
const publicShell = readFileSync(join(root, 'app', 'performing-arts-philippines', 'page.tsx'), 'utf8');
const explorer = readFileSync(
  join(root, 'features', 'performing-arts', 'components', 'PerformingArtsHub.tsx'),
  'utf8'
);

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
};

/** Pull the string literal for `field: '...'` inside an object starting at `id: '<key>'`. */
const entries = (arrayName) => {
  const start = data.indexOf(`export const ${arrayName}`);
  if (start === -1) return [];
  const rest = data.slice(start);
  const blockEnd = rest.indexOf('\nexport const', 1);
  const block = blockEnd === -1 ? rest : rest.slice(0, blockEnd);
  const out = [];
  const re = /id:\s*'([^']+)'([\s\S]*?)(?=\n  \{|\n\];)/g;
  let m;
  while ((m = re.exec(block))) out.push({ id: m[1], body: m[2] });
  return out;
};

const CATEGORIES = entries('CATEGORIES');
const ARTICLES = entries('ARTICLES');
const ORGANIZATIONS = entries('ORGANIZATIONS');
const RESOURCES = entries('RESOURCES');
const LISTINGS = entries('LISTINGS');

console.log('\nPerforming arts hub — data integrity\n');

/* 1. Unique ids within each collection.
   Cross-collection reuse is deliberate: e.g. `ccp-venues` appears both as a
   browsable organization and as an education/events listing, because the two
   render in separate sections and separate grids. What must never happen is a
   duplicate WITHIN one array, since those render together and would collide
   on React keys. */
{
  const groups = [
    ['CATEGORIES', CATEGORIES],
    ['ARTICLES', ARTICLES],
    ['ORGANIZATIONS', ORGANIZATIONS],
    ['RESOURCES', RESOURCES],
    ['LISTINGS', LISTINGS],
  ];
  const bad = [];
  for (const [name, list] of groups) {
    const ids = list.map((e) => e.id);
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dupes.length) bad.push(`${name}: ${dupes.join(', ')}`);
  }
  check('ids are unique within each collection', bad.length === 0, bad.join('\n        '));
}

/* 1b. The two arrays that ARE merged and rendered together must not collide.
   The Explorer renders [...ORGANIZATIONS, ...RESOURCES] in one grid, and the
   page renders ORGANIZATIONS and RESOURCES in one section. */
{
  const ids = [...ORGANIZATIONS, ...RESOURCES].map((e) => e.id);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  check(
    'ORGANIZATIONS and RESOURCES (merged into one grid) have no id collisions',
    dupes.length === 0,
    `collide: ${dupes.join(', ')}`
  );
}

/* 2. Every category reference resolves to a declared category. */
{
  const ids = new Set(CATEGORIES.map((c) => c.id));
  const dangling = [];
  for (const [name, list] of [
    ['ARTICLES', ARTICLES],
    ['ORGANIZATIONS', ORGANIZATIONS],
    ['RESOURCES', RESOURCES],
    ['LISTINGS', LISTINGS],
  ]) {
    for (const e of list) {
      const m = e.body.match(/category:\s*'([^']+)'/);
      if (m && !ids.has(m[1])) dangling.push(`${name}.${e.id} -> ${m[1]}`);
    }
  }
  check('every category reference resolves', dangling.length === 0, dangling.join('\n        '));
}

/* 3. Twelve categories are declared (spec requires all twelve areas). */
check('twelve categories declared', CATEGORIES.length === 12, `found ${CATEGORIES.length}`);

/* 4. In-page nav anchors point at sections that exist on the rendered body. */
{
  const ids = new Set([...page.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const navBlock = publicShell.slice(
    publicShell.indexOf('const NAV_LINKS'),
    publicShell.indexOf('];', publicShell.indexOf('const NAV_LINKS'))
  );
  const hrefs = [...navBlock.matchAll(/href:\s*'\/performing-arts-philippines#([^']+)'/g)].map((m) => m[1]);
  const dangling = hrefs.filter((h) => !ids.has(h));
  check(
    'every nav anchor has a matching section id',
    hrefs.length > 0 && dangling.length === 0,
    dangling.length ? `dangling: ${dangling.join(', ')}` : 'no anchors found'
  );
  check('nav has no duplicate anchors', new Set(hrefs).size === hrefs.length);
}

/* 5. Every icon name a category declares is a real lucide icon the hub imports.
   The redesigned hub renders icons by direct import rather than through a name
   lookup table, so this checks the imports actually cover the dataset's icons. */
{
  const importBlocks = [...explorer.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*'lucide-react'/g)];
  const imports = new Set(
    importBlocks.flatMap((m) => m[1].split(',').map((s) => s.trim()).filter(Boolean))
  );
  const used = CATEGORIES.map((c) => (c.body.match(/icon:\s*'([^']+)'/) || [])[1]).filter(Boolean);
  const unknown = used.filter((i) => !imports.has(i));
  check('every category icon is imported by the hub', used.length > 0 && unknown.length === 0, `missing: ${unknown}`);
}

/* 6. Every resource/organization has a non-empty https URL and a trust level. */
{
  const bad = [];
  for (const [name, list] of [
    ['ORGANIZATIONS', ORGANIZATIONS],
    ['RESOURCES', RESOURCES],
  ]) {
    for (const e of list) {
      const u = (e.body.match(/url:\s*'([^']+)'/) || [])[1];
      const t = (e.body.match(/trust:\s*'([^']+)'/) || [])[1];
      if (!u || !u.startsWith('https://')) bad.push(`${name}.${e.id} url=${u}`);
      if (!t) bad.push(`${name}.${e.id} missing trust`);
    }
  }
  check('all organisation/resource URLs are https with a trust level', bad.length === 0, bad.join('\n        '));
}

/* 7. Verification status is declared wherever a note is shown. */
{
  const bad = [];
  for (const [name, list] of [
    ['ORGANIZATIONS', ORGANIZATIONS],
    ['RESOURCES', RESOURCES],
  ]) {
    for (const e of list) {
      const hasNote = /note:\s*'/.test(e.body);
      const hasStatus = /status:\s*'needs-verification'/.test(e.body);
      // A note is allowed without status (informational), but a
      // needs-verification status must always carry a note explaining why.
      if (hasStatus && !hasNote) bad.push(`${name}.${e.id} status without note`);
    }
  }
  check('needs-verification always carries an explanatory note', bad.length === 0, bad.join('\n        '));
}

/* 8. The page must not claim every link was verified when some are not. */
{
  const unverifiedCount = [...ORGANIZATIONS, ...RESOURCES].filter((e) =>
    /status:\s*'needs-verification'/.test(e.body)
  ).length;
  const claimsAll = /Every external link was\s+checked/.test(page.replace(/\s+/g, ' '));
  check(
    'page does not claim every link was verified while some are not',
    !(unverifiedCount > 0 && claimsAll),
    `${unverifiedCount} entries flagged but page claims full verification`
  );
  // And it must explain the flag to visitors.
  check('page surfaces a Needs verification label', /Needs verification/.test(page));
}

/* 9. External anchors use safe rel + target. */
{
  const bad = [...page.matchAll(/<a\b[^>]*href="https?:\/\/[^"]*"[^>]*>/g)]
    .map((m) => m[0])
    .filter(
      (tag) =>
        !/target="_blank"/.test(tag) || !/rel="[^"]*noopener/.test(tag) || !/rel="[^"]*noreferrer/.test(tag)
    );
  check('page external anchors use target=_blank + noopener + noreferrer', bad.length === 0, bad.join('\n        '));
}

/* 10. Editorial honesty: external summaries must name a source. */
{
  const bad = ARTICLES.filter((a) => {
    const kind = (a.body.match(/kind:\s*'([^']+)'/) || [])[1];
    const source = (a.body.match(/source:\s*'([^']+)'/) || [])[1];
    const hasUrl = /sourceUrl:\s*'https/.test(a.body);
    return kind === 'external-summary' && (!source || !hasUrl);
  });
  check('every external-summary article names a source with a link', bad.length === 0, bad.map(b=>b.id).join(', '));
}

/* 11. Dates are ISO and parseable. */
{
  const bad = [];
  for (const a of ARTICLES) {
    const d = (a.body.match(/date:\s*'([^']+)'/) || [])[1];
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(new Date(d).getTime())) bad.push(`${a.id}: ${d}`);
  }
  check('article dates are valid ISO yyyy-mm-dd', bad.length === 0, bad.join(', '));
}

/* 12. Exactly one H1 in the page source, and a sr-only loader label. */
{
  const h1 = (page.match(/<h1[\s>]/g) || []).length;
  check('page declares exactly one H1', h1 === 1, `found ${h1}`);
  const loader = readFileSync(join(root, 'app', 'performing-arts-philippines', 'loading.tsx'), 'utf8');
  check('loading state is labelled for assistive tech', /sr-only/.test(loader) && /aria-live/.test(loader));
  check('empty state exists in the explorer', /EmptyState/.test(explorer));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);