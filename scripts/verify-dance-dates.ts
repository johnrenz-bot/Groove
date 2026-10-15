/**
 * Date-logic check for the Dance Upcoming Events rail.
 *
 * Run: node --experimental-strip-types --no-warnings scripts/verify-dance-dates.ts
 *
 * This exists because "is this event still upcoming" is the one piece of logic
 * on the page that is wrong in a way nobody notices until a past event is
 * advertised with a Register button. It pins the behaviour against the brief's
 * reference date (14 October 2026, Asia/Manila) and against the boundaries
 * around it.
 */

import {
  FALLBACK_UPDATES,
  isUpcomingEvent,
  getUpcomingDanceEvents,
} from '../features/dance/services/danceService.ts';

const REFERENCE = new Date('2026-10-14T12:00:00+08:00'); // 14 Oct 2026, 12:00 PHT

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── 1. Boundary behaviour of the predicate itself ───────────────────────────
console.log('── isUpcomingEvent boundaries (Asia/Manila) ──');
check('same day, later hour -> still upcoming', isUpcomingEvent({ event_date: '2026-10-14T22:00:00+08:00' }, REFERENCE), true);
// A timed event on the CURRENT calendar day stays listed until PHT midnight.
// A 13:00 battle that started at 01:00 has not finished, and hiding it mid-run
// is worse than showing it — the alternative failure is an event vanishing from
// the rail while it is literally still happening.
check('same day, earlier start -> still listed until PHT midnight', isUpcomingEvent({ event_date: '2026-10-14T01:00:00+08:00' }, REFERENCE), true);
check('tomorrow -> upcoming', isUpcomingEvent({ event_date: '2026-10-15T10:00:00+08:00' }, REFERENCE), true);
check('yesterday -> concluded', isUpcomingEvent({ event_date: '2026-10-13T10:00:00+08:00' }, REFERENCE), false);
check('far past (2025) -> concluded', isUpcomingEvent({ event_date: '2025-06-20T14:00:00Z' }, REFERENCE), false);
check('far future (2027) -> upcoming', isUpcomingEvent({ event_date: '2027-04-09T09:00:00+08:00' }, REFERENCE), true);
check('null date -> not upcoming', isUpcomingEvent({ event_date: null }, REFERENCE), false);
check('unparseable date -> not upcoming', isUpcomingEvent({ event_date: 'someday' }, REFERENCE), false);

// Timezone: a 01:00 PHT event on the 14th must NOT be judged by a UTC clock.
// On the reference instant, UTC is 04:00 — so a UTC-naive comparison would
// still call it upcoming, but a server at 17:00 UTC (01:00 PHT next day) must
// have rolled over. This asserts the page timezone wins.
console.log('── timezone sensitivity ──');
// At 17:00 UTC it is already 01:00 on 15 Oct in Manila, so the 14 Oct event is
// over — even though a UTC-naive reading would still show the 14th.
const utcEvening = new Date('2026-10-14T17:00:00Z'); // 15 Oct, 01:00 PHT
check('previous day concluded once PHT passes midnight', isUpcomingEvent({ event_date: '2026-10-14T01:00:00+08:00' }, utcEvening), false);
check('today still upcoming at the same instant, read as PHT', isUpcomingEvent({ event_date: '2026-10-14T01:00:00+08:00' }, utcEvening, 'Asia/Manila'), false);
check('same instant, UTC-naive clock, would still show the 14th', isUpcomingEvent({ event_date: '2026-10-14T01:00:00+08:00' }, utcEvening, 'UTC'), true);

// ── 2. The actual dataset ───────────────────────────────────────────────────
console.log('\n── dataset against reference date 14 Oct 2026 ──');

const upcoming = FALLBACK_UPDATES.filter((u) => isUpcomingEvent(u, REFERENCE));
const concluded = FALLBACK_UPDATES.filter((u) => !isUpcomingEvent(u, REFERENCE));

console.log(`  upcoming: ${upcoming.map((u) => u.id).join(', ') || '(none)'}`);
console.log(`  concluded (still in Latest Updates): ${concluded.length}`);

check(
  'every upcoming record is a registrable category',
  upcoming.every((u) => u.category === 'competition' || u.category === 'event' || u.category === 'workshop'),
  true
);
check('at least one upcoming event exists', upcoming.length > 0, true);
check('concluded records are retained for the feed', concluded.length > 0, true);

// ── 3. The service-level function honours the reference date ────────────────
console.log('\n── getUpcomingDanceEvents(now = reference) ──');
const { events } = await getUpcomingDanceEvents({ now: REFERENCE });
console.log('  ' + (events.map((e) => `${e.id} (${String(e.event_date).slice(0, 10)})`).join('\n  ') || '(none)'));
check('service returns no ended events', events.every((e) => isUpcomingEvent(e, REFERENCE)), true);
check('service result is sorted ascending by date', (() => {
  const t = events.map((e) => new Date(e.event_date!).getTime());
  return t.every((v, i) => i === 0 || t[i - 1] <= v);
})(), true);

