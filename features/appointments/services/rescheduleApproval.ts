/**
 * Approving or keeping a reschedule request — shared by the client and coach
 * pages. The REQUEST is a note (changes_requested_at / requested_changes_note);
 * approving it never invents a status: the booking's date/time move and the
 * request columns clear in the same write (approveReschedule).
 *
 * Validation lives here, once, used identically on both sides of the booking.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment } from '@/lib/types';
import { parseBookingStart, timeToMinutes } from './bookingTime';
import { parseRescheduleRequest } from './rescheduleRequest';
import { approveReschedule, clearRescheduleRequest } from './bookingService';

export interface RescheduleApprovalResult {
  ok: boolean;
  /** Human-readable: why a request could not be applied. */
  error?: string;
}

export async function applyRescheduleRequest(
  supabase: SupabaseClient,
  appointment: Appointment,
  nowMs: number
): Promise<RescheduleApprovalResult> {
  const request = parseRescheduleRequest(
    appointment.requested_changes_note,
    appointment.changes_requested_at
  );
  if (!request?.requestedDate || !request.startTime || !request.endTime) {
    return {
      ok: false,
      error:
        'The requested time was not recorded in the note. Keep the original time and message them to agree a new booking.',
    };
  }

  const requestedStartAt = parseBookingStart(request.requestedDate, request.startTime);
  const requestedEndAt = parseBookingStart(request.requestedDate, request.endTime);
  if (
    !requestedStartAt ||
    !requestedEndAt ||
    requestedEndAt.getTime() <= requestedStartAt.getTime()
  ) {
    return {
      ok: false,
      error:
        'The requested time is incomplete. Keep the original time and message them to agree a new booking.',
    };
  }
  if (requestedStartAt.getTime() <= nowMs) {
    return {
      ok: false,
      error:
        'That requested time has already passed. Keep the original time and message them to agree a new booking.',
    };
  }

  const requestedStart = timeToMinutes(request.startTime);
  const requestedEnd = timeToMinutes(request.endTime);
  const durationMinutes =
    request.durationMinutes ??
    (requestedStart !== null && requestedEnd !== null && requestedEnd > requestedStart
      ? requestedEnd - requestedStart
      : null);

  try {
    await approveReschedule(supabase, {
      appointmentId: appointment.id,
      fromStatus: appointment.status,
      date: request.requestedDate,
      startTime: request.startTime,
      endTime: request.endTime,
      durationMinutes,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'The new time could not be approved.',
    };
  }

  return {
    ok: true,
    error: undefined,
  };
}

/** Drop the request and leave the original time untouched. */
export async function dismissRescheduleRequest(
  supabase: SupabaseClient,
  appointment: Appointment
): Promise<RescheduleApprovalResult> {
  try {
    await clearRescheduleRequest(supabase, {
      appointmentId: appointment.id,
      fromStatus: appointment.status,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : 'The reschedule request could not be cleared.',
    };
  }
}
