'use client';

/**
 * Booking data access and the status writes.
 *
 * WHAT MOVED HERE AND WHY
 *   Both appointment pages previously each had their own inline Supabase calls.
 *   That produced two divergent behaviours from one database: the client page
 *   silently swallowed every error into `console.error` and then updated local
 *   state anyway, so a rejected cancellation still looked cancelled; while the
 *   coach page surfaced errors but re-notified by hand in places the database
 *   already notifies in (`notify_booking_parties` in
 *   02_booking_schema.sql section 12).
 *
 *   Both now go through here, which:
 *     - THROWS on a failed write instead of pretending it worked,
 *     - translates the database's own error text into something a member can
 *       act on,
 *     - lets the database do the notifying, and
 *     - fetches the audit trail (`booking_events`) that the pages render.
 *
 * NOTHING HERE INVENTS A BUSINESS RULE. Every transition offered comes from
 * `availableActions` in ./bookingStatus, which mirrors guard_booking_transition.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment, Agreement } from '@/lib/types';
import { isActiveStatus } from './bookingTime';
import type { BookingEvent } from './bookingStatus';

/** The columns the lifecycle stamps live in, aliased to the stage name. */
const TIMESTAMP_COLUMNS = [
  'accepted_at',
  'agreement_required_at',
  'confirmed_at',
  'completed_at',
  'declined_at',
  'cancelled_at',
] as const;

/**
 * Translate a Supabase error into a sentence the reader can act on.
 *
 * The raw text comes from the database's own RAISE EXCEPTION messages, which are
 * written for this purpose — surfacing them beats inventing a generic "something
 * went wrong", and it is the only way a user learns that a booking moved on
 * underneath them.
 */
export function explainBookingError(error: { message?: string } | null): string {
  const raw = error?.message ?? '';
  if (!raw) return 'The booking could not be updated. Please try again.';

  if (/Illegal booking transition/i.test(raw)) {
    return 'This booking has already moved to another status. Refresh to see where it is now.';
  }
  if (/verified/i.test(raw) && /may change a booking|booking/i.test(raw)) {
    return 'Your account needs to be verified before you can change this booking.';
  }
  if (/only a verified, non-suspended account/i.test(raw)) {
    return 'Your account is suspended or unverified, so bookings cannot be changed.';
  }
  if (/both signatures are required/i.test(raw)) {
    return 'Both parties must sign the agreement before this session can be confirmed.';
  }
  if (/no agreement exists/i.test(raw)) {
    return 'The agreement for this session has not been created yet.';
  }
  if (/row-level security|violates/i.test(raw)) {
    return 'You do not have permission to change this booking.';
  }
  return raw;
}

/** One booking plus everything the page renders around it. */
export interface BookingDetail {
  appointment: Appointment;
  agreement: Agreement | null;
  events: BookingEvent[];
}

/**
 * Load the viewer's bookings with their agreement and audit trail.
 *
 * The agreement and events are fetched in SEPARATE queries rather than embedded
 * in the select. The `booking_events` select policy filters rows through an
 * EXISTS on `appointments`, and PostgREST evaluates embedded resource filters
 * differently from a top-level one — reading them top-level is both simpler and
 * the behaviour that the policy was written for.
 */
export async function loadBookings(
  supabase: SupabaseClient,
  viewerId: string,
  role: 'client' | 'coach'
): Promise<BookingDetail[]> {
  const column = role === 'client' ? 'client_id' : 'coach_id';
  const counterparty = role === 'client' ? 'coach' : 'client';

  const { data, error } = await supabase
    .from('appointments')
    .select(`*, ${counterparty}:${counterparty}_id(*)`)
    .eq(column, viewerId)
    .order('date', { ascending: false });

  if (error) throw new Error(explainBookingError(error));

  const appointments = (data ?? []) as unknown as Appointment[];
  if (appointments.length === 0) return [];

  const ids = appointments.map((a) => a.id);

  // `in` needs a non-empty list; guarded above, and the empty-array case returns
  // early rather than sending `in.()` which PostgREST rejects.
  const [agreementRes, eventRes] = await Promise.all([
    // The two profiles are joined in because the agreement document renders
    // both party names and the signing modal checks the typed legal name
    // against `agreement[role]`. Without the join those resolve to undefined
    // and the sign button can never match.
    supabase
      .from('agreements')
      .select(
        `*,
         client:client_id (id, firstname, lastname, username, photo_url),
         coach:coach_id  (id, firstname, lastname, username, photo_url)`
      )
      .in('appointment_id', ids),
    supabase
      .from('booking_events')
      .select('*')
      .in('appointment_id', ids)
      .order('created_at', { ascending: true }),
  ]);

  if (agreementRes.error) throw new Error(explainBookingError(agreementRes.error));
  if (eventRes.error) throw new Error(explainBookingError(eventRes.error));

  const agreements = (agreementRes.data ?? []) as unknown as Agreement[];
  const events = (eventRes.data ?? []) as unknown as BookingEvent[];

  // One agreement per booking is enforced by `agreements_appointment_id_key`, a
  // UNIQUE index, so keying by appointment_id cannot collapse two rows.
  const agreementByAppointment = new Map<number, Agreement>();
  for (const a of agreements) {
    if (a.appointment_id != null) agreementByAppointment.set(a.appointment_id, a);
  }

  const eventsByAppointment = new Map<number, BookingEvent[]>();
  for (const e of events) {
    const key = Number((e as unknown as { appointment_id: number }).appointment_id);
    const list = eventsByAppointment.get(key);
    if (list) list.push(e);
    else eventsByAppointment.set(key, [e]);
  }

  return appointments.map((appointment) => ({
    appointment,
    agreement: appointment.id != null ? agreementByAppointment.get(appointment.id) ?? null : null,
    events: eventsByAppointment.get(appointment.id) ?? [],
  }));
}

