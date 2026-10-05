'use client';

/**
 * Messenger data access for Admin <-> Client direct messages.
 *
 * Every function here runs on the caller's own Supabase session. Authorization
 * is enforced entirely by the RLS policies on `public.messages`
 * (`supabase/schema.sql`, plus `supabase/messenger.sql` for read receipts) —
 * nothing in this file grants access, and nothing here can widen it. A client
 * calling `fetchThread` for a conversation they are not part of gets an empty
 * result from Postgres, not a filtered-down one.
 *
 * The admin <-> client pairing is expressed as: the admin and the client are
 * the two ends of the same message row. There is no conversation table and no
 * separate admin inbox, so this module derives threads from `messages` itself
 * rather than inventing a second source of truth.
 */

import { createClient } from '@/lib/supabase/client';
import type { Message, Profile } from '@/lib/types';

/** One end of a conversation, as the messenger sidebar lists it. */
export interface ConversationSummary {
  partner: Profile;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
}

/**
 * Columns selected when reading message history for a thread list.
 *
 * `read_at` is added by `supabase/messenger.sql`. Until that migration has been
 * applied the column does not exist, and PostgREST rejects the WHOLE query with
 * 42703 — an unread badge would otherwise cost the user their entire contact
 * list. So the column is probed once per session and dropped from the select if
 * it is missing, leaving a fully working thread list with no unread counts.
 */
let readAtAvailable: boolean | null = null;

const THREAD_COLUMNS = [
  'id',
  'sender_id',
  'receiver_id',
  'message',
  'media_path',
  'created_at',
  'read_at',
];

type ThreadRow = Pick<
  Message,
  'id' | 'sender_id' | 'receiver_id' | 'message' | 'media_path' | 'created_at'
> & { read_at?: string | null };

/**
 * Select the thread columns, dropping `read_at` when the migration is absent.
 * Resets to probing after a failure so a newly applied migration is picked up.
 */
function selectThreadColumns(): string {
  if (readAtAvailable === false) return THREAD_COLUMNS.filter((c) => c !== 'read_at').join(',');
  return THREAD_COLUMNS.join(',');
}

/**
 * Normalise a PostgREST result into rows.
 *
 * `.select()` with a computed column string widens the row type, so the cast has
 * to go through `unknown`. Errors are surfaced by the caller, not here.
 */
function asRows(data: unknown): ThreadRow[] {
  return Array.isArray(data) ? (data as unknown as ThreadRow[]) : [];
}

/**
 * Run a thread query, transparently retrying without `read_at` when the
 * read-receipt migration has not been applied.
 *
 * The retry has to happen INSIDE this helper. Previously the first call threw the
 * raw PostgREST error and only set a flag, so the caller logged
 * "Could not load unread counts: {}" on every single page load — an error for a
 * missing column that is cosmetic, not a failure of the feature.
 *
 * `{}` is what that message showed because a PostgREST error is a class instance
 * whose own properties are non-enumerable, so `JSON.stringify` yields nothing.
 */
