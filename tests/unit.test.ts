/**
 * tests/unit.test.ts
 *
 * Pure business-logic unit tests — no network, no Supabase, no browser.
 * Run with:
 *   node --experimental-strip-types --no-warnings --test tests/unit.test.ts
 *
 * These cover the booking lifecycle state machine, the agreement-status
 * derivation, PII masking, PostgREST escaping, geo maths, achievement
 * requirement evaluation, and presence normalisation — all hand-verified
 * against the SQL the app mirrors.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  availableActions,
  isLegalTransition,
  stageIndex,
  statusMeta,
  BOOKING_STAGES,
} from '../features/appointments/services/bookingStatus.ts';
import { agreementStatusView } from '../features/booking/services/agreementStatus.ts';
import {
  maskUsername,
  maskEmail,
  maskPhone,
  maskAddress,
  maskGeneric,
  canViewUnmasked,
  shouldMask,
} from '../lib/masking.ts';
import {
  escapeLikePattern,
  quotePostgrestValue,
  ilikeContains,
  buildOrContains,
  buildAnyContains,
} from '../lib/postgrest.ts';
import {
  haversineKm,
  formatDistance,
  sameCenter,
  isWithinPhilippines,
  isValidBounds,
  boundsAround,
  boundsCenter,
  sameBounds,
} from '../lib/geo.ts';
import {
  isFilled,
  profileTaskRequirements,
  progressForRequirements,
  taskRequirements,
} from '../lib/achievements/requirements.ts';
import {
  isSelfAssignable,
  displayStatus,
  statusMeta as presenceStatusMeta,
  statusLabel,
  canBeMessaged,
} from '../features/presence/utils/presence.ts';
import {
  BOARD_COLUMNS,
  bucketOf,
  canRoleDrop,
  moveOptions,
} from '../features/hub/services/boardRules.ts';

/* ------------------------------------------------------------------ */
/* bookingStatus — the booking lifecycle state machine                */
/* ------------------------------------------------------------------ */
describe('bookingStatus.isLegalTransition', () => {
  it('follows the database guard for pending', () => {
    assert.equal(isLegalTransition('pending', 'accepted'), true);
    assert.equal(isLegalTransition('pending', 'declined'), true);
    assert.equal(isLegalTransition('pending', 'cancelled'), true);
    assert.equal(isLegalTransition('pending', 'expired'), true);
    assert.equal(isLegalTransition('pending', 'confirmed'), false);
    assert.equal(isLegalTransition('pending', 'completed'), false);
  });

  it('follows the database guard for accepted', () => {
    assert.equal(isLegalTransition('accepted', 'agreement_required'), true);
    assert.equal(isLegalTransition('accepted', 'cancelled'), true);
    assert.equal(isLegalTransition('accepted', 'declined'), true);
    assert.equal(isLegalTransition('accepted', 'expired'), true);
    assert.equal(isLegalTransition('accepted', 'confirmed'), false);
  });

  it('follows the database guard for agreement_required', () => {
    assert.equal(isLegalTransition('agreement_required', 'confirmed'), true);
    assert.equal(isLegalTransition('agreement_required', 'cancelled'), true);
    assert.equal(isLegalTransition('agreement_required', 'expired'), true);
    assert.equal(isLegalTransition('agreement_required', 'accepted'), false);
  });

  it('follows the database guard for confirmed and in_progress', () => {
    assert.equal(isLegalTransition('confirmed', 'in_progress'), true);
    assert.equal(isLegalTransition('confirmed', 'completed'), true);
    assert.equal(isLegalTransition('confirmed', 'cancelled'), true);
    assert.equal(isLegalTransition('confirmed', 'no_show'), true);
    assert.equal(isLegalTransition('confirmed', 'accepted'), false);
    assert.equal(isLegalTransition('in_progress', 'completed'), true);
    assert.equal(isLegalTransition('in_progress', 'no_show'), true);
    assert.equal(isLegalTransition('in_progress', 'cancelled'), false);
    assert.equal(isLegalTransition('in_progress', 'declined'), false);
  });

  it('terminal states have no outgoing transitions', () => {
    for (const terminal of ['completed', 'cancelled', 'declined', 'expired', 'no_show']) {
      assert.equal(isLegalTransition(terminal, 'pending'), false, `${terminal} -> pending`);
      assert.equal(isLegalTransition(terminal, 'confirmed'), false, `${terminal} -> confirmed`);
      assert.equal(isLegalTransition(terminal, 'accepted'), false, `${terminal} -> accepted`);
    }
  });
});

