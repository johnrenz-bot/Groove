/**
 * Shared lifecycle stamps — the same map HubCasePanel feeds to the stepper.
 *
 * stampMap reads appointments.<stage>_at flags guarded by the schema, so no
 * invented state: a stage's timestamp is either there or not.
 */
import type { BookingDetail } from '@/features/appointments/services/bookingService';

export function stampMap(detail: BookingDetail): Record<string, string | null> {
  const appointment = detail.appointment as unknown as Record<string, string | null>;
  const keys = [
    'accepted_at',
    'agreement_required_at',
    'confirmed_at',
    'completed_at',
    'declined_at',
    'cancelled_at',
    'in_progress_at',
    'no_show_at',
    'expired_at',
  ] as const;
  const out: Record<string, string | null> = {};
  for (const key of keys) {
    if (key in appointment) out[key.replace(/_at$/, '')] = appointment[key] ?? null;
  }
  return out;
}
