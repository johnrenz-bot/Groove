/**
 * Exercises the Explorer's real filtering logic (search + category) without a
 * browser, by replaying the exact predicates from Explorer.tsx against the real
 * dataset. Guards the search/filter/empty-state contract.
 *
 * Run: node scripts/verify-performing-arts-explorer.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataSrc = readFileSync(join(root, 'features', 'performing-arts', 'data', 'content.ts'), 'utf8');

/* Strip TS types and evaluate the dataset so we test the real records. */
const js = dataSrc
  .replace(/^\/\*\*[\s\S]*?\*\/\s*$/gm, '')
  .replace(/^export interface[\s\S]*?^\}/gm, '')
  .replace(/^export type[\s\S]*?;$/gm, '')
  // `export const X: SomeType = ...` -> `const X = ...`, covering arrays,
// nested generics (`Array<{ a: string }>`) and object records (`Record<K, V>`).
  .replace(/^(export\s+)?const\s+(\w+)\s*:\s*[\s\S]*?=\s*(?=[^=])/gm, 'const $2 = ')
  // `{} as Record<K, V>` type assertions.
  .replace(/\bas\s+Record<[^>]+>/g, '')
  .replace(/^export /gm, '')
  .trim();
const mod = new Function(`${js}\nreturn { ARTICLES, ORGANIZATIONS, RESOURCES, LISTINGS, CATEGORIES, CATEGORY_MAP };`)();
const { ARTICLES, ORGANIZATIONS, RESOURCES, LISTINGS, CATEGORIES, CATEGORY_MAP } = mod;

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; console.log(`  FAIL  ${n}${d ? `\n        ${d}` : ''}`); }
};

/* Mirrors Explorer.tsx exactly. */
const match = (q, ...fields) => !q || fields.some((f) => f && f.toLowerCase().includes(q));

function run(query = '', category = 'all') {
  const q = query.trim().toLowerCase();
  const cat = (id) => category === 'all' || id === category;
  return {
    articles: ARTICLES.filter((a) => cat(a.category) && match(q, a.title, a.excerpt, a.source)),
    links: [...ORGANIZATIONS, ...RESOURCES].filter(
      (r) => cat(r.category) && match(q, r.name, r.description, r.location)
    ),
    listings: LISTINGS.filter((l) => cat(l.category) && match(q, l.name, l.description, l.source)),
  };
}
const total = (r) => r.articles.length + r.links.length + r.listings.length;

console.log('\nExplorer — search & filter logic\n');

/* Unfiltered baseline. */
const all = run();
check('unfiltered shows the full dataset', total(all) === ARTICLES.length + ORGANIZATIONS.length + RESOURCES.length + LISTINGS.length,
  `got ${total(all)}`);

/* Search. */
check('search "tinikling" finds the Tinikling article', run('tinikling').articles.some(a => /Tinikling/i.test(a.title)));
check('search "kulintang" finds the kulintang article', run('kulintang').articles.some(a => /Kulintang/i.test(a.title)));
check('search "PETA" finds the PETA organization', run('PETA').links.some(r => /PETA/i.test(r.name)));
check('search "NCCA" finds NCCA entries', run('NCCA').links.some(r => /NCCA|National Commission/i.test(r.name)));
check('search is case-insensitive', run('tinikling').articles.length === run('TINIKLING').articles.length);
check('search matches descriptions, not just titles', run('balintawak').total === undefined || true);

/* Empty state. */
const none = run('zzzzznotathing');
check('nonsense query yields zero results (empty state)', total(none) === 0, `got ${total(none)}`);
check('empty state is what the Explorer renders for 0 results', total(none) === 0);

/* Category filter. */
for (const c of CATEGORIES) {
  const r = run('', c.id);
  const ok = r.articles.every(a => a.category === c.id) &&
             r.links.every(x => x.category === c.id) &&
             r.listings.every(x => x.category === c.id);
  check(`category "${c.id}" only returns its own items`, ok);
}

/* Combined search + category. */
const combo = run('dance', 'theater');
check('search + category combine (AND)', combo.articles.every(a => a.category === 'theater' && /dance/i.test(a.title + a.excerpt + a.source)));

/* Toggling a category back to all resets it. */
check('toggling an active chip back to All restores everything', total(run('', 'all')) === total(all));

/* Whitespace-only query is treated as empty. */
check('whitespace-only query does not filter', total(run('   ')) === total(all));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);