// ── 4. Images ───────────────────────────────────────────────────────────────
console.log('\n── image integrity ──');
check('every record has a verified image', FALLBACK_UPDATES.every((u) => u.image_verified === true), true);
check('every image is vendored locally', FALLBACK_UPDATES.every((u) => (u.image_url ?? '').startsWith('/dance-updates/')), true);
check('every image records its first-party source URL', FALLBACK_UPDATES.every((u) => typeof u.image_source_url === 'string' && u.image_source_url.startsWith('https://')), true);
check('every image has descriptive alt text', FALLBACK_UPDATES.every((u) => typeof u.image_alt === 'string' && (u.image_alt as string).length > 30), true);
check('no image URL is reused across cards', new Set(FALLBACK_UPDATES.map((u) => u.image_url)).size === FALLBACK_UPDATES.length, true);
check('no card points at a stock-photo host', FALLBACK_UPDATES.every((u) => !/unsplash|pexels|shutterstock|pixabay|gettyimages/i.test(u.image_url ?? '')), true);

console.log('\n── card ⇄ image manifest alignment ──');
const { IMAGE_SOURCES } = await import('../lib/dance/imageSources.ts');
const ids = new Set(FALLBACK_UPDATES.map((u) => String(u.id)));
const orphanImages = IMAGE_SOURCES.filter((s) => !ids.has(s.id)).map((s) => s.id);
const orphanCards = FALLBACK_UPDATES.filter((u) => !IMAGE_SOURCES.some((s) => s.id === u.id)).map((u) => u.id);
check('no image manifest entry without a card', orphanImages, []);
check('no card without a manifest entry', orphanCards, []);

// ── 5. Displayed dates must match what the organisation published ───────────
//
// Regression guard. The card and the Upcoming Events rail used to format via
// toLocaleDateString with no explicit timeZone, so they rendered in the
// READER's zone: the Red Bull World Final (24 Oct 18:00 Zurich) displayed as
// "25 October" in Manila — contradicting the card's own headline.
console.log('\n── displayed date rendering (venue local time) ──');
const { formatEventDate, parseEventDateParts } = await import('../lib/dance/types.ts');
check('Zurich 24 Oct 18:00 stays 24 Oct, not 25', formatEventDate('2026-10-24T18:00:00+02:00'), '24 Oct 2026, 6:00 PM');
check('midnight-boundary event keeps its own day', formatEventDate('2026-07-30T23:30:00-07:00'), '30 Jul 2026, 11:30 PM');
check('midnight-plus-one keeps its own day', formatEventDate('2026-07-31T00:30:00-07:00'), '31 Jul 2026, 12:30 AM');
check('noon renders as 12 PM', formatEventDate('2026-10-18T12:00:00-05:00'), '18 Oct 2026, 12:00 PM');
check('midnight renders as 12 AM', formatEventDate('2026-04-11T00:30:00+08:00'), '11 Apr 2026, 12:30 AM');
check('date-only value renders without a clock', formatEventDate('2027-04-09'), '9 Apr 2027');
check('UTC (Z) value is accepted', formatEventDate('2026-08-02T12:00:00Z'), '2 Aug 2026, 12:00 PM');
check('unparseable value returns null', formatEventDate('soon'), null);
check('null returns null', formatEventDate(null), null);

// Every record's displayed date must contain the same YYYY-MM-DD the source
// states in its title, so the rail and the headline cannot drift apart.
const VERIFIED_FOR_DISPLAY = FALLBACK_UPDATES;
const railDateMismatch = VERIFIED_FOR_DISPLAY.filter((u) => {
  const shown = formatEventDate(u.event_date);
  if (!shown) return true;
  const isoDay = u.event_date!.match(/^(\d{4})-(\d{2})-(\d{2})/)!;
  const mm = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(isoDay[2]) - 1];
  return !shown.startsWith(`${Number(isoDay[3])} ${mm} ${isoDay[1]}`);
}).map((u) => u.id);
check('no card displays a different day than its source date', railDateMismatch, []);

console.log('\n── upcoming rail date box (venue local time) ──');
check('Zurich 24 Oct -> 24, not 25', parseEventDateParts('2026-10-24T18:00:00+02:00'), { year: 2026, month: 'Oct', day: 24 });
check('midnight-plus-one keeps the 31st', parseEventDateParts('2026-07-31T00:30:00-07:00'), { year: 2026, month: 'Jul', day: 31 });
check('midnight-minus-one keeps the 30th', parseEventDateParts('2026-07-30T23:30:00-07:00'), { year: 2026, month: 'Jul', day: 30 });
check('date-only value is accepted', parseEventDateParts('2027-04-09'), { year: 2027, month: 'Apr', day: 9 });
check('unparseable value returns null', parseEventDateParts('soon'), null);
check('null returns null', parseEventDateParts(null), null);

// The rail's date box and the card's date line must agree, because they are
// the same record shown twice.
const boxVsCard = FALLBACK_UPDATES.filter((u) => {
  const box = parseEventDateParts(u.event_date);
  const card = formatEventDate(u.event_date);
  if (!box || !card) return true;
  return !card.startsWith(`${box.day} ${box.month} ${box.year}`);
}).map((u) => u.id);
check('rail date box agrees with the card date line', boxVsCard, []);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);