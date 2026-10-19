/**
 * Booking state-machine checks.
 *
 * Run: npm run test:booking
 *    -> node --experimental-strip-types --no-warnings scripts/test-booking-status.ts
 *
 * WHY THIS IS A SCRIPT AND NOT A TEST FILE
 *   The project has no test runner configured, and adding one is well outside the
 *   scope of these changes. What it DOES have is a convention: `scripts/*.ts`
 *   executed with `node --experimental-strip-types`, importing app modules by
 *   RELATIVE path so node does not need the `@/` webpack alias. This follows it.
 *
 * WHAT IS ACTUALLY BEING CHECKED
 *   `features/appointments/services/bookingStatus.ts` mirrors the transition guard
 *   in supabase/migrations/02_booking_schema.sql. That mirror is the one place
 *   in the appointments UI where a mistake produces a button the database will
 *   reject, or worse, a missing button for a move that is allowed. It is pure and
 *   import-free, so it can be pinned here without a browser, a database, or a
 *   network — which is exactly why it was written as a separate module.
 *
 *   These assertions are transcribed from the CASE expression in
 *   guard_booking_transition() and the RLS split in section 8 of that migration.
 *   If a migration changes the state machine, this file is where the divergence
 *   should show up first.
 */

import {
  availableActions,
  buildTimeline,
  isLegalTransition,
  stageIndex,
  statusMeta,
  BOOKING_STAGES,
  type AppointmentStatus,
  type BookingAction,
} from '../features/appointments/services/bookingStatus.ts';

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

/* ── 1. The transition table, transcribed from guard_booking_transition() ──── */

const LEGAL: [string, string, boolean][] = [
  // pending -> accepted | declined | cancelled
  ['pending', 'accepted', true],
  ['pending', 'declined', true],
  ['pending', 'cancelled', true],
  ['pending', 'confirmed', false],
  ['pending', 'completed', false],
  ['pending', 'agreement_required', false],
  // accepted -> agreement_required | cancelled | declined
  ['accepted', 'agreement_required', true],
  ['accepted', 'cancelled', true],
  ['accepted', 'declined', true],
  ['accepted', 'confirmed', false],
  // agreement_required -> confirmed | cancelled
  ['agreement_required', 'confirmed', true],
  ['agreement_required', 'cancelled', true],
  ['agreement_required', 'completed', false],
  ['agreement_required', 'declined', false],
  // confirmed -> completed | cancelled
  ['confirmed', 'completed', true],
  ['confirmed', 'cancelled', true],
  ['confirmed', 'declined', false],
  // Terminal states accept nothing.
  ['completed', 'confirmed', false],
  ['completed', 'cancelled', false],
  ['cancelled', 'pending', false],
  ['declined', 'accepted', false],
];

for (const [from, to, expected] of LEGAL) {
  check(`transition ${from} -> ${to} is ${expected}`, isLegalTransition(from, to), expected);
}

/* ── 2. No status may move to itself ──────────────────────────────────────── */

for (const s of BOOKING_STAGES) {
  check(`${s} -> ${s} is refused`, isLegalTransition(s, s), false);
}

/* ── 3. 'confirmed' is never offered to anybody ───────────────────────────── */

for (const status of BOOKING_STAGES) {
  for (const role of ['client', 'coach'] as const) {
    const targets = availableActions({ status, role }).map((a) => a.target);
    check(
      `${role} at ${status} is never offered a direct confirm`,
      targets.includes('confirmed'),
      false
    );
  }
}

/* ── 4. Role split: the coach-only moves ─────────────────────────────────── */

/*
 * Cancel is deliberately NOT in COACH_ONLY: both parties may cancel from any
 * non-terminal stage ("Clients can cancel own appointment" plus the participant
 * UPDATE policy), so asserting "never offered to a client" would assert the
 * opposite of the rule. The genuinely coach-only moves are the three below.
 */
const COACH_ONLY: readonly BookingAction[] = ['accept', 'decline', 'complete'];
const CLIENT_MAY_CANCEL_FROM: readonly string[] = [
  'pending',
  'accepted',
  'agreement_required',
  'confirmed',
];

for (const status of BOOKING_STAGES) {
  const client = availableActions({ status, role: 'client' }).map((a) => a.action);

  for (const action of COACH_ONLY) {
    check(
      `coach-only move '${action}' never offered to a client at ${status}`,
      client.includes(action),
      false
    );
  }
  check(
    `client may cancel at ${status}`,
    client.includes('cancel'),
    CLIENT_MAY_CANCEL_FROM.includes(status)
  );
  check(
    `a client sees nothing but cancel at ${status}`,
    client.filter((a) => a !== 'cancel').length,
    0
  );
}

