/**
 * The booking lifecycle, in one pure module.
 *
 * WHY PURE AND WHY SEPARATE
 *   Every rule here is a MIRROR of something the database already enforces. The
 *   authority is `guard_booking_transition()` in
 *   `supabase/migrations/02_booking_schema.sql`; this file exists so the UI can
 *   explain a stage in the user's own words and offer only the moves the
 *   database will accept. Nothing here reads React state, formats a date, or
 *   touches Supabase, which makes it checkable without a browser — see
 *   `scripts/test-booking-status.ts`.
 *
 * THE TRANSITION TABLE BELOW IS NOT A GUESS
 *   It is copied from the CASE expression in guard_booking_transition():
 *
 *       pending             -> accepted | declined | cancelled
 *       accepted            -> agreement_required | cancelled | declined
 *       agreement_required  -> confirmed | cancelled
 *       confirmed           -> completed | cancelled
 *       declined | cancelled | completed -> (terminal, nothing)
 *
 *   and `confirmed` additionally requires two signatures, which the client can
 *   never satisfy directly. So the UI does not offer "Confirm" to anybody.
 *
 * WHO MAY DO WHAT
 *   This is the RLS in 02_booking_schema.sql section 8, not a UI preference:
 *     - "Clients can cancel own appointment" allows a client to cancel from
 *       pending / accepted / agreement_required / confirmed, and nothing else.
 *     - "Participants can update appointments" is gated on the actor being
 *       verified and not suspended (guard_booking_transition re-checks this).
 *     - Coaches accept, decline, mark complete and cancel.
 *
 * TERMINAL STATES FIRST
 *   `bookingStatusView` resolves completed / cancelled / declined before any
 *   signature reasoning, because a finished booking usually HAS both signatures
 *   and matching on signatures first is what produced a permanent "Confirming
 *   booking status…" on sessions that already happened. Same ordering as
 *   features/booking/services/agreementStatus.ts — deliberately the same rule
 *   expressed once for the booking and once for the agreement card, each reading
 *   its own columns.
 */

/** `public.appointment_status` — the seven labels in the enum. */
export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'agreement_required'
  | 'confirmed'
  | 'completed'
  | 'declined'
  | 'cancelled';

/** Which side of the booking the signed-in user is on. */
export type BookingRole = 'client' | 'coach';

export type BadgeTone = 'pending' | 'info' | 'success' | 'neutral' | 'danger';

export interface StatusMeta {
  /** Human label. The UI never renders a raw enum label as a heading. */
  label: string;
  /** One sentence explaining what this stage means. */
  description: string;
  badge: BadgeTone;
  /** False for declined / cancelled / completed. */
  isTerminal: boolean;
  /** False until both signatures have landed. */
  isActionable: boolean;
}

/** The single definition of each stage's presentation. */
const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: {
    label: 'Awaiting coach',
    description: 'Your request has been sent. The coach has not responded yet.',
    badge: 'pending',
    isTerminal: false,
    isActionable: true,
  },
  accepted: {
    label: 'Accepted',
    description: 'The coach accepted this request and is preparing the agreement.',
    badge: 'info',
    isTerminal: false,
    isActionable: true,
  },
  agreement_required: {
    label: 'Awaiting signatures',
    description:
      'Both of you need to sign the agreement. The session is confirmed once it is.',
    badge: 'pending',
    isTerminal: false,
    isActionable: true,
  },
  confirmed: {
    label: 'Confirmed',
    description: 'The agreement is signed by both parties. The session is locked in.',
    badge: 'success',
    isTerminal: false,
    isActionable: true,
  },
  completed: {
    label: 'Completed',
    description: 'This session has taken place.',
    badge: 'neutral',
    isTerminal: true,
    isActionable: false,
  },
  declined: {
    label: 'Declined',
    description: 'The coach could not take this request.',
    badge: 'danger',
    isTerminal: true,
    isActionable: false,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This booking was cancelled.',
    badge: 'neutral',
    isTerminal: true,
    isActionable: false,
  },
};

