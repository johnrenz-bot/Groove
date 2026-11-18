/**
 * Shared types for the Bookings Hub.
 *
 * The hub lists INBOX ROWS derived from two honest sources of truth:
 *   1. Bookings — a member has an active or past appointment with this partner.
 *   2. Messages  — a member has actually exchanged a message with this partner.
 *
 * A partner with neither never appears (no directory dump). Admins are ALWAYS
 * excluded — support contact is a separate explicitly-labelled surface at
 * /support, never inside the hub.
 */
import type { Profile } from '@/lib/types';

export type HubRole = 'client' | 'coach';

export type HubView = 'inbox' | 'board' | 'list' | 'calendar';
export type HubSection = 'messages' | 'appointment' | 'agreement' | 'schedule';
export type InboxFilter = 'all' | 'your-turn' | 'unread' | 'active' | 'closed';

/** One row in the hub inbox — one partner, one relationship. */
export interface InboxRow {
  partnerId: string;
  partner: Profile;
  /** How many booking *rows* the viewer has with this partner. */
  bookingCount: number;
  /** Most recent message body from this partner. */
  lastMessage: string | null;
  lastMessageAt: string | null;
  /** Messages FROM this partner TO the viewer that are unread. */
  unread: number;
  /** True when — and only when — a booking exists between the two. */
  hasBooking: boolean;
  /** The full booking context for this partner, or null for plain DM. */
  booking: import('@/features/appointments/services/bookingService').BookingDetail | null;
}
