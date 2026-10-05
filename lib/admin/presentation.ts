import type { BadgeVariant } from '@/components/ui/Badge';
import type { AppointmentStatus, UserStatus } from '@/lib/types';

/**
 * Single source of truth for turning database values into display language.
 *
 * Every admin page used to invent its own badge mapping inline, which is how
 * "pending" ended up gold in one table and blue in another. Mapping here keeps
 * status color consistent across users, bookings, tickets, and contracts.
 */

export function statusBadge(status: string | null | undefined): BadgeVariant {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'online':
      return 'approved';
    case 'pending':
    case 'open':
    case 'medium':
      return 'pending';
    case 'confirmed':
    case 'scheduled':
    case 'approved':
    case 'high':
    case 'resolved':
      return 'confirmed';
    case 'completed':
    case 'closed':
    case 'low':
      return 'completed';
    case 'cancelled':
    case 'declined':
    case 'suspended':
    case 'critical':
      return 'cancelled';
    case 'busy':
      return 'accent';
    default:
      return 'neutral';
  }
}

export function verificationBadge(verified: boolean | null | undefined): BadgeVariant {
  return verified ? 'approved' : 'pending';
}

/** Human label for an account status value. */
export function statusLabel(status: UserStatus | string | null | undefined): string {
  const value = String(status || '').toLowerCase();
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The account statuses an admin can assign directly. */
export const ASSIGNABLE_STATUSES: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'offline', label: 'Offline' },
];

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'declined',
  'cancelled',
];

export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'];
export const TICKET_PRIORITIES = ['low', 'normal', 'medium', 'high', 'critical'];

/**
 * Talent taxonomy. The `coach_profiles.talents` column is free text, so the
 * dashboard's distribution chart buckets it by substring — the same heuristic
 * the existing dashboard used, kept in one place so it stays consistent.
 */
export const TALENT_BUCKETS: { key: string; label: string; match: string[] }[] = [
  { key: 'dance', label: 'Dance & Choreography', match: ['dance', 'choreo'] },
  { key: 'singing', label: 'Singing & Vocal', match: ['sing', 'vocal'] },
  { key: 'acting', label: 'Acting & Stage Craft', match: ['act'] },
  { key: 'theater', label: 'Musical Theater', match: ['theater', 'theatre', 'thespian'] },
];

/** Buckets raw talent strings into the fixed set above. */
export function bucketTalents(talents: string[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(
    TALENT_BUCKETS.map((b) => [b.key, 0])
  );

  talents.forEach((raw) => {
    const value = raw.toLowerCase();
    const bucket = TALENT_BUCKETS.find((b) => b.match.some((m) => value.includes(m)));
    if (bucket) counts[bucket.key] += 1;
  });

  return counts;
}

/** Full name for a profile row. */
export function fullName(p: { firstname?: string | null; lastname?: string | null } | null | undefined) {
  if (!p) return 'Unknown';
  return `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim() || 'Unnamed';
}

/** Location label with a graceful fallback chain. */
export function locationOf(p: {
  city_name?: string | null;
  province_name?: string | null;
  address_summary?: string | null;
} | null | undefined) {
  if (!p) return '—';
  if (p.city_name) return p.province_name ? `${p.city_name}, ${p.province_name}` : p.city_name;
  return p.address_summary || '—';
}