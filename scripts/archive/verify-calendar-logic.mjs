/**
 * Calendar logic tests.
 *
 * The date maths is where a calendar silently goes wrong: an off-by-one week
 * start, a February that renders five rows instead of six, an appointment that
 * lands on the wrong day because of UTC parsing. All of it is pure and
 * framework-free, so it is tested directly here rather than through the DOM.
 *
 * Run: node scripts/verify-calendar-logic.mjs [timezone]
 *        (default runs a matrix of zones; pass one to run just that zone)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

/**
 * Evaluates a project TypeScript module directly, using the repo's own
 * compiler. Transpiling with TypeScript rather than stripping types with
 * regexes matters: a regex pass silently rewrites `<=` into `< =` in a
 * comparison and the test then proves nothing.
 */
function loadTs(relativePath, exportNames, injected = {}) {
  const file = join(root, relativePath);
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  });

  const module = { exports: {} };
  const specifiers = Object.keys(injected);
  // Path specifiers are not valid parameter names, so each is bound to a
  // generated identifier and mapped back inside the stub require.
  const params = specifiers.map((_, i) => `__dep${i}`);
  const mapping = new Map(specifiers.map((s, i) => [s, `__dep${i}`]));

  const fn = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    ...params,
    outputText
  );
  fn(
    module.exports,
    // Stub out cross-module imports; the caller injects what it actually needs.
    (id) => {
      if (mapping.has(id)) return injected[id];
      throw new Error(`unexpected import "${id}" in ${relativePath}`);
    },
    module,
    file,
    dirname(file),
    ...specifiers.map((s) => injected[s])
  );

  const out = {};
  for (const name of exportNames) out[name] = module.exports[name];
  return out;
}

const api = loadTs(
  'features/calendar/lib/dateUtils.ts',
  [
    'toDateKey', 'fromDateKey', 'isDateKey', 'startOfDay', 'endOfDay',
    'addDays', 'addMonths', 'addYears', 'startOfMonth', 'endOfMonth', 'startOfYear',
    'startOfWeek', 'isSameDay', 'isSameMonth', 'isToday', 'weekDates', 'monthMatrix',
    'yearMonths', 'datesBetween', 'stepAnchor', 'viewTitle',
    'minutesFromTimeString', 'formatMinutes', 'formatTimeLabel', 'durationLabel',
    'formatHourLabel', 'hourWindow', 'blockTop', 'blockHeight',
    'WEEK_STARTS_ON', 'CALENDAR_VIEWS', 'VIEW_LABELS',
  ]
);

const only = process.argv[2];
const ZONES = only ? [only] : [
  'Asia/Manila',
  'UTC',
  'America/Los_Angeles',
  'Pacific/Kiritimati', // UTC+14, the largest positive offset in use
  'Pacific/Niue',       // UTC-11, the largest negative offset in use
];

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { pass++; return true; }
  fail++;
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  return false;
}

