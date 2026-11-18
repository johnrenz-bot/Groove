/**
 * features/appointments/services/agreementTerms.ts
 *
 * Derives the agreement body from the coach's own published terms.
 *
 * Everything written here comes from a real column on coach_profiles or from
 * the booking itself. Where a coach has genuinely left a field blank (both live
 * coaches have notice_hours = 0, notice_days = 0 and a null
 * cancellation_method) the agreement says so in words rather than inventing a
 * policy — a fabricated cancellation window on a document both parties sign
 * would be worse than an acknowledged gap.
 *
 * Extracted from the coach appointments page so the home dashboard's
 * Booking Requests widget can run the exact same accept flow.
 */

import { createClient } from '@/lib/supabase/client';
import type { Appointment } from '@/lib/types';

export async function buildAgreementTerms(
  supabase: ReturnType<typeof createClient>,
  appt: Appointment
): Promise<{ row: Record<string, unknown>; error: string | null }> {
  const { data: coachRow, error: coachErr } = await supabase
    .from('coach_profiles')
    .select('service_fee, duration, payment_type, payment_handle, notice_hours, notice_days, cancellation_method')
    .eq('id', appt.coach_id)
    .maybeSingle();

  if (coachErr) return { row: {}, error: coachErr.message };

  const fee = coachRow?.service_fee ?? null;
  const duration = coachRow?.duration ?? appt.session_type ?? null;
  const noticeHours = coachRow?.notice_hours ?? null;
  const noticeDays = coachRow?.notice_days ?? null;
  const freeMethod = coachRow?.cancellation_method ?? null;

  const noticeWindow = noticeDays
    ? `${noticeDays} day${noticeDays === 1 ? '' : 's'} before the session`
    : noticeHours
      ? `${noticeHours} hour${noticeHours === 1 ? '' : 's'} before the session`
      : null;

  const cancellation = freeMethod
    ? `Cancellation: ${freeMethod}. ${noticeWindow ? `Notice required: ${noticeWindow}.` : ''}`.trim()
    : noticeWindow
      ? `Notice required: ${noticeWindow}. The coach has not published a specific cancellation method.`
      : 'The coach has not published a cancellation policy or notice period. Please confirm cancellation terms with the coach before signing.';

  const paymentLabel =
    coachRow?.payment_type === 'online'
      ? `Online payment${coachRow?.payment_handle ? ` via ${coachRow.payment_handle}` : ''}.`
      : coachRow?.payment_type === 'cash'
        ? 'Cash on site / on completion of the session.'
        : 'Payment method to be confirmed with the coach.';

  const responsibilities = [
    'Client: attend the session at the agreed time and location, and arrive prepared.',
    'Coach: deliver the agreed coaching for the full booked duration.',
    'Either party: give notice as described in the cancellation terms above when cancelling.',
  ].join('\n');

  // start_time is stored as free text ('10:00'), so it is parsed defensively and
  // simply left null when it is not HH:MM rather than producing a wrong instant.
  let scheduledAt: string | null = null;
  const hhmm = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(appt.start_time ?? '');
  if (hhmm && appt.date) {
    const d = new Date(appt.date);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(Number(hhmm[1]), Number(hhmm[2]), 0, 0);
      scheduledAt = d.toISOString();
    }
  }

  return {
    row: {
      version: '1.0',
      status: 'awaiting_signatures',
      agreement_date: appt.date ?? null,
      session_type: appt.session_type ?? null,
      location: appt.location ?? appt.address ?? null,
      rate: fee,
      appointment_price: fee != null ? String(fee) : null,
      session_duration: duration,
      payment_method: coachRow?.payment_type ?? null,
      notice_hours: noticeHours,
      notice_days: noticeDays,
      cancellation_method: freeMethod,
      cancellation_terms: cancellation,
      terms: cancellation,
      payment_terms: paymentLabel,
      responsibilities,
      scheduled_at: scheduledAt,
      content: `Coaching session on ${appt.date ?? 'a date to be agreed'} at ${appt.start_time ?? 'a time to be agreed'} for ${appt.talent ?? 'the requested discipline'}.`,
    },
    error: null,
  };
}