describe('bookingStatus.availableActions', () => {
  it('coach can accept/decline a pending request', () => {
    const actions = availableActions({ status: 'pending', role: 'coach' });
    const kinds = actions.map((a) => a.action);
    assert.deepEqual(kinds, ['decline', 'accept', 'cancel']);
  });

  it('blocks coach accept when account is unverified but still shows the control', () => {
    const actions = availableActions({ status: 'pending', role: 'coach', coachVerified: false });
    const accept = actions.find((a) => a.action === 'accept');
    assert.ok(accept, 'accept control is rendered as disabled');
    assert.equal(accept.blockedReason, 'Complete account verification to accept bookings.');
  });

  it('blocks every write when suspended, for both roles', () => {
    for (const role of ['coach', 'client'] as const) {
      const actions = availableActions({ status: 'pending', role, suspended: true });
      for (const action of actions) {
        if (action.action === 'cancel') assert.equal(action.blockedReason, 'Your account is suspended, so bookings cannot be changed.');
        if (action.action === 'accept') assert.ok(action.blockedReason?.includes('suspended'));
      }
    }
  });

  it('in_progress has no cancel for either role', () => {
    const coachActions = availableActions({ status: 'in_progress', role: 'coach' });
    const clientActions = availableActions({ status: 'in_progress', role: 'client' });
    assert.ok(coachActions.every((a) => a.action !== 'cancel'));
    assert.ok(!clientActions.some((a) => a.action === 'cancel'));
    assert.ok(coachActions.some((a) => a.action === 'complete'));
  });

  it('client cannot accept; coach cancel is offered on pending', () => {
    const clientActions = availableActions({ status: 'pending', role: 'client' });
    assert.ok(clientActions.every((a) => a.action !== 'accept'));
    assert.ok(clientActions.some((a) => a.action === 'cancel'));
  });
});

describe('bookingStatus meta helpers', () => {
  it('statusMeta falls back to a safe terminal unknown for bogus labels', () => {
    const meta = statusMeta('bogus-label');
    assert.equal(meta.badge, 'neutral');
    assert.equal(meta.isTerminal, true);
    assert.equal(meta.isActionable, false);
  });

  it('statusMeta handles null and valid labels', () => {
    assert.equal(statusMeta(null).badge, 'neutral');
    assert.equal(statusMeta('pending').label, 'Awaiting coach');
    assert.equal(statusMeta('completed').isTerminal, true);
  });

  it('stageIndex reports 0 for terminal-off-pipeline states', () => {
    assert.equal(stageIndex('declined'), 0);
    assert.equal(stageIndex('cancelled'), 0);
    assert.equal(stageIndex('expired'), 0);
    assert.equal(stageIndex('no_show'), 0);
    assert.equal(stageIndex('confirmed'), BOOKING_STAGES.indexOf('confirmed'));
    assert.equal(stageIndex(null), 0);
  });
});

/* ------------------------------------------------------------------ */
/* agreementStatus — terminal states resolve before signature states  */
/* ------------------------------------------------------------------ */
function makeAgreement(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    client_id: 'client-1',
    coach_id: 'coach-1',
    client_signed_at: null,
    coach_signed_at: null,
    scheduled_at: null,
    ...overrides,
  } as never;
}