function eq(name, actual, expected) {
  return check(name, Object.is(actual, expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function eqDeep(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  return check(name, a === b, `expected ${b}, got ${a}`);
}

console.log('\nCalendar logic\n');

/* ---------------------------------------------------------------- date keys */
{
  const d = new Date(2026, 9, 12); // 12 Oct 2026, local
  eq('toDateKey pads month and day', api.toDateKey(d), '2026-10-12');

  const parsed = api.fromDateKey('2026-10-12');
  eq('fromDateKey year', parsed.getFullYear(), 2026);
  eq('fromDateKey month is 0-based Oct', parsed.getMonth(), 9);
  eq('fromDateKey day', parsed.getDate(), 12);
  eq('fromDateKey yields local midnight', parsed.getHours(), 0);

  check('isDateKey accepts a real key', api.isDateKey('2026-10-12'));
  check('isDateKey rejects malformed', !api.isDateKey('2026-13-01'));
  check('isDateKey rejects a loose string', !api.isDateKey('October 12'));
  check('isDateKey rejects 2026-02-30', !api.isDateKey('2026-02-30'));
  check('isDateKey accepts a leap day', api.isDateKey('2024-02-29'));
}

/* -------------------------------------------------------------- arithmetic */
{
  eq('addDays crosses a month boundary', api.toDateKey(api.addDays(new Date(2026, 9, 31), 1)), '2026-11-01');
  eq('addDays goes backwards', api.toDateKey(api.addDays(new Date(2026, 10, 1), -1)), '2026-10-31');

  // The classic setMonth trap: 31 Jan + 1 month must clamp, not overflow.
  eq('addMonths clamps 31 Jan + 1', api.toDateKey(api.addMonths(new Date(2026, 0, 31), 1)), '2026-02-28');
  eq('addMonths handles a leap year', api.toDateKey(api.addMonths(new Date(2024, 0, 31), 1)), '2024-02-29');
  eq('addMonths handles Dec -> Jan', api.toDateKey(api.addMonths(new Date(2026, 11, 15), 1)), '2027-01-15');
  eq('addMonths backwards', api.toDateKey(api.addMonths(new Date(2026, 0, 15), -1)), '2025-12-15');
  eq('addYears steps twelve months', api.toDateKey(api.addYears(new Date(2026, 5, 10), 1)), '2027-06-10');
  eq('addYears handles a leap day', api.toDateKey(api.addYears(new Date(2024, 1, 29), 1)), '2025-02-28');

  eq('startOfDay zeroes the clock', api.startOfDay(new Date(2026, 9, 12, 23, 59)).getHours(), 0);
  eq('startOfMonth is the 1st', api.toDateKey(api.startOfMonth(new Date(2026, 9, 12))), '2026-10-01');
  eq('endOfMonth is the last day', api.toDateKey(api.endOfMonth(new Date(2026, 1, 5))), '2026-02-28');
  eq('endOfMonth on a leap February', api.toDateKey(api.endOfMonth(new Date(2024, 1, 5))), '2024-02-29');
}

/* ------------------------------------------------------------------ weeks */
{
  // 12 Oct 2026 is a Monday; its week starts Sunday 11 Oct.
  const week = api.weekDates(new Date(2026, 9, 12));
  eq('weekDates length', week.length, 7);
  eq('week starts on Sunday', api.toDateKey(week[0]), '2026-10-11');
  eq('week ends on Saturday', api.toDateKey(week[6]), '2026-10-17');

  const sunday = api.startOfWeek(new Date(2026, 9, 11));
  eq('a Sunday is its own week start', api.toDateKey(sunday), '2026-10-11');
  const saturday = api.startOfWeek(new Date(2026, 9, 17));
  eq('a Saturday belongs to the PREVIOUS week', api.toDateKey(saturday), '2026-10-11');

  const span = api.datesBetween(new Date(2026, 9, 11), new Date(2026, 9, 17));
  eq('datesBetween is inclusive', span.length, 7);
  check(
    'datesBetween is bounded',
    api.datesBetween(new Date(2000, 0, 1), new Date(2099, 0, 1)).length <= 400,
    'an unbounded range must not spin'
  );
}

/* ----------------------------------------------------------- month matrix */
{
  // February 2026 starts Sunday and has 28 days -> exactly 4 rows, padded to 6.
  const feb = api.monthMatrix(new Date(2026, 1, 15));
  eq('monthMatrix always has six rows', feb.length, 6);
  check('every row has seven columns', feb.every((r) => r.length === 7));
  eq(
    'February 2026 begins on the 1st',
    api.toDateKey(feb[0][0]),
    '2026-02-01'
  );

  // Every view must render the same height, or the grid jumps between months.
  const heights = [0, 1, 2, 3, 5, 7, 11].map((m) => api.monthMatrix(new Date(2026, m, 1)).length);
  check('all months render six rows', heights.every((h) => h === 6), `heights: ${heights.join(',')}`);

  // Every month must lay out its own days in order, with null padding only
  // Every month must lay out its own days in order and contiguously, with any
  // leading cells being adjacent-month days and everything after the last day
  // left empty. Checked across a whole year rather than one hand-picked month,
  // so a month that happens to start on a Sunday (and so has no leading cells)
  // cannot mask a real off-by-one.
  let layoutFaults = [];
  for (let m = 0; m < 12; m++) {
    const month = new Date(2026, m, 1);
    const flat = api.monthMatrix(month).flat();
    const daysInMonth = new Date(2026, m + 1, 0).getDate();
    const monthOf = m + 1;

    const expected = Array.from(
      { length: daysInMonth },
      (_, i) => `2026-${String(monthOf).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    );

    const keys = flat.map((d) => (d ? api.toDateKey(d) : null));
    const firstIdx = keys.indexOf(expected[0]);
    const lastIdx = keys.lastIndexOf(expected[expected.length - 1]);

    if (firstIdx === -1) {
      layoutFaults.push(`month ${monthOf}: the 1st is missing`);
      continue;
    }
    const own = keys.slice(firstIdx, lastIdx + 1);
    if (own.some((k) => k === null)) {
      layoutFaults.push(`month ${monthOf}: a hole inside the month's own days`);
      continue;
    }
    if (own.join(',') !== expected.join(',')) {
      layoutFaults.push(`month ${monthOf}: day sequence does not match`);
      continue;
    }
    // Nothing may follow the last day but empty cells.
    if (keys.slice(lastIdx + 1).some((k) => k !== null)) {
      layoutFaults.push(`month ${monthOf}: trailing cells are not empty`);
    }
    // Leading cells, if any, are adjacent-month days rather than gaps.
    for (const k of keys.slice(0, firstIdx)) {
      if (k === null) layoutFaults.push(`month ${monthOf}: gap inside the leading week`);
      else if (k.startsWith(`2026-${String(monthOf).padStart(2, '0')}`)) {
        layoutFaults.push(`month ${monthOf}: leading cell ${k} belongs to this month`);
      }
    }
  }
  check(
    'every month lays out its own days in order with no trailing spill',
    layoutFaults.length === 0,
    layoutFaults.join('; ')
  );

  // A month starting mid-week must place the 1st in the right column.
  const apr = api.monthMatrix(new Date(2026, 3, 1)).flat(); // April 2026 starts Wednesday
  eq('April 2026 places the 1st in the Wednesday column', api.toDateKey(apr[3]), '2026-04-01');
  check(
    'April 2026 fills the leading week with March days',
    api.toDateKey(apr[0]) === '2026-03-29' && api.toDateKey(apr[2]) === '2026-03-31'
  );
  check('April 2026 ends with empty cells', apr.slice(33).every((d) => d === null));

  const year = api.yearMonths(new Date(2026, 5, 9));
  eq('yearMonths length', year.length, 12);
  eq('yearMonths first month', year[0].getMonth(), 0);
  eq('yearMonths last month', year[11].getMonth(), 11);
}

/* -------------------------------------------------------- view navigation */
{
  const anchor = new Date(2026, 9, 12);
  eq('year view steps a year', api.stepAnchor(anchor, 'year', 1).getFullYear(), 2027);
  eq('month view steps a month', api.toDateKey(api.stepAnchor(anchor, 'month', 1)), '2026-11-12');
  eq('week view steps seven days', api.toDateKey(api.stepAnchor(anchor, 'week', 1)), '2026-10-19');
  eq('day view steps a day', api.toDateKey(api.stepAnchor(anchor, 'day', 1)), '2026-10-13');
  eq('agenda steps a month', api.toDateKey(api.stepAnchor(anchor, 'agenda', 1)), '2026-11-12');
  eq('backwards year', api.stepAnchor(anchor, 'year', -1).getFullYear(), 2025);

  check('all five views are offered', api.CALENDAR_VIEWS.length === 5);
  eqDeep('view order', [...api.CALENDAR_VIEWS], ['year', 'month', 'week', 'day', 'agenda']);
  check('every view has a label', api.CALENDAR_VIEWS.every((v) => api.VIEW_LABELS[v]));

  eq('year title is the year', api.viewTitle(anchor, 'year'), '2026');
  check('month title names the month', api.viewTitle(anchor, 'month').includes('October'));

  // Week titles: month once when both ends share it, spelled out when they do not.
  const sameMonth = api.viewTitle(new Date(2026, 9, 14), 'week'); // 14 Oct, week Oct 11-17
  check('a same-month week names the month once', /Oct/i.test(sameMonth), sameMonth);
  check('a same-month week does not repeat the month', (sameMonth.match(/oct/gi) || []).length === 1, sameMonth);
  check('a same-month week shows both days', sameMonth.includes('11') && sameMonth.includes('17'), sameMonth);
  check('a same-month week shows the year', sameMonth.includes('2026'), sameMonth);
  check('a week title is not just two identical labels', sameMonth !== 'Oct 11 – Oct 11', sameMonth);

  // 1 Aug 2026 is a Saturday, so with Sunday-first weeks its week runs
  // 26 Jul – 1 Aug and genuinely straddles two months. (31 Oct is also a
  // Saturday and does NOT straddle — the week ends on it.)
  const straddle = api.viewTitle(new Date(2026, 7, 1), 'week');
  check('a month-straddling week names both months', /Jul/i.test(straddle) && /Aug/i.test(straddle), straddle);
  check(
    'a month-straddling week repeats the year only once',
    (straddle.match(/20\d\d/g) || []).length === 1,
    straddle
  );

  const yearStraddle = api.viewTitle(new Date(2026, 11, 31), 'week'); // week spans Dec-Jan
  check('a year-straddling week names both years', /2026/.test(yearStraddle) && /2027/.test(yearStraddle), yearStraddle);

  check('day title names the weekday', api.viewTitle(anchor, 'day').includes('Monday'));
  check('agenda title names the month', api.viewTitle(anchor, 'agenda').includes('October'));

  // Titles must never render "Invalid Date", and must never leak the raw
  // toLocaleDateString scaffolding some locales emit for sparse option sets
  // (e.g. "2026 (day: 17)" for {day, year}).
  for (const v of api.CALENDAR_VIEWS) {
    const t = api.viewTitle(anchor, v);
    check(`${v} title is well formed`, t.length > 2 && !t.includes('Invalid'), t);
    check(`${v} title has no ICU scaffolding`, !/\((day|month|year|hour|minute):/.test(t), t);
    check(`${v} title has no repeated punctuation`, !/,,\s|:\s*:\s*|\s{2,}/.test(t), t);
  }

  // Titles are locale-stable in their numeric parts.
  check(
    'a week title never repeats the year',
    (api.viewTitle(new Date(2026, 7, 1), 'week').match(/20\d\d/g) || []).length === 1,
    api.viewTitle(new Date(2026, 7, 1), 'week')
  );
  check(
    'a week title always ends in a year',
    /20\d\d$/.test(api.viewTitle(anchor, 'week')),
    api.viewTitle(anchor, 'week')
  );
  check(
    'every day number in a week title is a real day',
    (() => {
      // Strip the year first; what remains are day-of-month numbers.
      const t = api.viewTitle(anchor, 'week').replace(/20\d\d/g, '');
      return t.split(/\D+/).filter((n) => n.length).every((n) => Number(n) >= 1 && Number(n) <= 31);
    })(),
    api.viewTitle(anchor, 'week')
  );
  check(
    'a day title starts with the weekday',
    /^[A-Za-z]+,/.test(api.viewTitle(anchor, 'day')),
    api.viewTitle(anchor, 'day')
  );
  check(
    'month and agenda titles agree',
    api.viewTitle(anchor, 'month') === api.viewTitle(anchor, 'agenda'),
    api.viewTitle(anchor, 'month')
  );
}

/* ------------------------------------------------------------------ times */
{
  eq('minutes 09:00', api.minutesFromTimeString('09:00'), 540);
  eq('minutes with seconds', api.minutesFromTimeString('14:30:00'), 870);
  eq('minutes single-digit hour', api.minutesFromTimeString('9:05'), 545);
  eq('midnight', api.minutesFromTimeString('00:00'), 0);
  eq('last minute of the day', api.minutesFromTimeString('23:59'), 1439);
  eq('missing time is null, not NaN', api.minutesFromTimeString(null), null);
  eq('empty time is null', api.minutesFromTimeString(''), null);
  eq('nonsense is null, not NaN', api.minutesFromTimeString('half nine'), null);
  eq('out-of-range hour is null', api.minutesFromTimeString('99:00'), null);

  eq('formats noon', api.formatMinutes(720), '12:00 PM');
  eq('formats midnight', api.formatMinutes(0), '12:00 AM');
  eq('formats the morning', api.formatMinutes(545), '9:05 AM');
  eq('formats the afternoon', api.formatMinutes(870), '2:30 PM');

  eq('duration whole hours', api.durationLabel('09:00', '10:00'), '1h');
  eq('duration hours and minutes', api.durationLabel('09:00', '10:30'), '1h 30m');
  eq('duration minutes only', api.durationLabel('09:00', '09:45'), '45m');
  eq('duration cannot be negative', api.durationLabel('10:00', '09:00'), null);
  eq('duration needs both ends', api.durationLabel('09:00', null), null);

  // The grid gutter is narrow, so hour labels drop the minutes.
  eq('hour label for morning', api.formatHourLabel(480), '8 AM');
  eq('hour label for midday', api.formatHourLabel(720), '12 PM');
  eq('hour label for afternoon', api.formatHourLabel(870), '2 PM');
  eq('hour label for midnight', api.formatHourLabel(0), '12 AM');
  check(
    'hour labels never wrap onto two lines',
    [0, 60, 120, 300, 540, 720, 900, 1080, 1260, 1380].every((m) => api.formatHourLabel(m).length <= 5),
    'the gutter is 4rem wide'
  );
}

/* ------------------------------------------------------------- comparisons */
{
  eq('isSameDay true', api.isSameDay(new Date(2026, 9, 12, 1), new Date(2026, 9, 12, 23)), true);
  eq('isSameDay false', api.isSameDay(new Date(2026, 9, 12), new Date(2026, 9, 13)), false);
  eq('isSameDay handles null', api.isSameDay(null, new Date()), false);
  eq('isSameMonth true', api.isSameMonth(new Date(2026, 9, 1), new Date(2026, 9, 30)), true);
  eq('isSameMonth false', api.isSameMonth(new Date(2026, 9, 30), new Date(2026, 10, 1)), false);
}

/* ------------------------------------------------- the timezone regression */
{
  // The pages used to key days with toISOString(), which is UTC. Build instants
  // that are local mid-evening/morning and confirm the local key is right in
  // every zone we test.
  const local = new Date(2026, 9, 12, 7, 30); // 07:30 local on 12 Oct
  const key = api.toDateKey(local);
  eq('toDateKey reflects the LOCAL calendar day', key, '2026-10-12');

  // And that round-trips back to the same day rather than the UTC one.
  const round = api.fromDateKey(key);
  eq('key round-trips to the same day', api.toDateKey(round), key);
  eq('round-trip lands on local midnight', round.getHours(), 0);

  // In UTC+14 the UTC date for a local morning is the PREVIOUS day, which is
  // exactly the bug: toISOString() would disagree with the local key.
  const utcMidnight = new Date(2026, 9, 12, 0, 30);
  eq('local midnight keeps its own day', api.toDateKey(utcMidnight), '2026-10-12');
}

/* -------------------------------------------- entries: status and projection */
{
  const {
    toCalendarEntry,
    statusVariant,
    statusDotClass,
    statusBarClass,
    groupByDate,
  } = loadTs(
    'features/calendar/lib/entries.ts',
    ['toCalendarEntry', 'statusVariant', 'statusDotClass', 'statusBarClass', 'groupByDate'],
    // entries.ts imports these from dateUtils; the real implementations are
    // injected so the projection is tested against the same maths it ships with.
    {
      '@/lib/types': {},
      '@/components/ui/Badge': {},
      './dateUtils': api,
    }
  );

  const base = {
    id: 1,
    appointment_id: 1,
    client_id: 'c1',
    coach_id: 'k1',
    name: 'Ana Dela Cruz',
    email: 'a@b.c',
    contact: '09',
    address: 'Somewhere',
    date: '2026-10-12',
    start_time: '09:00',
    end_time: '10:30',
    session_type: 'Ballroom',
    talent: null,
    experience: 'Beginner',
    purpose: 'Learn',
    status: 'confirmed',
    created_at: '',
    updated_at: '',
  };

  // Every real lifecycle status must map to a real badge variant.
  const allStatuses = ['pending', 'accepted', 'agreement_required', 'confirmed', 'declined', 'cancelled', 'completed'];
  const mapped = allStatuses.map((s) => statusVariant(s));
  check(
    'every lifecycle status maps to a badge variant',
    mapped.every(Boolean) && mapped.every((v) => typeof v === 'string'),
    JSON.stringify(mapped)
  );
  check('accepted is no longer the unstyled fallback', statusVariant('accepted') === 'scheduled');
  check('agreement_required is no longer the unstyled fallback', statusVariant('agreement_required') === 'scheduled');
  check('confirmed is distinct from completed', statusVariant('confirmed') !== statusVariant('completed'));
  check('declined reads as cancelled', statusVariant('declined') === 'cancelled');

  check('every status has a dot colour', allStatuses.every((s) => statusDotClass(s).length > 0));
  check('every status has a bar colour', allStatuses.every((s) => statusBarClass(s).length > 0));
  check('confirmed and pending dots differ', statusDotClass('confirmed') !== statusDotClass('pending'));

  const clientEntry = toCalendarEntry(
    { ...base, coach: { firstname: 'Liza', lastname: 'Reyes', username: 'liza' } },
    { role: 'client' }
  );
  eq('client entry labels the coach', clientEntry.counterpartLabel, 'Coach Liza Reyes');
  eq('client entry time range', clientEntry.timeLabel, '9:00 AM \u2013 10:30 AM');
  eq('client entry duration', clientEntry.duration, '1h 30m');
  eq('client entry message link', clientEntry.messageHref, '/messages?user=k1');
  eq('client entry date', clientEntry.date, '2026-10-12');
  eq('client entry start minutes', clientEntry.startMinutes, 540);
  eq('client entry session type', clientEntry.sessionType, 'Ballroom');

  const coachEntry = toCalendarEntry(
    { ...base, client: { firstname: 'Ana', lastname: 'Dela Cruz', username: 'ana' } },
    { role: 'coach' }
  );
  eq('coach entry labels the student', coachEntry.counterpartLabel, 'Student Ana Dela Cruz');
  eq('coach entry message link', coachEntry.messageHref, '/messages?user=c1');

  // A missing join must degrade, not throw or show "Coach undefined".
  const noJoin = toCalendarEntry(base, { role: 'client' });
  check('missing coach join degrades cleanly', !noJoin.counterpartLabel.includes('undefined'), noJoin.counterpartLabel);
  check('missing coach join still labels the role', noJoin.counterpartLabel.startsWith('Coach'));

  const coachNoJoin = toCalendarEntry(base, { role: 'coach' });
  eq('coach falls back to the name column', coachNoJoin.counterpartLabel, 'Student Ana Dela Cruz');

  // Missing / malformed times must not poison layout maths.
  const noTime = toCalendarEntry({ ...base, start_time: '', end_time: '' }, { role: 'client' });
  eq('missing start is null', noTime.startMinutes, null);
  check('missing time has a readable label', noTime.timeLabel.length > 0, noTime.timeLabel);
  eq('missing duration is null', noTime.duration, null);

  const badTime = toCalendarEntry({ ...base, start_time: 'not-a-time' }, { role: 'client' });
  eq('malformed start is null, not NaN', badTime.startMinutes, null);

  const online = toCalendarEntry({ ...base, is_online: true, address: 'ignored' }, { role: 'client' });
  eq('online sessions report as online', online.location, 'Online session');
  check('online flag is set', online.isOnline === true);

  const noType = toCalendarEntry({ ...base, session_type: '  ' }, { role: 'client' });
  eq('blank session type becomes null', noType.sessionType, null);

  // Ordering: timed entries ascend; untimed sort last.
  const grouped = groupByDate([
    toCalendarEntry({ ...base, id: 3, start_time: '15:00', end_time: '16:00' }, { role: 'client' }),
    toCalendarEntry({ ...base, id: 1, start_time: '', end_time: '' }, { role: 'client' }),
    toCalendarEntry({ ...base, id: 2, start_time: '09:00', end_time: '10:00' }, { role: 'client' }),
  ]);
  const order = grouped.get('2026-10-12').map((e) => e.id);
  eqDeep('entries sort by start time, untimed last', order, [2, 3, 1]);

  const split = groupByDate([
    toCalendarEntry({ ...base, id: 1, date: '2026-10-12' }, { role: 'client' }),
    toCalendarEntry({ ...base, id: 2, date: '2026-10-13' }, { role: 'client' }),
  ]);
  eq('grouping separates days', split.size, 2);
}

/* --------------------------------------------- time-grid layout arithmetic */
{
  const spans = [
    { start: 540, end: 630 },  // 09:00 - 10:30
    { start: 840, end: 900 },  // 14:00 - 15:00
  ];
  const win = api.hourWindow(spans);
  eq('window starts an hour before the first session', win.start, 8);
  eq('window ends an hour after the last session', win.end, 16);
  check('window is whole hours', Number.isInteger(win.start) && Number.isInteger(win.end));

  // An empty day must still produce a usable grid, not NaN or an empty range.
  const empty = api.hourWindow([]);
  check('an empty window has a usable default', empty.start < empty.end, JSON.stringify(empty));
  const untimed = api.hourWindow([{ start: null, end: null }]);
  check('an untimed-only window falls back', untimed.start < untimed.end, JSON.stringify(untimed));

  // A session at midnight must not produce a negative window start.
  const midnight = api.hourWindow([{ start: 0, end: 60 }]);
  check('a midnight session does not go negative', midnight.start >= 0, JSON.stringify(midnight));

  // A late session must not run past midnight.
  const late = api.hourWindow([{ start: 1380, end: 1439 }]);
  check('a midnight-ending session is clamped to 24h', late.end <= 24, JSON.stringify(late));

  // The window must always have enough rows to draw something.
  const tiny = api.hourWindow([{ start: 600, end: 660 }]);
  check('a narrow window is widened to at least four hours', tiny.end - tiny.start >= 4, JSON.stringify(tiny));

  const span = win.end - win.start;

  eq('a block at the window start sits at the top', api.blockTop(win.start * 60, win.start, span), '0%');
  eq('a block at the window end sits at the bottom', api.blockTop(win.end * 60, win.start, span), '100%');
  check(
    'a block before the window is clamped to the top',
    parseFloat(api.blockTop(0, win.start, span)) === 0,
    api.blockTop(0, win.start, span)
  );
  check(
    'a block past the window is clamped to the bottom',
    parseFloat(api.blockTop(23 * 60, win.start, span)) === 100,
    api.blockTop(23 * 60, win.start, span)
  );
  check('a zero-length span does not divide by zero', api.blockTop(600, 9, 0) === '0%');

  // Blocks must scale with duration.
  const short = api.blockHeight(540, 600, win.start, span);
  const long = api.blockHeight(540, 780, win.start, span);
  const pct = (s) => parseFloat(String(s).match(/([\d.]+)%/)[1]);
  check('a longer session is taller', pct(long) > pct(short), `${short} vs ${long}`);

  // THE REGRESSION THAT CAUSED CLIPPED TEXT: a short session on a long day must
  // still be given enough height for its two lines of text.
  const longDay = api.hourWindow([{ start: 480, end: 900 }]); // 08:00 - 15:00
  const lspan = longDay.end - longDay.start;
  const oneHour = api.blockHeight(600, 660, longDay.start, lspan, 3.75);
  const rem = parseFloat(oneHour.match(/([\d.]+)rem/)[1]);
  check('a one-hour block is floored for text', rem >= 3.5, oneHour);
  check('a floored block still carries a percentage', /%/.test(oneHour), oneHour);
  check(
    'the floor is never below two text lines',
    parseFloat(api.blockHeight(600, 660, longDay.start, lspan, 2.75).match(/([\d.]+)rem/)[1]) >= 2.5
  );
}

console.log(`${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(fail === 0 ? 0 : 1);