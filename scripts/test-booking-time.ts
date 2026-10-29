/**
 * Booking time, ordering, slot and reschedule-codec checks.
 *
 * Run: npm run test:booking-ui
 *    -> node --experimental-strip-types --no-warnings scripts/test-booking-time.ts
 *
 * These modules decide three things the UI must never get wrong:
 *   - which time chips are DISABLED (only what the data proves),
 *   - which order bookings appear in, and
 *   - how a reschedule request is encoded/decoded without inventing a status.
 *
 * They are pure, so they are checked without a browser or a database.
 */

import {
  buildTimeSlots,
  bookedWindowsForDate,
  clientBusyWindowsForDate,
  composeProfileAddress,
  dayAvailability,
  formatDuration,
  getBookingCountdown,
  minutesToTime,
  parseDurationMinutes,
  sortBookings,
  summarizeBookings,
  timeToMinutes,
} from '../features/appointments/services/bookingTime.ts';
import {
  RESCHEDULE_PREFIX,
  encodeRescheduleRequest,
  hasPendingReschedule,
  parseRescheduleRequest,
} from '../features/appointments/services/rescheduleRequest.ts';

let failures = 0;
let passes = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) {
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
  }
}

function checkTrue(name: string, actual: boolean) {
  check(name, actual, true);
}

/* ── 1. Parsing and formatting ───────────────────────────────────────────── */

check('timeToMinutes 09:30', timeToMinutes('09:30'), 570);
check('timeToMinutes tolerates seconds', timeToMinutes('18:05:00'), 1085);
check('timeToMinutes rejects 24:00', timeToMinutes('24:00'), null);
check('timeToMinutes rejects junk', timeToMinutes('morning'), null);
check('minutesToTime wraps a day', minutesToTime(24 * 60 + 30), '00:30');
check('minutesToTime pads', minutesToTime(9 * 60 + 5), '09:05');
check('parseDurationMinutes hours', parseDurationMinutes('1 hour'), 60);
check('parseDurationMinutes fractional hours', parseDurationMinutes('1.5 hours'), 90);
check('parseDurationMinutes minutes', parseDurationMinutes('90 min'), 90);
check('parseDurationMinutes bare number means hours', parseDurationMinutes('2'), 120);
check('parseDurationMinutes default', parseDurationMinutes(null), 60);
check('formatDuration mixed', formatDuration(90), '1h 30m');
check('formatDuration whole', formatDuration(120), '2 hours');

/* ── 2. Countdowns ───────────────────────────────────────────────────────── */

const now = new Date(2026, 9, 24, 10, 0, 0).getTime();
const countdown = (status: string, date: string, start: string) =>
  getBookingCountdown(status, date, start, now);

check('two hours away is urgent', countdown('confirmed', '2026-10-24', '12:00')?.text, 'Starts in 2h');
check('two hours away tone', countdown('confirmed', '2026-10-24', '12:00')?.tone, 'urgent');
check(
  'three and a half hours away',
  countdown('pending', '2026-10-24', '13:30')?.text,
  'Starts in 3h 30m'
);
check(
  'tomorrow keeps the hours remainder',
  countdown('accepted', '2026-10-25', '12:00')?.text,
  'Starts in 1d 2h'
);
check(
  'a week out uses a date',
  countdown('agreement_required', '2026-11-05', '12:00')?.text,
  'Starts Nov 5'
);
check(
  'a passed start says so honestly',
  countdown('confirmed', '2026-10-24', '09:00')?.text,
  'Scheduled time has passed'
);
check('a passed start tone', countdown('confirmed', '2026-10-24', '09:00')?.tone, 'past');
check('completed has no countdown', countdown('completed', '2026-10-25', '12:00'), null);
check('cancelled has no countdown', countdown('cancelled', '2026-10-25', '12:00'), null);

/* ── 3. Slot building: only proven conflicts are disabled ────────────────── */

const slotDate = '2026-10-25';
const busy = [
  {
    start: new Date(2026, 9, 25, 10, 0),
    end: new Date(2026, 9, 25, 11, 0),
    label: '10:00 – 11:00',
  },
];
const slots = buildTimeSlots({
  date: slotDate,
  durationMinutes: 60,
  nowMs: now,
  earliestMs: now,
  busy,
});
const slotAt = (start: string) => slots.find((slot) => slot.start === start);

