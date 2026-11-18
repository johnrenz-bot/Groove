import type { Profile } from '@/lib/types';
/**
 * Bookings Hub - inbox assembly (one code path, shared by both portals).
 *
 * WHY ONE MODULE
 *   The hub, the board, the calendar and the unread badge all need the same
 *   answer to the question "which partners matter to this viewer, and what is
 *   the state of each?". Re-deriving it at each call site is what produced the
 *   old divergence (admin partners leaking into the client sidebar, test
 *   accounts appearing in the inbox). Everything here is one deterministic
 *   computation.
 *
 * PARTNER SOURCES (explicit, in priority order)
 *   1. Bookings where client_id/coach_id = viewer - carries full context
 *      (agreement, tracker, timestamps) already loaded and reused.
 *   2. Recent direct messages to/from viewer restricted to the OPPOSITE role -
 *      this is what makes "?user=<id>" open a thread even when no booking
 *      exists yet.
 *
 * MANDATORY FILTERS
 *   - Admins never appear (`memberFacingPartners`).
 *   - Suspended/banned counterparts are excluded (they cannot act anyway).
 *   - Test/demo accounts are excluded everywhere.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import { loadBookings } from '@/features/appointments/services/bookingService';
import { memberFacingPartners } from '../adminExclusion';
import type { HubRole, InboxRow } from '../types';

/** Everything the hub needs for one viewer's session. */
export interface HubSnapshot {
  rows: InboxRow[];
  /** Bookings for this viewer, sorted by start date ASC. */
  bookings: BookingDetail[];
  viewerId: string;
  role: HubRole;
}

export async function loadHubSnapshot(
  supabase: SupabaseClient,
  input: { viewer: Profile; role: HubRole }
): Promise<HubSnapshot> {
  const { viewer, role } = input;
  const counterpart = role === 'client' ? 'coach' : 'client';

  // --- 1. bookings (full context) ------------------------------------------
  const bookings = await loadBookings(supabase, viewer.id, role);

  // --- 2. candidates from bookings -----------------------------------------
  const bookingByPartner = new Map<string, (typeof bookings)[number]>();
  for (const d of bookings) {
    const other = (d.appointment as unknown as Record<string, Profile | null>)[counterpart];
    if (!other?.id || !isActable(other)) continue;
    if (!bookingByPartner.has(other.id)) bookingByPartner.set(other.id, d);
  }

  // --- 3. candidates from direct messages ----------------------------------
  // read_at may not exist yet (messenger.sql) — retry without it.
  let msgRows: Array<{
    id: number;
    sender_id: string;
    receiver_id: string;
    message: string | null;
    media_path: string | null;
    created_at: string;
    read_at?: string | null;
  }>;
  const colsWithRead =
    'id, sender_id, receiver_id, message, media_path, created_at, read_at';
  const colsPlain =
    'id, sender_id, receiver_id, message, media_path, created_at';
  const firstTry = await supabase
    .from('messages')
    .select(colsWithRead)
    .or(`sender_id.eq.${viewer.id},receiver_id.eq.${viewer.id}`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (firstTry.error) {
    const secondTry = await supabase
      .from('messages')
      .select(colsPlain)
      .or(`sender_id.eq.${viewer.id},receiver_id.eq.${viewer.id}`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (secondTry.error) {
      throw new Error(secondTry.error.message ?? 'Could not load messages');
    }
    msgRows = (secondTry.data ?? []) as typeof msgRows;
  } else {
    msgRows = (firstTry.data ?? []) as typeof msgRows;
  }

  const msgsByPartner = new Map<string, NonNullable<typeof msgRows>>();
  for (const row of msgRows ?? []) {
    const other = row.sender_id === viewer.id ? row.receiver_id : row.sender_id;
    if (!other) continue;
    const list = msgsByPartner.get(other);
    if (list) list.push(row);
    else msgsByPartner.set(other, [row]);
  }

  // --- 4. resolve partner profiles once, then filter hard -----------------
  const partnerIds = [...new Set([...bookingByPartner.keys(), ...msgsByPartner.keys()])];
  let partners: Profile[] = [];
  if (partnerIds.length > 0) {
    const { data, error } = await supabase.from('profiles').select('*').in('id', partnerIds);
    if (error) throw new Error(error.message ?? 'Could not load partners');
    partners = memberFacingPartners((data ?? []) as Profile[]).filter(isActable);
  }

  // --- 5. assemble rows ----------------------------------------------------
  const rows: InboxRow[] = partners.map((partner) => {
    const msgs = msgsByPartner.get(partner.id) ?? [];
    const last = msgs[0] ?? null;
    const unread = msgs.filter(
      (r) => r.receiver_id === viewer.id && r.sender_id === partner.id && r.read_at === null
    ).length;
    const booking = bookingByPartner.get(partner.id) ?? null;
    return {
      partnerId: partner.id,
      partner,
      bookingCount: booking ? 1 : 0,
      lastMessage:
        last?.message ?? (last?.media_path ? 'Sent an attachment' : null),
      lastMessageAt: last?.created_at ?? null,
      unread,
      hasBooking: Boolean(booking),
      booking,
    };
  });

  rows.sort((a, b) => {
    const at = a.lastMessageAt ?? a.booking?.appointment.created_at ?? '';
    const bt = b.lastMessageAt ?? b.booking?.appointment.created_at ?? '';
    return String(bt).localeCompare(String(at));
  });

  // --- 6. stable ascending order for the calendar/board -------------------
  const bookingsAsc = [...bookings].sort((left, right) => {
    const at = left.appointment.date ?? '';
    const bt = right.appointment.date ?? '';
    if (at !== bt) return String(at).localeCompare(String(bt));
    return String(left.appointment.start_time ?? '').localeCompare(
      String(right.appointment.start_time ?? '')
    );
  });

  return { rows, bookings: bookingsAsc, viewerId: viewer.id, role };
}

/** 'Actable' = can log in, is not suspended, is not an admin or test account. */
function isActable(p: Pick<Profile, 'role' | 'status'>): boolean {
  if (!p) return false;
  if ((p.role ?? '') === 'admin') return false;
  return p.status !== 'suspended';
}
