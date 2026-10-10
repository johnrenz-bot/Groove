'use client';

/**
 * Which message an agreement card shows, derived from its OWN agreement row and
 * its OWN booking row.
 *
 * WHY THIS IS A SEPARATE MODULE
 *   The status line is the part of the card that was wrong before, so it is the
 *   part that gets its own pure, testable definition. Nothing here reads React
 *   state, formats a date, or touches Supabase — it takes the two rows the
 *   database returned and returns what should be on screen. That makes every
 *   rule below checkable without a browser, and it makes it impossible for the
 *   card and the Contact Overview to disagree about a booking, because both call
 *   this one function.
 *
 * THE BUG THIS FIXES
 *   The old card computed:
 *       bothSigned && !confirmed  ->  "Confirming booking status…"
 *   `confirmed` was read as `appointments.status === 'confirmed'`. But
 *   completed, cancelled and declined bookings are NEVER 'confirmed' — so a
 *   finished or cancelled session, with both signatures long since recorded,
 *   sat there permanently claiming its confirmation was still in flight. The
 *   terminal states have to be tested FIRST, which is what the ordering below
 *   does.
 *
 * SOURCE OF TRUTH
 *   The booking status, never the signature columns. guard_booking_confirmation /
 *   confirm_booking_when_both_signed move the booking on the second signature;
 *   this only reads the result. A missing booking (`booking === null`) is a real
 *   case — an agreement can exist before it is linked — and is handled rather
 *   than assumed away.
 */

import type { BookingAgreement } from './bookingAgreement';

/** `public.appointments.status` — the seven values in `appointment_status`. */
export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'agreement_required'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | null;

/** The appointment columns this module needs. Nothing more. */
export interface AgreementBooking {
  id: number;
  status: BookingStatus;
  /** The booking's own date, used when the agreement has no scheduled_at. */
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  session_type?: string | null;
  is_online?: boolean | null;
}

/**
 * How a card presents itself.
 *
 *  - `full`    the expanded card: header, status line, tiles, actions.
 *  - `compact` a collapsed card for a finished booking: badge, date, and the
 *              two links. Used for completed / cancelled / declined so a long
 *              conversation is not filled with expanded history.
 */
export type AgreementPresentation = 'full' | 'compact';

export type AgreementStatusKind =
  | 'awaiting_both'
  | 'awaiting_other'
  | 'awaiting_you'
  | 'confirming'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined';

export interface AgreementStatusView {
  kind: AgreementStatusKind;
  /** The sentence shown to the user. Never contains a raw enum value. */
  message: string;
  /** Whether this party still has to sign. Drives the gold CTA. */
  needsMySignature: boolean;
  presentation: AgreementPresentation;
  /** `success` | `warning` | `neutral` — the tone of the status line. */
  tone: 'success' | 'warning' | 'neutral';
}

/** The name the "waiting for…" line should use. Falls back to a neutral word. */
function otherPartyName(agreement: BookingAgreement, currentUserId: string): string {
  const iAmClient = agreement.client_id === currentUserId;
  const other = iAmClient ? agreement.coach : agreement.client;
  const name = [other?.firstname, other?.lastname].filter(Boolean).join(' ').trim();
  return name || other?.username || 'the other party';
}

/**
 * Derive the status view for one agreement.
 *
 * `currentUserId` decides which side "you" is on, which is why the same booking
 * reads differently for the coach and the client — and why neither side has to
 * guess.
 *
 * ORDER IS THE CONTRACT. Terminal states are resolved before the signature
 * states, because a terminal booking can also have both signatures, and it must
 * not be reported as "still confirming".
 */