check('first chip is 08:00', slots[0]?.start, '08:00');
check('last chip ends by 20:00', slots[slots.length - 1]?.end, '20:00');
check('a one-hour slot ends one hour later', slotAt('09:00')?.end, '10:00');
check('own conflicting booking is disabled', slotAt('10:00')?.disabled, true);
checkTrue(
  'conflict reason names the existing booking',
  Boolean(slotAt('10:00')?.reason?.includes('already have a booking'))
);
check('the next free hour is enabled', slotAt('11:00')?.disabled, false);
check('the hour before the conflict is enabled', slotAt('09:00')?.disabled, false);

const noticeSlots = buildTimeSlots({
  date: slotDate,
  durationMinutes: 60,
  nowMs: now,
  earliestMs: new Date(2026, 9, 25, 12, 0).getTime(),
  busy: [],
});
check('notice window disables 11:00', noticeSlots.find((s) => s.start === '11:00')?.disabled, true);
check('notice window allows 12:00', noticeSlots.find((s) => s.start === '12:00')?.disabled, false);

const todaySlots = buildTimeSlots({
  date: '2026-10-24',
  durationMinutes: 60,
  nowMs: now,
  earliestMs: 0,
  busy: [],
});
check('a passed time today is disabled', todaySlots.find((s) => s.start === '09:00')?.disabled, true);
check('a later time today is enabled', todaySlots.find((s) => s.start === '12:00')?.disabled, false);
check('a free slot is kind available', slotAt('11:00')?.kind, 'available');
check('a conflicting slot is kind conflict', slotAt('10:00')?.kind, 'conflict');
check('a notice-window slot is kind notice', noticeSlots.find((s) => s.start === '11:00')?.kind, 'notice');
check('a passed slot is kind past', todaySlots.find((s) => s.start === '09:00')?.kind, 'past');

/* ── 3b. Day states for the calendar ─────────────────────────────────────── */

const dayState = (
  date: string,
  options: {
    durationMinutes?: number;
    nowMs?: number;
    earliestMs?: number;
    busy?: readonly { start: Date; end: Date; label?: string }[];
  } = {}
) =>
  dayAvailability({
    date,
    durationMinutes: options.durationMinutes ?? 60,
    nowMs: options.nowMs ?? now,
    earliestMs: options.earliestMs ?? now,
    busy: options.busy ?? [],
  });

check('a day with a free start is available', dayState('2026-10-25'), 'available');
check(
  'a day whose last start has gone is past',
  dayState('2026-10-24', { nowMs: new Date(2026, 9, 24, 20, 0).getTime() }),
  'past'
);
check(
  'a day inside the notice window is notice',
  dayState('2026-10-25', {
    earliestMs: new Date(2026, 9, 26, 12, 0).getTime(),
  }),
  'notice'
);
check(
  'a day filled by the client’s own bookings is unavailable',
  dayState('2026-10-25', {
    busy: [
      {
        start: new Date(2026, 9, 25, 0, 0),
        end: new Date(2026, 9, 25, 23, 59),
        label: 'All day',
      },
    ],
  }),
  'unavailable'
);
check(
  'a duration that cannot fit the day is unavailable',
  dayState('2026-10-25', { durationMinutes: 13 * 60 }),
  'unavailable'
);

/* ── 4. Own booked windows ───────────────────────────────────────────────── */

const appointment = (
  id: number,
  status: string,
  date: string,
  start: string,
  end: string,
  updatedAt: string
) => ({
  appointment: {
    id,
    status: status as never,
    date,
    start_time: start,
    end_time: end,
    updated_at: updatedAt,
    created_at: updatedAt,
  },
});

const ownRows = [
  { id: 1, date: '2026-10-25', start_time: '09:00', end_time: '10:00', status: 'confirmed' },
  { id: 2, date: '2026-10-25', start_time: '11:00', end_time: '12:00', status: 'pending' },
  { id: 3, date: '2026-10-25', start_time: '13:00', end_time: '14:00', status: 'cancelled' },
  { id: 4, date: '2026-10-26', start_time: '09:00', end_time: '10:00', status: 'accepted' },
] as const;