/* ── 5. Accept is gated on coach verification ─────────────────────────────── */

check(
  'unverified coach cannot accept a pending request',
  availableActions({ status: 'pending', role: 'coach', coachVerified: false })[1]?.blockedReason,
  'Complete account verification to accept bookings.'
);
check(
  'verified coach can accept a pending request',
  availableActions({ status: 'pending', role: 'coach', coachVerified: true })[1]?.blockedReason,
  null
);

/* ── 6. Suspension blocks every write ─────────────────────────────────────── */

for (const role of ['client', 'coach'] as const) {
  const actions = availableActions({ status: 'pending', role, suspended: true });
  check(
    `suspended ${role} has every action blocked`,
    actions.every((a) => Boolean(a.blockedReason)),
    true
  );
}

/* ── 7. Terminal states offer nothing but the coach's own follow-ups ─────── */

check(
  'completed booking offers no actions',
  availableActions({ status: 'completed', role: 'client' }).length +
    availableActions({ status: 'completed', role: 'coach' }).length,
  0
);
check(
  'cancelled booking offers no actions',
  availableActions({ status: 'cancelled', role: 'client' }).length +
    availableActions({ status: 'cancelled', role: 'coach' }).length,
  0
);

/* ── 8. Unknown / missing status is inert, not a crash ───────────────────── */

check('unknown status yields no actions', availableActions({ status: 'wat', role: 'coach' }).length, 0);
check('null status yields no actions', availableActions({ status: null, role: 'coach' }).length, 0);
check('statusMeta(null) is safe', statusMeta(null).label, 'Unknown');

/* ── 9. Labels are human sentences, never raw enum values ────────────────── */

const EXPECTED_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Awaiting coach',
  accepted: 'Accepted',
  agreement_required: 'Awaiting signatures',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};
for (const status of BOOKING_STAGES) {
  check(`label for ${status}`, statusMeta(status).label, EXPECTED_LABELS[status]);
  check(
    `label for ${status} has no underscore`,
    statusMeta(status).label.includes('_'),
    false
  );
}

/* ── 10. Terminality ─────────────────────────────────────────────────────── */

for (const s of ['completed', 'declined', 'cancelled'] as AppointmentStatus[]) {
  check(`${s} is terminal`, statusMeta(s).isTerminal, true);
  check(`${s} is not actionable`, statusMeta(s).isActionable, false);
}
for (const s of ['pending', 'accepted', 'agreement_required', 'confirmed'] as AppointmentStatus[]) {
  check(`${s} is not terminal`, statusMeta(s).isTerminal, false);
}

/* ── 11. Progress ────────────────────────────────────────────────────────── */

check('stageIndex(pending)', stageIndex('pending'), 0);
check('stageIndex(confirmed)', stageIndex('confirmed'), 3);
check('stageIndex(completed)', stageIndex('completed'), 4);

const full = buildTimeline('completed', {
  accepted: '2026-10-01T10:00:00Z',
  agreement_required: '2026-10-01T10:01:00Z',
  confirmed: '2026-10-01T10:05:00Z',
  completed: '2026-10-05T09:00:00Z',
});
check('completed timeline reaches every stage', full.every((s) => s.reached), true);
check('completed timeline marks the last stage current', full[4].current, true);
check('no other stage is current', full.filter((s) => s.current).length, 1);

const early = buildTimeline('pending', {});
check('a fresh booking has only stage 0 reached', early.filter((s) => s.reached).length, 1);

/*
 * A cancelled booking reports how far it got FROM ITS TIMESTAMPS, not from its
 * final label. This is the case that used to be unanswerable and was papered
 * over by showing stage 0 for everything.
 */
const cancelledAfterConfirm = buildTimeline('cancelled', {
  accepted: '2026-10-01T10:00:00Z',
  agreement_required: '2026-10-01T10:01:00Z',
  confirmed: '2026-10-01T10:05:00Z',
});
check(
  'cancelled-after-confirm reports confirmed as reached',
  cancelledAfterConfirm.find((s) => s.status === 'confirmed')?.reached,
  true
);
check(
  'cancelled-after-confirm does not report completed as reached',
  cancelledAfterConfirm.find((s) => s.status === 'completed')?.reached,
  false
);
check(
  'an off-path booking has no current stage',
  cancelledAfterConfirm.filter((s) => s.current).length,
  0
);
check(
  'cancelled with no stamps reports only stage 0',
  buildTimeline('cancelled', {}).filter((s) => s.reached).length,
  1
);

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);