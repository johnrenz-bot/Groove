/**
 * Reports how many records each dataset category actually holds.
 *
 * A category with zero records is invisible in the UI until someone clicks a
 * card that targets it — at which point the explorer correctly shows its empty
 * state for a category the page itself advertised. This makes that obvious
 * before it ships.
 *
 * Run: node scripts/verify-category-coverage.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'features', 'performing-arts', 'data', 'content.ts'), 'utf8');

const js = src
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

const all = [...ARTICLES, ...ORGANIZATIONS, ...RESOURCES];
const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
for (const r of all) if (r.category in counts) counts[r.category]++;

console.log('\nDataset category coverage\n');
const empty = [];
for (const [id, n] of Object.entries(counts)) {
  if (n === 0) empty.push(id);
  console.log(`  ${n === 0 ? 'EMPTY' : ' ok  '}  ${id.padEnd(22)} ${n}`);
}

console.log(`\n${CATEGORIES.length - empty.length}/${CATEGORIES.length} categories have content.`);
if (empty.length) {
  console.log(`Empty: ${empty.join(', ')}`);
  process.exit(1);
}