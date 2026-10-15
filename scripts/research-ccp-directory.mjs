/**
 * Crawls the reachable CCP Performing Arts Directory to find an official,
 * reachable page for each resident company. The main culturalcenter.gov.ph
 * apex is not reachable from here, so a working directory page is preferable
 * where one exists.
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const BASE = 'https://artseducation.culturalcenter.gov.ph/ccpdirectory';

const strip = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const WANTED = [
  'Bayanihan',
  'Ramon Obusan',
  'Talisay',
  'Tanghalang Pilipino',
  'Philippine Philharmonic',
  'Ballet Philippines',
];

async function get(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    return { status: res.status, body: res.ok ? await res.text() : '' };
  } finally {
    clearTimeout(timer);
  }
}

// Breadth-first walk from the directory root, bounded to the group pages.
const queue = [BASE];
const seen = new Set();
const found = [];

while (queue.length && seen.size < 90) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);

  let status, body;
  try {
    ({ status, body } = await get(url));
  } catch {
    continue;
  }
  if (status !== 200) continue;

  const text = strip(body);
  const hit = WANTED.find((w) => text.includes(w));
  if (hit && /groups\//.test(url)) {
    found.push({ hit, url, snippet: text.slice(0, 110) });
  }

  for (const m of body.matchAll(/href="([^"]*ccpdirectory[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('/')) queue.push('https://artseducation.culturalcenter.gov.ph' + href);
    else if (href.startsWith('http')) queue.push(href);
    else queue.push(`${BASE}/${href}`);
  }
  // Breadth-first, but stop descending into irrelevant subtrees early.
  if (queue.length > 60) queue.length = 60;
}

console.log(`Crawled ${seen.size} directory pages\n`);
const unique = [...new Map(found.map((f) => [f.hit, f])).values()];
for (const f of unique) {
  console.log(`  ${f.hit}\n     ${f.url}\n     ${f.snippet}...\n`);
}
if (!unique.length) console.log('  (no matching group pages found)');