export function agreementStatusView(
  agreement: BookingAgreement,
  currentUserId: string,
  booking: AgreementBooking | null | undefined
): AgreementStatusView {
  const status = booking?.status ?? null;

  const clientSigned = Boolean(agreement.client_signed_at);
  const coachSigned = Boolean(agreement.coach_signed_at);
  const bothSigned = clientSigned && coachSigned;

  const iAmClient = agreement.client_id === currentUserId;
  const mySigned = iAmClient ? clientSigned : coachSigned;
  const otherName = otherPartyName(agreement, currentUserId);

  /* ── 1. Terminal states first ───────────────────────────────────────────
     Checked before anything about signatures precisely because a completed or
     cancelled booking usually HAS both signatures, and matching on signatures
     first is what produced the permanent "Confirming booking status…" on
     finished sessions. */
  if (status === 'completed') {
    return {
      kind: 'completed',
      message: 'Completed',
      needsMySignature: false,
      presentation: 'compact',
      tone: 'neutral',
    };
  }

  if (status === 'cancelled' || status === 'declined') {
    return {
      kind: status === 'cancelled' ? 'cancelled' : 'declined',
      message: status === 'cancelled' ? 'Cancelled' : 'Declined',
      needsMySignature: false,
      presentation: 'compact',
      tone: 'neutral',
    };
  }

  /* ── 2. Confirmed ───────────────────────────────────────────────────────
     Terminal-ish success: both signatures landed and the database moved the
     booking on. Checked before the "both signed" case for the same reason as
     above — this IS the state that "confirming" is waiting for. */
  if (status === 'confirmed') {
    return {
      kind: 'confirmed',
      message: 'Session confirmed',
      needsMySignature: false,
      presentation: 'full',
      tone: 'success',
    };
  }

  /* ── 3. Signature states ──────────────────────────────────────────────── */

  if (bothSigned) {
    /* Both signatures exist but the booking has not reached 'confirmed' yet.
       confirm_booking_when_both_signed() does that in the same transaction as
       the second signature, so this window is genuinely brief. It is also the
       only state in which that sentence is true — which is what the old card
       got wrong. */
    return {
      kind: 'confirming',
      message: 'Both parties have signed. Confirming booking status…',
      needsMySignature: false,
      presentation: 'full',
      tone: 'warning',
    };
  }

  if (mySigned) {
    return {
      kind: 'awaiting_other',
      message: `Signed by you. Waiting for ${otherName}.`,
      needsMySignature: false,
      presentation: 'full',
      tone: 'warning',
    };
  }

  if (clientSigned || coachSigned) {
    /* The other party has signed and this one has not: the only state that
       earns the gold Review & Sign button. */
    return {
      kind: 'awaiting_you',
      message: `${otherName} signed. Your signature is needed.`,
      needsMySignature: true,
      presentation: 'full',
      tone: 'warning',
    };
  }

  /* Neither has signed. A booking still sitting at 'pending' has not been
     accepted and therefore has no agreement to chase yet — but an agreement row
     exists, so it is sent and waiting. The wording stays honest either way. */
  return {
    kind: 'awaiting_both',
    message: 'Agreement sent. Waiting for both signatures.',
    needsMySignature: true,
    presentation: 'full',
    tone: 'warning',
  };
}

/**
 * The session date for a card: the agreement's own `scheduled_at` when it has
 * one, otherwise the linked booking's `date`.
 *
 * Deliberately does NOT fall back to `agreement_date` — that is the day the
 * document was written, which for a future session is a different day from the
 * day it happens, and showing the wrong one on a contract summary is worse than
 * showing nothing.
 */
export function sessionDateFor(
  agreement: BookingAgreement,
  booking?: AgreementBooking | null
): string | null {
  return agreement.scheduled_at ?? booking?.date ?? null;
}

/**
 * Session location. Prefers the agreement's own copy (it is the agreed value),
 * then the booking's. An online session is reported as such rather than showing
 * a street address that will never be visited.
 */
export function sessionLocationFor(
  agreement: BookingAgreement,
  booking?: AgreementBooking | null
): string | null {
  if (booking?.is_online) return 'Online session';
  const value = agreement.location ?? booking?.location ?? null;
  return value && value.trim() ? value.trim() : null;
}

/** Session type, from the agreement then the booking. Null when unset. */
export function sessionTypeFor(
  agreement: BookingAgreement,
  booking?: AgreementBooking | null
): string | null {
  const value = agreement.session_type ?? booking?.session_type ?? null;
  return value && value.trim() ? value.trim() : null;
}