describe('agreementStatusView', () => {
  const booking = (status: 'pending' | 'accepted' | 'agreement_required' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | null) =>
    ({ id: 9, status }) as never;

  it('terminal states win over both signatures present', () => {
    const agreement = makeAgreement({ client_signed_at: '2026-01-01T00:00:00Z', coach_signed_at: '2026-01-02T00:00:00Z' });
    for (const status of ['completed', 'cancelled', 'declined'] as const) {
      const view = agreementStatusView(agreement, 'client-1', booking(status));
      assert.equal(view.kind, status, `status=${status}`);
      assert.equal(view.needsMySignature, false);
      assert.equal(view.presentation, 'compact');
    }
  });

  it('confirmed resolves to a success view, never "confirming"', () => {
    const agreement = makeAgreement({ client_signed_at: '2026-01-01T00:00:00Z', coach_signed_at: '2026-01-02T00:00:00Z' });
    const view = agreementStatusView(agreement, 'client-1', booking('confirmed'));
    assert.equal(view.kind, 'confirmed');
    assert.equal(view.tone, 'success');
    assert.equal(view.needsMySignature, false);
  });

  it('both signed but not confirmed reads as confirming (warning)', () => {
    const agreement = makeAgreement({ client_signed_at: '2026-01-01T00:00:00Z', coach_signed_at: '2026-01-02T00:00:00Z' });
    const view = agreementStatusView(agreement, 'client-1', booking('agreement_required'));
    assert.equal(view.kind, 'confirming');
    assert.equal(view.tone, 'warning');
  });

  it('awaiting_other when only my signature is in', () => {
    const agreement = makeAgreement({ client_signed_at: '2026-01-01T00:00:00Z' });
    const view = agreementStatusView(agreement, 'client-1', booking('agreement_required'));
    assert.equal(view.kind, 'awaiting_other');
    assert.equal(view.needsMySignature, false);
  });

  it('awaiting_you when only the other party has signed', () => {
    const agreement = makeAgreement({ coach_signed_at: '2026-01-02T00:00:00Z' });
    const view = agreementStatusView(agreement, 'client-1', booking('agreement_required'));
    assert.equal(view.kind, 'awaiting_you');
    assert.equal(view.needsMySignature, true);
  });

  it('awaiting_both when nobody has signed', () => {
    const agreement = makeAgreement();
    const view = agreementStatusView(agreement, 'client-1', booking('agreement_required'));
    assert.equal(view.kind, 'awaiting_both');
    assert.equal(view.needsMySignature, true);
  });

  it('booking may be absent (agreement not yet linked) without throwing', () => {
    const agreement = makeAgreement({ coach_signed_at: '2026-01-02T00:00:00Z' });
    const view = agreementStatusView(agreement, 'client-1', null);
    assert.equal(view.kind, 'awaiting_you');
  });
});

/* ------------------------------------------------------------------ */
/* masking — PII masking + authorization                              */
/* ------------------------------------------------------------------ */
describe('masking helpers', () => {
  it('masks usernames keeping first/last, including @ prefix', () => {
    assert.equal(maskUsername('Justin'), 'J*****n');
    assert.equal(maskUsername('@Justin'), '@J*****n');
    assert.equal(maskUsername('JohnDoe'), 'J*****e');
    assert.equal(maskUsername('a'), '*');
    assert.equal(maskUsername('ab'), 'a*');
    assert.equal(maskUsername(''), '');
    assert.equal(maskUsername(null), '');
  });

  it('masks emails keeping domain', () => {
    assert.equal(maskEmail('john.doe@gmail.com'), 'jo*****@gmail.com');
    assert.equal(maskEmail('a@b.com'), '*@b.com');
    assert.equal(maskEmail('ab@b.com'), 'ab*****@b.com');
    assert.equal(maskEmail('not-an-email'), 'n****');
    assert.equal(maskEmail(''), '');
  });

  it('masks PH phone numbers in local and international formats', () => {
    assert.equal(maskPhone('09123456780'), '09******80');
    assert.equal(maskPhone('+63 912 345 6780'), '09******80');
    assert.equal(maskPhone('123'), '***');
    assert.equal(maskPhone(''), '');
  });

  it('maskAddress returns a fixed placeholder', () => {
    assert.equal(maskAddress('Blk 12 Lot 3 SJDM'), '•••••••••••• (Protected)');
    assert.equal(maskAddress(''), '');
  });

  it('maskGeneric keeps the first character and masks the rest', () => {
    assert.equal(maskGeneric('hello world'), 'h****');
    assert.equal(maskGeneric('a'), '*');
  });
});

describe('masking authorization', () => {
  it('canViewUnmasked permits owner, admin, and nobody else', () => {
    assert.equal(canViewUnmasked('user-1', 'user-1'), true);
    assert.equal(canViewUnmasked('user-1', 'user-2'), false);
    assert.equal(canViewUnmasked('user-1', 'user-2', true), true);
    assert.equal(canViewUnmasked(null, 'user-2'), false);
    assert.equal(canViewUnmasked('user-1', null), false);
  });

  it('shouldMask hides from everyone but the owner and admins', () => {
    assert.equal(shouldMask('user-1', 'user-1'), false);
    assert.equal(shouldMask('user-1', 'user-2'), true);
    assert.equal(shouldMask('user-1', 'user-2', true), false);
  });
});