/**
 * Compare-and-set a booking's status.
 *
 * `.eq('status', from)` makes this atomic: if the booking moved on since the page
 * loaded, the update matches zero rows, PostgREST returns no row, and we raise
 * rather than reporting a move that did not happen. That is what makes a double
 * click safe and what stops two open tabs from silently overwriting each other.
 *
 * `guard_booking_transition` is still the authority — this only makes the common
 * case fail early with a better message.
 */
export async function transitionBooking(
  supabase: SupabaseClient,
  args: {
    appointmentId: number;
    from: string;
    to: string;
    /** Free text stored on the booking as `cancellation_reason`. */
    reason?: string | null;
  }
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: args.to,
    // Keep the dashboard's "Updated … ago" label tied to the write that just
    // happened, even if the deployment has no generic updated_at trigger.
    updated_at: new Date().toISOString(),
  };
  if (args.to === 'cancelled' && args.reason) {
    patch.cancellation_reason = args.reason;
    patch.cancelled_by = null; // set by the database when it can identify the actor
  }
  if (args.to === 'cancelled' || args.to === 'declined' || args.to === 'completed') {
    // A terminal move makes an open reschedule request moot. Clear it in the
    // same write so a closed booking cannot keep offering "Approve new time".
    patch.changes_requested_at = null;
    patch.requested_changes_note = null;
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', args.appointmentId)
    .eq('status', args.from)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(explainBookingError(error));
  if (!data) {
    throw new Error(
      'This booking has already moved to another status. Refresh to see where it is now.'
    );
  }
}

/**
 * Accept a pending request: create the agreement, then move the booking on.
 *
 * THE ORDER IS THE DATABASE'S, NOT OURS
 *   guard_booking_transition allows pending -> accepted -> agreement_required and
 *   refuses a single pending -> agreement_required hop. The agreement is written
 *   BETWEEN the two moves because a booking sitting at 'agreement_required' with
 *   no agreement row is a dead end: confirm_booking_when_both_signed can never
 *   fire without one, so it could never be confirmed.
 *
 *   Each step is idempotent. `agreements_appointment_id_key` is UNIQUE, so a retry
 *   reuses the existing row instead of hitting a constraint error — which matters
 *   because this is called from a button a user can press twice.
 *
 * 'confirmed' is never written from here. Only the both-signed trigger sets it.
 */
