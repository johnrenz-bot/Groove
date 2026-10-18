/**
 * Replays the redesigned hub's search + category filter against the real
 * dataset, using the same predicates as <PerformingArtsHub>. Verifies the
 * interactive contract without depending on a browser (the search box sits far
 * below the a11y snapshot's truncation limit, so DOM-driving it is unreliable).
 *
 * Run: node scripts/verify-hub-search.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataSrc = readFileSync(join(root, 'features', 'performing-arts', 'data', 'content.ts'), 'utf8');
const hubSrc = readFileSync(
  join(root, 'features', 'performing-arts', 'components', 'PerformingArtsHub.tsx'),
  'utf8'
);

const js = dataSrc
  .replace(/^\/\*\*[\s\S]*?\*\/\s*$/gm, '')
  .replace(/^export interface[\s\S]*?^\}/gm, '')
  .replace(/^export type[\s\S]*?;$/gm, '')
  .replace(/^(export\s+)?const\s+(\w+)\s*:\s*[\s\S]*?=\s*(?=[^=])/gm, 'const $2 = ')
  .replace(/\bas\s+Record<[^>]+>/g, '')
  .replace(/^export /gm, '')
  .trim();
const { ARTICLES, ORGANIZATIONS, RESOURCES, CATEGORIES } = new Function(
  `${js}\nreturn { ARTICLES, ORGANIZATIONS, RESOURCES, CATEGORIES };`
)();

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; console.log(`  FAIL  ${n}${d ? `\n        ${d}` : ''}`); }
};

/** Identical predicates to the Explorer inside PerformingArtsHub. */
function run(query = '', category = 'all') {
  const trimmed = query.trim().toLowerCase();
  const match = (...f) => !trimmed || f.some((x) => x && x.toLowerCase().includes(trimmed));
  const inCat = (id) => category === 'all' || id === category;
  return {
    articles: ARTICLES.filter((a) => inCat(a.category) && match(a.title, a.excerpt, a.source)),
    orgs: ORGANIZATIONS.filter((o) => inCat(o.category) && match(o.name, o.description, o.location)),
    resources: RESOURCES.filter((r) => inCat(r.category) && match(r.name, r.description, r.location)),
  };
}
const total = (r) => r.articles.length + r.orgs.length + r.resources.length;

console.log('\nHub search & filter — behaviour against the real dataset\n');

const all = run();
check(
  'unfiltered shows everything the page links',
  total(all) === ARTICLES.length + ORGANIZATIONS.length + RESOURCES.length,
  `${total(all)} vs ${ARTICLES.length + ORGANIZATIONS.length + RESOURCES.length}`
);

for (const q of ['tinikling', 'kulintang', 'PETA', 'NCCA', 'CCP', 'singkil', 'lumad']) {
  check(`search "${q}" returns results`, total(run(q)) > 0);
}

check('search is case-insensitive', total(run('TINIKLING')) === total(run('tinikling')));
check('nonsense query yields zero results (empty state)', total(run('zzzqqqxxx')) === 0);
check('whitespace-only query does not filter', total(run('   ')) === total(all));

for (const c of CATEGORIES) {
  const r = run('', c.id);
  const clean =
    r.articles.every((a) => a.category === c.id) &&
    r.orgs.every((o) => o.category === c.id) &&
    r.resources.every((x) => x.category === c.id);
  check(`category "${c.id}" filters to its own items`, clean);
}

const combo = run('dance', 'theater');
check(
  'search + category combine with AND',
  combo.articles.every((a) => a.category === 'theater')
);

// The six editorial cards must dispatch to a REAL dataset category, or clicking
// one would filter to nothing.
const editorialSrc = readFileSync(join(root, 'features', 'performing-arts', 'data', 'editorial.ts'), 'utf8');
const targets = [...editorialSrc.matchAll(/target:\s*'([^']+)'/g)].map((m) => m[1]);
const categoryIds = new Set(CATEGORIES.map((c) => c.id));
check(
  'all six editorial cards target a real category',
  targets.length === 6 && targets.every((t) => categoryIds.has(t)),
  `targets: ${targets.join(', ')}`
);
for (const t of targets) {
  check(`editorial card "${t}" has results to filter to`, total(run('', t)) > 0);
}

// Search + filter controls must actually exist in the rendered component.
check('hub renders the search input', /id="hub-search"/.test(hubSrc));
check('hub renders filter chips with pressed state', /aria-pressed=\{active\}/.test(hubSrc));
check('hub renders the empty state', /EmptyState/.test(hubSrc));
check('hub announces result count', /aria-live="polite"/.test(hubSrc));
check('reset clears both query and category', /setQuery\(''\)/.test(hubSrc) && /setCategory\('all'\)/.test(hubSrc));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);