/* ------------------------------------------------------------------ */
/* postgrest — filter-string escaping                                */
/* ------------------------------------------------------------------ */
describe('postgrest escaping', () => {
  it('escapeLikePattern escapes the LIKE metacharacters', () => {
    assert.equal(escapeLikePattern('100% sure'), '100\\% sure');
    assert.equal(escapeLikePattern('under_score'), 'under\\_score');
    assert.equal(escapeLikePattern('back\\slash'), 'back\\\\slash');
  });

  it('quotePostgrestValue double-quotes and escapes backslashes/quotes', () => {
    assert.equal(quotePostgrestValue('simple'), '"simple"');
    assert.equal(quotePostgrestValue('has "quote"'), '"has \\"quote\\""');
    assert.equal(quotePostgrestValue('back\\slash'), '"back\\\\slash"');
  });

  it('ilikeContains builds a safe literal pattern', () => {
    assert.equal(ilikeContains('foo'), '"%foo%"');
    assert.equal(ilikeContains('foo%bar'), '"%foo\\\\%bar%"');
    assert.equal(ilikeContains('a_b'), '"%a\\\\_b%"');
  });

  it('buildOrContains concatenates column ilike filters', () => {
    assert.equal(
      buildOrContains(['title', 'summary'], 'drop'),
      'title.ilike."%drop%",summary.ilike."%drop%"'
    );
    const terms = buildOrContains(['organization'], 'OCHRE (crew)');
    assert.ok(terms.startsWith('organization.ilike."'), 'prefixed column filter');
    assert.ok(terms.endsWith('"'), 'ends with closing quote');
  });

  it('buildAnyContains maps each term to an ilike filter', () => {
    assert.equal(
      buildAnyContains('organization', ['hhi', 'idl']),
      'organization.ilike."%hhi%",organization.ilike."%idl%"'
    );
    assert.equal(buildAnyContains('organization', []), '');
  });
});

/* ------------------------------------------------------------------ */
/* geo — haversine, bounds, sanity                                   */
/* ------------------------------------------------------------------ */
describe('geo helpers', () => {
  it('haversineKm is zero for identical points and sane for known distances', () => {
    assert.equal(haversineKm({ lat: 14.8139, lng: 121.0453 }, { lat: 14.8139, lng: 121.0453 }), 0);
    const sjdmToManila = haversineKm({ lat: 14.8139, lng: 121.0453 }, { lat: 14.5995, lng: 120.9842 });
    assert.ok(sjdmToManila > 15 && sjdmToManila < 35, `SJDM→Manila ≈ 23km, got ${sjdmToManila}`);
  });

  it('formatDistance uses metres below 1 km and km with one decimal above', () => {
    assert.equal(formatDistance(0.4), '400 m');
    assert.equal(formatDistance(0.75), '750 m');
    assert.equal(formatDistance(24.4), '24.4 km');
    assert.equal(formatDistance(Number.NaN), '—');
    assert.equal(formatDistance(-1), '—');
  });

  it('sameCenter treats tiny float drift as identical', () => {
    assert.equal(sameCenter({ lat: 14.8, lng: 121.0 }, { lat: 14.8000000001, lng: 121.0 }), true);
    assert.equal(sameCenter({ lat: 14.8, lng: 121.0 }, { lat: 14.80001, lng: 121.0 }), false);
    assert.equal(sameCenter(null, { lat: 14.8, lng: 121.0 }), false);
  });

  it('isWithinPhilippines accepts PH and rejects other countries', () => {
    assert.equal(isWithinPhilippines(14.8139, 121.0453), true);
    assert.equal(isWithinPhilippines(9.5, 122.5), true);
    assert.equal(isWithinPhilippines(35.6762, 139.6503), false);
    assert.equal(isWithinPhilippines(-33.8688, 151.2093), false);
    assert.equal(isWithinPhilippines(Number.NaN, 121), false);
  });

  it('isValidBounds rejects inverted or out-of-country bounds', () => {
    assert.equal(isValidBounds({ north: 15, south: 14, east: 122, west: 121 }), true);
    assert.equal(isValidBounds({ north: 14, south: 15, east: 122, west: 121 }), false);
  });

  it('boundsAround encloses a radius around a centre', () => {
    const bounds = boundsAround({ lat: 14.8139, lng: 121.0453 }, 5);
    assert.ok(bounds.north > bounds.south, 'north above south');
    assert.ok(bounds.east > bounds.west, 'east above west');
    const center = boundsCenter(bounds);
    assert.ok(Math.abs(center.lat - 14.8139) < 0.5);
    assert.ok(Math.abs(center.lng - 121.0453) < 0.5);
  });

  it('sameBounds compares all four edges exactly', () => {
    const a = { north: 15, south: 14, east: 122, west: 121 };
    assert.equal(sameBounds(a, { ...a }), true);
    assert.equal(sameBounds(a, { ...a, east: 123 }), false);
    assert.equal(sameBounds(null, a), false);
  });
});

