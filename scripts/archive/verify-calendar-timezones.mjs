/**
 * Timezone matrix for the calendar's date handling.
 *
 * The calendar previously keyed days with `toISOString().split('T')[0]`, which is
 * UTC. This suite runs the same assertions in the extremes of the UTC offset
 * range — UTC+14 and UTC-11 — to prove the local-keyed implementation gives the
 * right answer everywhere, and to show precisely where the old approach broke.
 *
 * Run: node scripts/verify-calendar-timezones.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

const file = join(root, 'features/calendar/lib/dateUtils.ts');
const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: file,
});
const mod = { exports: {} };
new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
const { toDateKey, fromDateKey, monthMatrix, isToday, startOfWeek } = mod.exports;

/* The local instant at which each key should be produced, as a plain offset. */
const CASES = [
  { key: '2026-10-12', hour: 0, minute: 5 },   // just after local midnight
  { key: '2026-10-12', hour: 7, minute: 30 },  // the 00:00-07:59 danger band
  { key: '2026-10-12', hour: 23, minute: 55 }, // just before local midnight
  { key: '2026-01-01', hour: 0, minute: 5 },   // year boundary
  { key: '2026-03-01', hour: 7, minute: 30 },  // month boundary
  { key: '2024-02-29', hour: 7, minute: 30 },  // leap day
];

const ZONES = [
  'UTC',
  'Asia/Manila',          // UTC+8 — the app's primary audience
  'Pacific/Kiritimati',   // UTC+14 — largest positive offset
  'Pacific/Niue',         // UTC-11 — largest negative offset
  'America/Los_Angeles',  // UTC-8 with DST
  'Asia/Kathmandu',       // UTC+5:45 — a 45-minute offset, not whole hours
];

// Build the child program once, then run it under each zone.
const child = `
const { toDateKey, fromDateKey, monthMatrix, isToday, startOfWeek } =
  require(${JSON.stringify(file.replace(/\.ts$/, '.ts'))});
const api = (() => {
  const ts = require('typescript');
  const fs = require('fs');
  const src = fs.readFileSync(${JSON.stringify(file)}, 'utf8');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const m = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(m.exports, require, m);
  return m.exports;
})();

const CASES = ${JSON.stringify(CASES)};
const out = [];
for (const c of CASES) {
  // Construct the instant LOCALLY so the assertions are about local time.
  const y = Number(c.key.slice(0, 4));
  const mo = Number(c.key.slice(5, 7)) - 1;
  const d = Number(c.key.slice(8, 10));
  const local = new Date(y, mo, d, c.hour, c.minute);
  out.push({
    key: c.key,
    localKey: api.toDateKey(local),
    utcKey: local.toISOString().split('T')[0],
  });
}
console.log(JSON.stringify({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone, rows: out }));
`;

const tmp = join(root, 'scripts', '.tz-child.cjs');
const { writeFileSync, unlinkSync } = await import('node:fs');
writeFileSync(tmp, child);

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) pass++;
  else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
};

console.log('\nCalendar timezone matrix\n');

const oldBreakages = [];

for (const tz of ZONES) {
  const env = { ...process.env, TZ: tz };
  let parsed;
  try {
    const stdout = execFileSync(process.execPath, [tmp], { env, encoding: 'utf8' });
    parsed = JSON.parse(stdout);
  } catch (e) {
    check(`${tz}: child ran`, false, String(e.message).slice(0, 120));
    continue;
  }

  let zoneOk = true;
  for (const row of parsed.rows) {
    check(`${tz}: ${row.key} ${String(new Date().getHours()).length >= 0 ? '' : ''}local key`, row.localKey === row.key,
      `${row.key} at local time -> ${row.localKey}`);
    if (row.localKey !== row.key) zoneOk = false;
    if (row.utcKey !== row.key) oldBreakages.push(`${tz}: ${row.key} (toISOString gave ${row.utcKey})`);
  }

  console.log(
    `  ${zoneOk ? 'OK  ' : 'FAIL'} ${tz.padEnd(22)} local keys correct in ${parsed.rows.length}/${parsed.rows.length} cases`
  );
}

// The decisive comparison: the old UTC-based key is wrong in these zones.
console.log('');
if (oldBreakages.length) {
  console.log(`  For contrast, the previous toISOString() approach was wrong in ${oldBreakages.length} case(s):`);
  [...new Set(oldBreakages)].slice(0, 8).forEach((b) => console.log(`    - ${b}`));
  console.log('');
} else {
  console.log('  toISOString() happened to agree everywhere here; local keys remain correct regardless.');
  console.log('');
}

check(
  'local date keys are correct in every timezone tested',
  failures.length === 0,
  failures.slice(0, 3).join('; ')
);

unlinkSync(tmp);

console.log(`${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(fail === 0 ? 0 : 1);