/** Never throws on an unknown label; falls back to the least-committal stage. */
export function statusMeta(status: string | null | undefined): StatusMeta {
  if (!status) {
    return {
      label: 'Unknown',
      description: 'This booking could not be read.',
      badge: 'neutral',
      isTerminal: true,
      isActionable: false,
    };
  }
  return (
    STATUS_META[status as AppointmentStatus] ?? {
      label: status,
      description: 'This booking is in an unrecognised state.',
      badge: 'neutral',
      isTerminal: true,
      isActionable: false,
    }
  );
}

/**
 * The status pipeline, in order. Used to draw progress and to tell the reader how
 * far along a booking is.
 */
export const BOOKING_STAGES: AppointmentStatus[] = [
  'pending',
  'accepted',
  'agreement_required',
  'confirmed',
  'completed',
];

/**
 * How far along the happy path a booking is, as a 0-based index into
 * BOOKING_STAGES. Terminal-off-path states (declined / cancelled) return the
 * index of the last stage they reached, so a cancelled booking still shows how
 * far it got rather than collapsing to the start.
 */
export function stageIndex(status: string | null | undefined): number {
  if (!status) return 0;
  if (status === 'declined' || status === 'cancelled') return 0;
  const idx = BOOKING_STAGES.indexOf(status as AppointmentStatus);
  return idx === -1 ? 0 : idx;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export type BookingAction = 'cancel' | 'accept' | 'decline' | 'complete';

export interface ActionSpec {
  action: BookingAction;
  /** Button label. */
  label: string;
  /** The status this move writes. */
  target: AppointmentStatus;
  variant: 'primary' | 'outline' | 'danger';
  /**
   * Why the control is disabled, when it is. Null means enabled. The UI shows
   * this as the title / hint rather than hiding the button, so a coach is told
   * WHY they cannot accept instead of finding a dead control.
   */
  blockedReason?: string | null;
}

/**
 * The moves available for `status`, to `role`.
 *
 * Derived from the transition table plus the RLS split, so a control can never
 * be offered for a move the database will reject. `accept` is additionally
 * gated on `coachVerified`, mirroring "Verified clients can book appointments"
 * and the actor check at the top of guard_booking_transition().
 */
export function availableActions(args: {
  status: string | null | undefined;
  role: BookingRole;
  /** The coach's own verification state. Only meaningful when role is 'coach'. */
  coachVerified?: boolean;
  /** Set when the viewer is suspended; blocks every write. */
  suspended?: boolean;
}): ActionSpec[] {
  const { status, role, coachVerified = true, suspended = false } = args;
  const out: ActionSpec[] = [];

  if (!status) return out;

  const suspendNote: string | null = suspended
    ? 'Your account is suspended, so bookings cannot be changed.'
    : null;

  if (role === 'coach') {
    // pending -> accepted | declined | cancelled
    if (status === 'pending') {
      out.push({
        action: 'decline',
        label: 'Decline request',
        target: 'declined',
        variant: 'outline',
        // A suspended or unverified account cannot change a booking AT ALL:
        // guard_booking_transition rejects the actor before it ever evaluates the
        // transition. Offering Decline here would be a button the database
        // refuses.
        blockedReason: suspendNote,
      });
      out.push({
        action: 'accept',
        label: 'Accept request',
        target: 'accepted',
        variant: 'primary',
        blockedReason: suspendNote
          ?? (coachVerified
            ? null
            : 'Complete account verification to accept bookings.'),
      });
    }

    // accepted -> agreement_required | cancelled | declined
    if (status === 'accepted') {
      out.push({
        action: 'accept',
        label: 'Send agreement',
        target: 'agreement_required',
        variant: 'primary',
        blockedReason: suspendNote
          ?? (coachVerified
            ? null
            : 'Complete account verification to send the agreement.'),
      });
      out.push({
        action: 'decline',
        label: 'Decline request',
        target: 'declined',
        variant: 'outline',
        blockedReason: suspendNote,
      });
    }

    // confirmed -> completed | cancelled
    if (status === 'confirmed') {
      out.push({
        action: 'complete',
        label: 'Mark completed',
        target: 'completed',
        variant: 'primary',
        blockedReason: suspendNote,
      });
    }
  }

  // Cancel: a client may cancel from any non-terminal stage; a coach may cancel
  // from pending / accepted / agreement_required / confirmed too, which the
  // participant UPDATE policy allows and the guard accepts.
  const cancellable = ['pending', 'accepted', 'agreement_required', 'confirmed'];
  if (cancellable.includes(status)) {
    out.push({
      action: 'cancel',
      label: role === 'client' ? 'Cancel booking' : 'Cancel session',
      target: 'cancelled',
      variant: 'danger',
      blockedReason: suspendNote,
    });
  }

  return out;
}

/**
 * True when `from -> to` is a legal move per the database guard.
 *
 * Exposed so the UI can grey out a control, and so the test script can assert
 * the table directly rather than trusting a rendering.
 */
export function isLegalTransition(from: string, to: string): boolean {
  switch (from) {
    case 'pending':
      return ['accepted', 'declined', 'cancelled'].includes(to);
    case 'accepted':
      return ['agreement_required', 'cancelled', 'declined'].includes(to);
    case 'agreement_required':
      return ['confirmed', 'cancelled'].includes(to);
    case 'confirmed':
      return ['completed', 'cancelled'].includes(to);
    // declined / cancelled / completed are terminal.
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

/** One row of `public.booking_events` — the append-only audit trail. */
export interface BookingEvent {
  id: number | string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor_id: string | null;
  created_at: string;
}

/** A status plus when it happened, for the timeline. */
export interface TimelineStep {
  status: AppointmentStatus;
  label: string;
  /** ISO timestamp, or null when the stage has not been reached. */
  at: string | null;
  reached: boolean;
  /** This is where the booking currently sits. */
  current: boolean;
}

/**
 * Build the progress timeline from the booking's own lifecycle timestamps.
 *
 * Built from the `*_at` columns rather than from `booking_events`, so a booking
 * that predates the audit trigger still shows a correct timeline. The columns are
 * stamped by guard_booking_transition(), so they cannot disagree with the status.
 *
 * HOW FAR A STOPPED BOOKING GOT
 *   A declined or cancelled booking is read from its stamps rather than its final
 *   label: the last stage carrying a timestamp is the last one it actually
 *   passed through. When every stamp is NULL — a booking from before the
 *   lifecycle columns existed — it reports stage 0, which is the honest answer,
 *   because in that case we genuinely cannot tell how far it got.
 */
export function buildTimeline(
  status: string | null | undefined,
  stamps: Partial<Record<AppointmentStatus, string | null>>
): TimelineStep[] {
  const offPath = status === 'declined' || status === 'cancelled';

  let reached = stageIndex(status);

  if (offPath) {
    // Walk forward for the furthest stage the database actually stamped.
    let furthest = 0;
    BOOKING_STAGES.forEach((stage, i) => {
      if (stamps[stage]) furthest = i;
    });
    reached = furthest;
  }

  return BOOKING_STAGES.map((stage, i) => ({
    status: stage,
    label: statusMeta(stage).label,
    at: stamps[stage] ?? null,
    reached: i <= reached,
    current: !offPath && i === reached,
  }));
}

/**
 * Turn the audit rows into readable history, newest first.
 *
 * `booking_events` is written ONLY by the SECURITY DEFINER trigger, so it cannot
 * be forged from a client — a rendering of these rows is a rendering of what the
 * database actually did.
 */
export function historyFromEvents(
  events: readonly BookingEvent[],
  names: Readonly<Record<string, string>>
): { status: string; label: string; who: string; note: string | null; at: string }[] {
  return [...events]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((e) => {
      const who = e.actor_id ? names[e.actor_id] ?? 'Someone' : 'Groove System';
      return {
        status: e.to_status ?? e.event_type,
        label: statusMeta(e.to_status ?? e.event_type).label,
        who,
        note: e.note ?? null,
        at: e.created_at,
      };
    });
}