async function queryThreads(
  build: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<ThreadRow[]> {
  const first = await build(selectThreadColumns());
  if (!first.error) {
    readAtAvailable = true;
    return asRows(first.data);
  }

  if (!isMissingReadAt(first.error as { code?: string; message?: string })) {
    throw first.error;
  }

  // Migration not applied: retry without the column so the feature still works,
  // just without unread counts.
  readAtAvailable = false;
  const second = await build(selectThreadColumns());
  if (second.error) throw second.error;
  return asRows(second.data);
}

function noteReadAtFailure(error: { code?: string; message?: string } | null) {
  if (error && isMissingReadAt(error)) readAtAvailable = false;
}

/** Whether an error is PostgREST saying the read-receipt column does not exist. */
function isMissingReadAt(error: { code?: string; message?: string }): boolean {
  return Boolean(
    error && (error.code === '42703' || /read_at/i.test(error.message ?? ''))
  );
}

/**
 * The admin accounts a client may talk to.
 *
 * A client has one real counterpart: the platform administrator. Rather than
 * listing every admin row (there is one pinned admin, but the table is not
 * constrained to a single row), this returns the admins that the client can
 * actually reach. It is a convenience for the sidebar, not a security boundary
 * — RLS decides what a message can be read back by.
 */
export async function fetchAdminPartners(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin')
    .order('firstname', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

/**
 * The clients an admin has an existing thread with, plus any client who has
 * messaged the admin. Ordered by most recent activity so the sidebar leads with
 * whoever needs a reply.
 */
export async function fetchClientPartnersForAdmin(
  adminId: string
): Promise<ConversationSummary[]> {
  const supabase = createClient();

  // Every message the admin sent or received. RLS already limits this to
  // threads the admin is part of, plus (via is_admin) the whole table — which
  // is the intended admin capability.
  const rows = await queryThreads((columns) =>
    supabase
      .from('messages')
      .select(columns)
      .or(`sender_id.eq.${adminId},receiver_id.eq.${adminId}`)
      .order('created_at', { ascending: false })
      .limit(500)
  );

  // The distinct counterpart ids, most-recent-first ordering preserved.
  const seen = new Set<string>();
  const partnerIds: string[] = [];
  for (const row of rows) {
    const other = row.sender_id === adminId ? row.receiver_id : row.sender_id;
    if (other && !seen.has(other)) {
      seen.add(other);
      partnerIds.push(other);
    }
  }

  if (partnerIds.length === 0) {
    // No history yet: offer the client directory so the admin can start one.
    const { data: clients } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('firstname', { ascending: true })
      .limit(200);
    return ((clients ?? []) as Profile[]).map((partner) => ({
      partner,
      lastMessage: null,
      lastMessageAt: null,
      unread: 0,
    }));
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', partnerIds);

  const byId = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));

  return partnerIds
    .map((id) => byId.get(id))
    .filter((p): p is Profile => Boolean(p))
    .map((partner) => {
      const last = rows.find(
        (r) => r.sender_id === partner.id || r.receiver_id === partner.id
      );
      return {
        partner,
        lastMessage: last?.message ?? (last?.media_path ? 'Sent an attachment' : null),
        lastMessageAt: last?.created_at ?? null,
        unread: rows.filter(
          (r) =>
            r.sender_id === partner.id &&
            r.receiver_id === adminId &&
            r.read_at === null
        ).length,
      };
    });
}

/**
 * The client's side of the same list: the admins they have talked to, each
 * with its last message and unread count. Reuses the admin-shaped query so the
 * two portals cannot disagree about what a thread is.
 */
export async function fetchConversationsForUser(userId: string): Promise<ConversationSummary[]> {
  const supabase = createClient();

  const rows = await queryThreads((columns) =>
    supabase
      .from('messages')
      .select(columns)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(500)
  );

  const seen = new Set<string>();
  const partnerIds: string[] = [];
  for (const row of rows) {
    const other = row.sender_id === userId ? row.receiver_id : row.sender_id;
    if (other && !seen.has(other)) {
      seen.add(other);
      partnerIds.push(other);
    }
  }

  if (partnerIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', partnerIds);

  const byId = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));

  return partnerIds
    .map((id) => byId.get(id))
    .filter((p): p is Profile => Boolean(p))
    .map((partner) => {
      const last = rows.find(
        (r) => r.sender_id === partner.id || r.receiver_id === partner.id
      );
      return {
        partner,
        lastMessage: last?.message ?? (last?.media_path ? 'Sent an attachment' : null),
        lastMessageAt: last?.created_at ?? null,
        unread: rows.filter(
          (r) =>
            r.sender_id === partner.id && r.receiver_id === userId && r.read_at === null
        ).length,
      };
    });
}

/**
 * The unread total for a user, for the header badge.
 *
 * Returns 0 when the read-receipt migration has not been applied yet, rather
 * than throwing: a missing badge is a cosmetic gap, not a reason to fail the
 * page that hosts it.
 */
export async function fetchUnreadTotal(userId: string): Promise<number> {
  if (readAtAvailable === false) return 0;
  const supabase = createClient();
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .is('read_at', null);

  noteReadAtFailure(error);
  if (error) return 0;
  return count ?? 0;
}

/** History for one thread, oldest first. Bounded by RLS to participants. */
export async function fetchThread(userId: string, partnerId: string): Promise<Message[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),` +
        `and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Message[];
}

/**
 * Stamp every message the partner sent as read.
 *
 * Bounded by "Recipients can mark messages read" in `supabase/messenger.sql`:
 * only rows where the caller is the receiver and is not the sender can be
 * updated, so this cannot be used to mark someone else's traffic as read.
 */
export async function markThreadRead(userId: string, partnerId: string): Promise<void> {
  if (readAtAvailable === false) return;
  const supabase = createClient();
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', partnerId)
    .eq('receiver_id', userId)
    .is('read_at', null);

  // A missing column means the migration is not applied: there are no receipts
  // to write, which is not worth surfacing to the user. Any other failure is.
  //
  // `readAtAvailable` is re-read through a helper because TypeScript still holds
  // the narrowed `false`-excluded type across this call, which makes a direct
  // comparison here look impossible even though noteReadAtFailure may set it.
  if (error && isMissingReadAt(error)) return;
  if (error) throw error;
}

/** Send a text message. `sender_id` must be the caller; RLS enforces it. */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string
): Promise<Message> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, message: text })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}
