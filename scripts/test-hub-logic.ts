/**
 * Hub logic checks — POV banner selection and board DnD rules.
 *
 * Run: npm run test:hub
 *    -> node --experimental-strip-types --no-warnings scripts/test-hub-logic.ts
 *
 * WHY THIS EXISTS
 *   The POV banner and the board are the two places in the hub where a wrong
 *   answer produces a button the database will reject (or hides the one move
 *   the viewer is supposed to make). Both are pure modules by design; this
 *   script pins their behaviour the same way test-booking-status.ts pins the
 *   state machine. Nothing here needs a browser or a database.
 *
 *   The assertions transcribe the rules from bookingStatus.availableActions
 *   and from 07_booking_guard.sql's transition table. If the guard changes,
 *   this file fails first — which is the point.
 *
 * IMPORTS USE RELATIVE PATHS (no '@/' alias), same as the other test scripts.
 */

import {
  bucketOf,
  canRoleDrop,
  moveOptions,
  BOARD_COLUMNS,
} from '../features/hub/services/boardRules.ts';
import { povHeadline } from '../features/hub/services/pov.ts';
import { availableActions } from '../features/appointments/services/bookingStatus.ts';

let failures = 0;
let passes = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passes += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      expected: ${JSON.stringify(expected)}`);
    console.error(`      actual:   ${JSON.stringify(actual)}`);
  }
}

// ───────────────────────────── board columns ─────────────────────────────
console.log('\n--- BOARD BUCKETS ---');
check('pending lands in Requested', bucketOf('pending'), 'requested');
check('accepted lands in Accepted', bucketOf('accepted'), 'accepted');
check('agreement_required lands in Agreement', bucketOf('agreement_required'), 'agreement');
check('confirmed lands in Confirmed', bucketOf('confirmed'), 'confirmed');
check('in_progress lands in In progress', bucketOf('in_progress'), 'in_progress');
check('completed lands in Completed', bucketOf('completed'), 'completed');
check('declined lands in Closed', bucketOf('declined'), 'closed');
check('cancelled lands in Closed', bucketOf('cancelled'), 'closed');
check('expired lands in Closed', bucketOf('expired'), 'closed');
check('no_show lands in Closed', bucketOf('no_show'), 'closed');
check('unknown status lands in Closed', bucketOf('mystery'), 'closed');
check('null status lands in Closed', bucketOf(null), 'closed');

// ───────────────────────── role-gated drop rules ─────────────────────────
console.log('\n--- COACH DROPS ---');
check('coach pending -> Accepted allowed', canRoleDrop('pending', 'accepted', 'coach'), true);
check('coach pending -> Closed allowed', canRoleDrop('pending', 'closed', 'coach'), true);
check('coach pending -> Confirmed denied', canRoleDrop('pending', 'confirmed', 'coach'), false);
check('coach pending -> In progress denied', canRoleDrop('pending', 'in_progress', 'coach'), false);
check('coach accepted -> Agreement allowed', canRoleDrop('accepted', 'agreement', 'coach'), true);
check('coach accepted -> Closed allowed', canRoleDrop('accepted', 'closed', 'coach'), true);
check('coach accepted -> Confirmed denied', canRoleDrop('accepted', 'confirmed', 'coach'), false);
check('coach agreement_required -> Confirmed allowed', canRoleDrop('agreement_required', 'confirmed', 'coach'), true);
check('coach agreement_required -> Closed allowed', canRoleDrop('agreement_required', 'closed', 'coach'), true);
check('coach agreement_required -> In progress denied', canRoleDrop('agreement_required', 'in_progress', 'coach'), false);
check('coach confirmed -> In progress allowed', canRoleDrop('confirmed', 'in_progress', 'coach'), true);
check('coach confirmed -> Closed allowed', canRoleDrop('confirmed', 'closed', 'coach'), true);
check('coach confirmed -> Completed allowed', canRoleDrop('confirmed', 'completed', 'coach'), true);
check('coach in_progress -> Completed allowed', canRoleDrop('in_progress', 'completed', 'coach'), true);
check('coach in_progress -> Closed allowed', canRoleDrop('in_progress', 'closed', 'coach'), true);
check('coach completed -> anything denied', canRoleDrop('completed', 'in_progress', 'coach'), false);
check('coach declined -> Accepted denied', canRoleDrop('declined', 'accepted', 'coach'), false);
check('coach cancelled -> Closed denied', canRoleDrop('cancelled', 'closed', 'coach'), false);

console.log('\n--- CLIENT DROPS ---');
check('client pending -> Closed allowed', canRoleDrop('pending', 'closed', 'client'), true);
check('client accepted -> Closed allowed', canRoleDrop('accepted', 'closed', 'client'), true);
check('client agreement_required -> Closed allowed', canRoleDrop('agreement_required', 'closed', 'client'), true);
check('client confirmed -> Closed allowed', canRoleDrop('confirmed', 'closed', 'client'), true);
check('client in_progress -> Closed denied', canRoleDrop('in_progress', 'closed', 'client'), false);
check('client never advances the pipeline', canRoleDrop('pending', 'accepted', 'client'), false);
check('client confirmed -> In progress denied', canRoleDrop('confirmed', 'in_progress', 'client'), false);
check('unknown column denied', canRoleDrop('pending', 'nowhere', 'coach'), false);
check('unknown status denied', canRoleDrop('mystery', 'closed', 'coach'), false);

// ─────────────────────────────── move menu ───────────────────────────────
console.log('\n--- MOVE OPTIONS (keyboard alternative) ---');
check('coach pending offers accept+decline', moveOptions('pending', 'coach').map((o) => o.action), ['accept', 'decline']);
check('coach accepted offers decline (agreement stays button-driven)', moveOptions('accepted', 'coach').map((o) => o.action), ['decline']);
check('coach agreement_required offers cancel', moveOptions('agreement_required', 'coach').map((o) => o.action), ['cancel']);
check('coach confirmed offers start+complete+cancel', moveOptions('confirmed', 'coach').map((o) => o.action), ['start', 'complete', 'cancel']);
check('coach in_progress offers complete+no_show', moveOptions('in_progress', 'coach').map((o) => o.action), ['complete', 'no_show']);
check('client live bookings offer cancel only', moveOptions('pending', 'client').map((o) => o.action), ['cancel']);
check('client agreement_required offers cancel', moveOptions('agreement_required', 'client').map((o) => o.action), ['cancel']);
check('terminal cases offer nothing', moveOptions('completed', 'coach'), []);

// Invariant: every menu option's target must pass the role-drop gate.
{
  let invariantOk = true;
  for (const role of ['coach', 'client'] as const) {
    for (const col of BOARD_COLUMNS) {
      for (const status of col.match) {
        for (const opt of moveOptions(status, role)) {
          if (!canRoleDrop(status, opt.target, role)) invariantOk = false;
        }
      }
    }
  }
  check('every Move-to target passes canRoleDrop', invariantOk, true);
}

// ──────────────────────────── POV banner selection ───────────────────────
console.log('\n--- POV BANNER ---');
{
  const coachPending = availableActions({ status: 'pending', role: 'coach', coachVerified: true });
  const pov = povHeadline({ status: 'pending', role: 'coach', counterpartName: 'Juan', actions: coachPending });
  check('coach pending features the primary action, not decline', pov.headline, 'Your turn: Accept request');
  check('coach pending is the coach’s turn', pov.isYourTurn, true);
}
{
  const clientAgreement = [
    { action: 'sign', label: 'Sign the agreement', variant: 'primary' },
  ];
  const pov = povHeadline({ status: 'agreement_required', role: 'client', counterpartName: 'Coach One', actions: clientAgreement });
  check('client with a signature pending gets the sign action', pov.headline, 'Your turn: Sign the agreement');
}
{
  const pov = povHeadline({ status: 'agreement_required', role: 'coach', counterpartName: 'Juan', actions: [] });
  check('no actions -> waiting on counterpart', pov.headline, 'Waiting on Juan - agreement required.');
  check('waiting state is not your turn', pov.isYourTurn, false);
}
{
  const pov = povHeadline({ status: 'completed', role: 'client', counterpartName: 'Coach One', actions: [] });
  check('completed cases read complete', pov.headline, 'Session complete.');
}
{
  for (const status of ['declined', 'cancelled', 'expired', 'no_show']) {
    const pov = povHeadline({ status, role: 'coach', counterpartName: 'Juan', actions: [] });
    check(`${status} reads as closed`, pov.headline, 'This case is closed.');
  }
}


// ─────────────────── stepper: each status -> step states ───────────────────
console.log('\n--- STEPPER MAPPING ---');
import { deriveStepperSteps, STEPPER_LABELS, type StepperInput } from '../features/hub/services/stepper.ts';
function baseInput(over: Partial<StepperInput>): StepperInput {
  return {
    status: 'pending',
    stamps: {},
    createdAt: '2026-10-01T08:00:00.000Z',
    agreement: null,
    feedback: null,
    clientId: 'c-1',
    coachId: 'v-1',
    viewerId: 'v-1',
    names: { 'c-1': 'Juan', 'v-1': 'Coach One' },
    ...over,
  };
}
const statesFor = (over: Partial<StepperInput>): string[] =>
  deriveStepperSteps(baseInput(over)).map((s) => s.state);

check('labels (coach)', STEPPER_LABELS.coach, ['Request received', 'Review', 'Agreement', 'Signed', 'Confirmed', 'Session', 'Completed']);
check('labels (client)', STEPPER_LABELS.client, ['Request sent', 'Coach review', 'Agreement', 'Signed', 'Confirmed', 'Session', 'Review']);

check('pending: request done, review current', statesFor({ status: 'pending' }), ['done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
check('accepted: review done, agreement current', statesFor({ status: 'accepted', stamps: { accepted: '2026-10-02T09:00:00.000Z' } }), ['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
check('agreement_required: signed current', statesFor({ status: 'agreement_required', stamps: { accepted: 't1', agreement_required: 't2' } }), ['done', 'done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming']);
check('confirmed: session current', statesFor({
  status: 'confirmed',
  stamps: { accepted: 't1', agreement_required: 't2', confirmed: 't3' },
  agreement: { created_at: 't2', client_signed_at: 't2a', coach_signed_at: 't2b' },
}), ['done', 'done', 'done', 'done', 'done', 'current', 'upcoming']);
check('in_progress: completed current', statesFor({
  status: 'in_progress',
  stamps: { accepted: 't1', agreement_required: 't2', confirmed: 't3', in_progress: 't4' },
  agreement: { created_at: 't2', client_signed_at: 't2a', coach_signed_at: 't2b' },
}), ['done', 'done', 'done', 'done', 'done', 'done', 'current']);
check('completed: all done (coach)', statesFor({
  status: 'completed',
  stamps: { accepted: 't1', agreement_required: 't2', confirmed: 't3', in_progress: 't4', completed: 't5' },
  agreement: { created_at: 't2', client_signed_at: 't2a', coach_signed_at: 't2b' },
}), ['done', 'done', 'done', 'done', 'done', 'done', 'done']);
check('completed without start stamp: session skipped', statesFor({
  status: 'completed',
  stamps: { accepted: 't1', agreement_required: 't2', confirmed: 't3', completed: 't5' },
  agreement: { created_at: 't2', client_signed_at: 't2a', coach_signed_at: 't2b' },
}), ['done', 'done', 'done', 'done', 'done', 'skipped', 'done']);

check('client POV pending: request done, coach review current', statesFor({ status: 'pending', viewerId: 'c-1' }), ['done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
check('client POV completed without feedback: review current', statesFor({
  status: 'completed', viewerId: 'c-1',
  stamps: { accepted: 't1', agreement_required: 't2', confirmed: 't3', in_progress: 't4', completed: 't5' },
  agreement: { created_at: 't2', client_signed_at: 't2a', coach_signed_at: 't2b' },
}), ['done', 'done', 'done', 'done', 'done', 'done', 'current']);
check('client POV completed with feedback: all done', statesFor({
  status: 'completed', viewerId: 'c-1', feedback: 'Great session',
  stamps: { accepted: 't1', agreement_required: 't2', confirmed: 't3', in_progress: 't4', completed: 't5' },
  agreement: { created_at: 't2', client_signed_at: 't2a', coach_signed_at: 't2b' },
}), ['done', 'done', 'done', 'done', 'done', 'done', 'done']);

check('declined from pending: ONE red step there, later not applicable', statesFor({ status: 'declined' }), ['done', 'terminal', 'notApplicable', 'notApplicable', 'notApplicable', 'notApplicable', 'notApplicable']);
check('cancelled from accepted: line stops at agreement', statesFor({ status: 'cancelled', stamps: { accepted: 't1', cancelled: 't2' } }), ['done', 'done', 'terminal', 'notApplicable', 'notApplicable', 'notApplicable', 'notApplicable']);
check('expired from pending', statesFor({ status: 'expired', stamps: { expired: 't2' } }), ['done', 'terminal', 'notApplicable', 'notApplicable', 'notApplicable', 'notApplicable', 'notApplicable']);
check('no_show during session: red at outcome', statesFor({
  status: 'no_show',
  stamps: { accepted: 't1', agreement_required: 't2', confirmed: 't3', in_progress: 't4', no_show: 't5' },
  agreement: { created_at: 't2', client_signed_at: 't2a', coach_signed_at: 't2b' },
}), ['done', 'done', 'done', 'done', 'done', 'done', 'terminal']);

{
  const steps = deriveStepperSteps(baseInput({ status: 'pending' }));
  check('request step carries created_at', steps[0].at, '2026-10-01T08:00:00.000Z');
  check('request step actor is the client', steps[0].actorName, 'Juan');
  check('labels match coach POV', steps.map((s) => s.label), [...STEPPER_LABELS.coach]);
}
{
  const steps = deriveStepperSteps(baseInput({
    status: 'agreement_required',
    stamps: { accepted: 't1', agreement_required: 't2' },
  }));
  check('signed step is current with no signatures', steps[3].state, 'current');
  check('terminal hint empty for happy path', steps[3].hint, null);
}
{
  const steps = deriveStepperSteps(baseInput({ status: 'declined', stamps: { declined: 't9' } }));
  check('terminal carries the decline stamp', steps[1].at, 't9');
  check('terminal carries a hint', typeof steps[1].hint === 'string' && steps[1].hint.length > 0, true);
}

// ─────────────────────────────────────── summary ─────────────────────────
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
