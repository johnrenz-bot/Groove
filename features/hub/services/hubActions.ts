'use client';

/**
 * Shared hub actions — ONE implementation for client and coach.
 *
 * Every function mirrors exactly what the appointments pages did inline; no
 * new business rules. Signature handling, verification gates and the unique
 * CAS update all remain in bookingService / bookingStatus.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  acceptBooking,
  loadBookings,
  stampsFor,
  transitionBooking,
  type BookingDetail,
} from '@/features/appointments/services/bookingService';
import { buildAgreementTerms } from '@/features/appointments/services/agreementTerms';

export type HubActionKind =
  | 'accept'
  | 'decline'
  | 'start'
  | 'complete'
  | 'no_show'
  | 'cancel';

export interface HubActionResult {
  ok: boolean;
  message?: string;
}

export async function runHubTransition(
  supabase: SupabaseClient,
  args: {
    detail: BookingDetail;
    action: HubActionKind;
    reason?: string | null;
  }
): Promise<HubActionResult> {
  const { detail, action, reason } = args;
  const appointment = detail.appointment;

  if (action === 'accept') {
    try {
      const terms = await buildAgreementTerms(supabase, appointment);
      if (terms.error) {
        return {
          ok: false,
          message: `Agreement could not be prepared (${terms.error}).`,
        };
      }
      const { agreementError } = await acceptBooking(supabase, {
        appointment,
        agreementRow: terms.row,
      });
      if (agreementError) return { ok: false, message: agreementError };
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'The request could not be accepted.',
      };
    }
  }

  const target =
    action === 'decline'
      ? 'declined'
      : action === 'complete'
        ? 'completed'
        : action === 'no_show'
          ? 'no_show'
          : action === 'start'
            ? 'in_progress'
            : 'cancelled';

  try {
    await transitionBooking(supabase, {
      appointmentId: appointment.id,
      from: appointment.status,
      to: target,
      reason: reason ?? null,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'The booking could not be updated.',
    };
  }
}

export { stampsFor, loadBookings };