const windows = bookedWindowsForDate(ownRows, '2026-10-25');
check('only the confirmed booking occupies the date', windows.length, 1);
check('the pending request does not block a slot', windows[0]?.label, '9:00 AM – 10:00 AM');

const clientWindows = clientBusyWindowsForDate(ownRows, '2026-10-25');
check('the client form also blocks a pending request', clientWindows.length, 2);
check('the pending window is labelled', clientWindows[1]?.label, '11:00 AM – 12:00 PM');

/* ── 5. Ordering and summary ─────────────────────────────────────────────── */

const items = [
  appointment(10, 'completed', '2026-10-20', '09:00', '10:00', '2026-10-20T10:00:00Z'),
  appointment(11, 'confirmed', '2026-10-26', '09:00', '10:00', '2026-10-22T10:00:00Z'),
  appointment(12, 'pending', '2026-10-27', '09:00', '10:00', '2026-10-23T10:00:00Z'),
  appointment(13, 'agreement_required', '2026-10-25', '09:00', '10:00', '2026-10-23T11:00:00Z'),
  appointment(14, 'cancelled', '2026-10-21', '09:00', '10:00', '2026-10-21T10:00:00Z'),
];

const clientOrder = sortBookings(items, 'client', now).map((item) => item.appointment.id);
check('client order puts signature work first', clientOrder[0], 13);
check('client order puts pending second', clientOrder[1], 12);
check('client order puts cancelled last', clientOrder[clientOrder.length - 1], 14);

const coachOrder = sortBookings(items, 'coach', now).map((item) => item.appointment.id);
check('coach order puts the new request first', coachOrder[0], 12);

const summary = summarizeBookings(items, 'client', now);
check('summary total', summary.total, 5);
check('summary active', summary.active, 3);
check('summary completed', summary.completed, 1);
check('summary needs action (signature + pending)', summary.needsAction, 2);
check('summary next session', summary.next?.appointment.id, 13);

const coachSummary = summarizeBookings(items, 'coach', now);
check('coach needs action (pending + agreement)', coachSummary.needsAction, 2);

/* ── 6. Profile address composition ──────────────────────────────────────── */

check(
  'address is built from real profile columns',
  composeProfileAddress({
    street: '12 Mabini St',
    barangay_name: 'Muzon',
    city_name: 'San Jose del Monte',
    province_name: 'Bulacan',
    address_summary: 'ignored when parts exist',
  }),
  '12 Mabini St, Muzon, San Jose del Monte, Bulacan'
);
check(
  'address falls back to the stored summary',
  composeProfileAddress({ address_summary: 'Muzon, San Jose del Monte' }),
  'Muzon, San Jose del Monte'
);

/* ── 7. Reschedule request codec ─────────────────────────────────────────── */

const encoded = encodeRescheduleRequest(
  {
    requestedDate: '2026-11-02',
    startTime: '14:00',
    endTime: '15:30',
    durationMinutes: 90,
    reason: 'School performance in the morning.',
  },
  '2026-10-24T10:00:00.000Z'
);

checkTrue('encoded note is tagged', encoded.startsWith(RESCHEDULE_PREFIX));
const decoded = parseRescheduleRequest(encoded, '2026-10-24T10:00:00.000Z');
check('decoded date', decoded?.requestedDate, '2026-11-02');
check('decoded start', decoded?.startTime, '14:00');
check('decoded end', decoded?.endTime, '15:30');
check('decoded duration', decoded?.durationMinutes, 90);
check('decoded reason', decoded?.reason, 'School performance in the morning.');
check('decoded request timestamp', decoded?.requestedAt, '2026-10-24T10:00:00.000Z');

const legacy = parseRescheduleRequest('Please move this to the afternoon.', null);
check('legacy note keeps the reason', legacy?.reason, 'Please move this to the afternoon.');
check('legacy note admits it has no time', legacy?.requestedDate, null);

checkTrue('a request is pending', hasPendingReschedule({ changes_requested_at: '2026-10-24T10:00:00Z' }));
checkTrue(
  'a note without a timestamp still counts as pending',
  hasPendingReschedule({ requested_changes_note: encoded })
);
check(
  'cleared columns are not pending',
  hasPendingReschedule({ changes_requested_at: null, requested_changes_note: null }),
  false
);

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