/* ------------------------------------------------------------------ */
/* achievements — requirement evaluation                               */
/* ------------------------------------------------------------------ */
describe('achievements requirements', () => {
  it('isFilled treats trimmed strings and real numbers as filled', () => {
    assert.equal(isFilled('x'), true);
    assert.equal(isFilled('  x  '), true);
    assert.equal(isFilled(42), true);
    assert.equal(isFilled(''), false);
    assert.equal(isFilled('   '), false);
    assert.equal(isFilled(null), false);
    assert.equal(isFilled(undefined), false);
  });

  it('profileTaskRequirements for a complete client requires all three rows', () => {
    const requirements = profileTaskRequirements('client', {
      profile: { photo_url: 'https://x/y.png', city_name: 'San Jose del Monte', region_name: 'Region III', barangay_name: 'Kabundukan' },
      roleProfile: { talent: 'Dance' },
    });
    assert.equal(requirements.length, 3);
    assert.ok(requirements.every((r) => r.met));
  });

  it('profileTaskRequirements for an incomplete coach blocks on missing fee', () => {
    const requirements = profileTaskRequirements('coach', {
      profile: { photo_url: 'https://x/y.png', bio: 'I teach dance' },
      roleProfile: { talents: 'Dance', genres: ['hip-hop'], service_fee: null, duration: '1 hour', payment_type: 'gcash' },
    });
    const rates = requirements.find((r) => r.key === 'rates');
    assert.equal(rates?.met, false);
  });

  it('progressForRequirements is 0 with nothing met and 100 with all met', () => {
    assert.equal(progressForRequirements([]), 0);
    assert.equal(
      progressForRequirements([
        { key: 'a', label: 'a', met: true },
        { key: 'b', label: 'b', met: false },
        { key: 'c', label: 'c', met: false },
        { key: 'd', label: 'd', met: true },
      ]),
      50
    );
  });

  it('taskRequirements reports binary tasks via is_completed', () => {
    const task: Parameters<typeof taskRequirements>[0] = {
      id: 'a1',
      slug: 'client_first_booking',
      role: 'client',
      title: 'First confirmed booking',
      description: 'Confirm a booking with a coach',
      icon: 'check',
      badge_name: 'Groove Active',
      badge_description: null,
      badge_image_url: null,
      task_order: 1,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      progress: 100,
      completed_at: '2026-01-01T00:00:00Z',
      unlocked_at: '2026-01-01T00:00:00Z',
      metadata: {},
      is_completed: true,
      requirements: [],
    };
    const requirements = taskRequirements(task, 'client', { profile: {}, roleProfile: {} });
    assert.ok(requirements.every((r) => r.met));
  });
});

/* ------------------------------------------------------------------ */
/* State-machine consistency — bookingStatus vs hub board rules       */
/* ------------------------------------------------------------------ */
const ALL_STATUSES = [
  'pending',
  'accepted',
  'agreement_required',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
  'expired',
  'no_show',
] as const;

const CLOSED_STATUSES = ['declined', 'cancelled', 'expired', 'no_show'] as const;

const TARGET_FOR: Record<string, string> = {
  accepted: 'accepted',
  agreement: 'agreement_required',
  confirmed: 'confirmed',
  in_progress: 'in_progress',
  completed: 'completed',
  closed: '__closed__',
};

describe('boardRules mirrors the SQL guard for coaches', () => {
  for (const from of ALL_STATUSES) {
    for (const colId of ['accepted', 'agreement', 'confirmed', 'in_progress', 'completed', 'closed']) {
      it(`coach ${from} -> ${colId} agrees with isLegalTransition`, () => {
        const drop = canRoleDrop(from, colId, 'coach');
        const legal =
          colId === 'closed'
            ? CLOSED_STATUSES.some((s) => isLegalTransition(from, s))
            : isLegalTransition(from, TARGET_FOR[colId]);
        assert.equal(drop, legal, `${from} -> ${colId}`);
      });
    }
  }
});