export async function acceptBooking(
  supabase: SupabaseClient,
  args: {
    appointment: Appointment;
    /** Built by the caller from the coach's published terms. */
    agreementRow: Record<string, unknown>;
  }
): Promise<{ agreementError: string | null }> {
  const { appointment } = args;
  const from = appointment.status;

  /*
   * Only two starting points mean anything here.
   *
   *   pending  -> accept it (pending -> accepted), then send the agreement
   *   accepted -> the accept already happened; just finish sending the agreement
   *
   * The second case is a real button on the coach page ("Send agreement"), and it
   * is the retry path for a partial failure. Running the pending -> accepted step
   * unconditionally — as the old page did — silently updated zero rows there and
   * only worked by accident, because that page never checked the update matched
   * anything. Doing the same check here but throwing would instead turn a working
   * button into a permanent error, so the starting status is handled explicitly.
   */
  if (from !== 'pending' && from !== 'accepted') {
    throw new Error('This booking is not waiting for an agreement.');
  }

  // --- 1. pending -> accepted (skipped when already accepted) --------------
  // `maybeSingle()` resolves to data === null when zero rows matched, which is
  // exactly the "someone already moved this" case. That is distinct from an
  // error, and conflating the two is what let a double-click report success.
  if (from === 'pending') {
    const { data: acceptedRow, error: acceptErr } = await supabase
      .from('appointments')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', appointment.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (acceptErr) throw new Error(explainBookingError(acceptErr));
    if (!acceptedRow) {
      throw new Error(
        'This request has already moved on. Refresh to see its current status.'
      );
    }
  }

  // --- 2. ensure the agreement exists --------------------------------------
  const { data: existing } = await supabase
    .from('agreements')
    .select('id')
    .eq('appointment_id', appointment.id)
    .maybeSingle();

  if (!existing) {
    const { error: agreementErr } = await supabase.from('agreements').insert({
      ...args.agreementRow,
      client_id: appointment.client_id,
      coach_id: appointment.coach_id,
      appointment_id: appointment.id,
    });
    if (agreementErr) {
      // The booking is legitimately at 'accepted' now. That is a valid resting
      // state, so report it rather than implying the accept failed.
      return {
        agreementError:
          'Request accepted, but the agreement could not be created. Open the booking to send the agreement.',
      };
    }
  }

  // --- 3. accepted -> agreement_required ------------------------------------
  const { data: moved, error: sendErr } = await supabase
    .from('appointments')
    .update({
      status: 'agreement_required',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointment.id)
    .eq('status', 'accepted')
    .select('id')
    .maybeSingle();

  if (sendErr) {
    return {
      agreementError:
        'Request accepted, but sending the agreement failed. Open the booking to retry.',
    };
  }
  if (!moved) {
    return {
      agreementError:
        'Request accepted, but the booking did not advance. Refresh to see its current status.',
    };
  }

  return { agreementError: null };
}

/* -------------------------------------------------------------------------- */
/* Reschedule requests                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Record a requested new time on an existing booking.
 *
 * This is deliberately NOT a status write. `appointment_status` has no
 * `rescheduled` label and `guard_booking_transition` would reject one, so the
 * request uses the two columns migration 02 already provides:
 * `changes_requested_at` and `requested_changes_note`. The booking keeps its
 * current status and its current time until the coach approves the change.
 *
 * The `status` comparison makes the request conditional on the booking not
 * having moved since the card was rendered, the same compare-and-set discipline
 * as `transitionBooking`.
 */
export async function requestReschedule(
  supabase: SupabaseClient,
  args: {
    appointmentId: number;
    fromStatus: string;
    /** Encoded with `encodeRescheduleRequest`. */
    note: string;
  }
): Promise<void> {
  if (!isActiveStatus(args.fromStatus)) {
    throw new Error('This booking is closed, so a new time cannot be requested.');
  }

  const requestedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('appointments')
    .update({
      changes_requested_at: requestedAt,
      requested_changes_note: args.note,
      updated_at: requestedAt,
    })
    .eq('id', args.appointmentId)
    .eq('status', args.fromStatus)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(explainBookingError(error));
  if (!data) {
    throw new Error(
      'This booking has already moved to another status. Refresh to see where it is now.'
    );
  }
}

/**
 * Approve a pending reschedule request by moving the booking's date and time.
 *
 * The status does not change, so the state-machine trigger does not fire and no
 * `booking_events` row is written. The booking's own `updated_at` is stamped in
 * the same statement, which is why the UI can honestly say "Updated … ago"; no
 * lifecycle event is invented for the move. The request columns are cleared at
 * the same time, so the banner cannot outlive the approval.
 */
export async function approveReschedule(
  supabase: SupabaseClient,
  args: {
    appointmentId: number;
    fromStatus: string;
    date: string;
    startTime: string;
    endTime: string;
    /** From the request note, so the stored duration cannot disagree with end_time. */
    durationMinutes?: number | null;
  }
): Promise<void> {
  if (!isActiveStatus(args.fromStatus)) {
    throw new Error('This booking is closed, so a new time cannot be approved.');
  }

  const patch: Record<string, unknown> = {
    date: args.date,
    start_time: args.startTime,
    end_time: args.endTime,
    changes_requested_at: null,
    requested_changes_note: null,
    updated_at: new Date().toISOString(),
  };
  if (args.durationMinutes != null) patch.duration_minutes = args.durationMinutes;

  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', args.appointmentId)
    .eq('status', args.fromStatus)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(explainBookingError(error));
  if (!data) {
    throw new Error(
      'This booking has already moved to another status. Refresh to see where it is now.'
    );
  }
}

/** Clear a request without moving the booking — "keep the original time". */
export async function clearRescheduleRequest(
  supabase: SupabaseClient,
  args: { appointmentId: number; fromStatus: string }
): Promise<void> {
  const { data, error } = await supabase
    .from('appointments')
    .update({
      changes_requested_at: null,
      requested_changes_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.appointmentId)
    .eq('status', args.fromStatus)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(explainBookingError(error));
  if (!data) {
    throw new Error(
      'This booking has already moved to another status. Refresh to see where it is now.'
    );
  }
}

/** The lifecycle timestamp columns for a row, keyed by stage. */
export function stampsFor(appointment: Appointment): Partial<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (const col of TIMESTAMP_COLUMNS) {
    out[col.replace(/_at$/, '')] = (appointment as unknown as Record<string, string | null>)[col] ?? null;
  }
  return out;
}