describe('boardRules actor policy for clients', () => {
  it('clients may only pull cancellable bookings into closed', () => {
    for (const from of ['pending', 'accepted', 'agreement_required', 'confirmed']) {
      assert.equal(canRoleDrop(from, 'closed', 'client'), true, `${from} -> closed (cancel)`);
    }
    // in_progress is not cancellable in migration 37 — coach-side only.
    assert.equal(canRoleDrop('in_progress', 'closed', 'client'), false);
    assert.equal(canRoleDrop('in_progress', 'completed', 'client'), false);
    assert.equal(canRoleDrop('pending', 'accepted', 'client'), false);
    // Terminal states are immutable for everyone.
    for (const from of ['completed', 'cancelled', 'declined', 'expired', 'no_show']) {
      assert.equal(canRoleDrop(from, 'closed', 'client'), false, `${from}`);
    }
  });
});

describe('boardRules shape', () => {
  it('bucketOf maps every known status to a column and unknowns to closed', () => {
    assert.equal(bucketOf('pending'), 'requested');
    assert.equal(bucketOf('accepted'), 'accepted');
    assert.equal(bucketOf('agreement_required'), 'agreement');
    assert.equal(bucketOf('confirmed'), 'confirmed');
    assert.equal(bucketOf('in_progress'), 'in_progress');
    assert.equal(bucketOf('completed'), 'completed');
    for (const s of CLOSED_STATUSES) assert.equal(bucketOf(s), 'closed', s);
    assert.equal(bucketOf('something-else'), 'closed');
    assert.equal(bucketOf(null), 'closed');
    assert.equal(bucketOf(undefined), 'closed');
  });

  it('every BOARD_COLUMNS id is produced by bucketOf for some status', () => {
    const produced = new Set(ALL_STATUSES.map((s) => bucketOf(s)));
    for (const col of BOARD_COLUMNS) {
      assert.ok(produced.has(col.id), `column ${col.id} is reachable`);
    }
  });

  it('moveOptions never offers a move the board would reject', () => {
    for (const role of ['coach', 'client'] as const) {
      for (const status of ALL_STATUSES) {
        for (const option of moveOptions(status, role)) {
          assert.equal(
            canRoleDrop(status, option.target, role),
            true,
            `${role} ${status} -> ${option.target} (${option.action})`
          );
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* presence — normalisation                                            */
/* ------------------------------------------------------------------ */
describe('presence utils', () => {
  it('isSelfAssignable accepts only the four presence states', () => {
    for (const value of ['online', 'away', 'busy', 'offline']) {
      assert.equal(isSelfAssignable(value), true, value);
    }
    for (const value of ['active', 'pending', 'suspended', 'BUSY', 'online ', '']) {
      assert.equal(isSelfAssignable(value), false, JSON.stringify(value));
    }
  });

  it('displayStatus normalises lifecycle values to offline', () => {
    assert.equal(displayStatus('online'), 'online');
    assert.equal(displayStatus('away'), 'away');
    assert.equal(displayStatus('busy'), 'busy');
    assert.equal(displayStatus('offline'), 'offline');
    assert.equal(displayStatus('active'), 'offline');
    assert.equal(displayStatus('pending'), 'offline');
    assert.equal(displayStatus('suspended'), 'offline');
    assert.equal(displayStatus(null), 'offline');
    assert.equal(displayStatus(undefined), 'offline');
  });

  it('statusMeta and statusLabel are consistent for known values', () => {
    assert.equal(presenceStatusMeta('online').label, 'Online');
    assert.equal(statusLabel('away'), 'Away');
    assert.equal(presenceStatusMeta('unknown-value').value, 'offline');
    assert.equal(statusLabel(undefined), 'Unknown');
    assert.equal(statusLabel('suspended'), 'Suspended');
  });

  it('canBeMessaged is true only for online and away', () => {
    assert.equal(canBeMessaged('online'), true);
    assert.equal(canBeMessaged('away'), true);
    assert.equal(canBeMessaged('busy'), false);
    assert.equal(canBeMessaged('offline'), false);
    assert.equal(canBeMessaged(null), false);
  });
});
