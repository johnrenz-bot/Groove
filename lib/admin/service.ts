'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  Appointment,
  CoachProfile,
  ClientProfile,
  Feedback,
  Profile,
  Ticket,
} from '@/lib/types';

/**
 * All admin data access in one module.
 *
 * Every function here runs against the caller's own Supabase session, so
 * authorization is enforced by the RLS policies in
 * `supabase/admin_hardening.sql` (which call `public.is_admin()`) rather than by
 * anything in this file. If the session is not the pinned admin account, these
 * calls return empty results or errors — they cannot be talked into returning
 * someone else's data.
 *
 * Reuses the existing tables and joins. No admin-only copies of anything.
 */

export interface AdminUserRecord extends Profile {
  coach_profile?: CoachProfile | null;
  client_profile?: ClientProfile | null;
  /** Admin-only suspension fields added by supabase/admin_hardening.sql */
  suspended_at?: string | null;
  suspended_reason?: string | null;
}

export interface AdminBookingRecord extends Appointment {
  client?: Profile | null;
  coach?: Profile | null;
}

/** Re-exported so admin pages import every record shape from one module. */
export type { Ticket as AdminTicketRecord };

export interface AdminActivityEntry {
  id: number;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Fetch profiles with their role-specific detail row in one pass.
 *
 * `profiles` selects every column including `email`, which the public policy
 * allows, so no extra round trip or service-role client is needed.
 */
export async function fetchUsers(role?: 'client' | 'coach' | 'admin'): Promise<AdminUserRecord[]> {
  const supabase = createClient();

  let query = supabase
    .from('profiles')
    .select(
      '*, coach_profile:coach_profiles(*), client_profile:client_profiles(*)'
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (role) query = query.eq('role', role);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AdminUserRecord[];
}

/**
 * PATCH the parts of a profile the console is allowed to change.
 *
 * `role` is intentionally omitted. Only the pinned admin may change a role, and
 * only from the dedicated role action which additionally writes
 * `raw_user_meta_data` through the auth admin API on the server route.
 */
export async function updateUserProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'firstname'
      | 'middlename'
      | 'lastname'
      | 'contact'
      | 'status'
      | 'bio'
      | 'address_summary'
      | 'street'
      | 'postal_code'
      | 'barangay_name'
      | 'city_name'
      | 'province_name'
      | 'region_name'
    >
  >
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Suspend or reinstate an account.
 *
 * `suspended_at` is the field the database honors (see the `is_suspended()`
 * helper); `status` is kept in sync so the client and coach portals, which read
 * `status`, show the right thing immediately.
 */
export async function setUserSuspension(
  userId: string,
  suspended: boolean,
  reason?: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      status: suspended ? 'suspended' : 'active',
      suspended_at: suspended ? new Date().toISOString() : null,
      suspended_reason: suspended ? reason ?? 'Suspended by administrator' : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

/** Approve or revoke verification, notifying the account either way. */
export async function setUserVerification(
  userId: string,
  verified: boolean,
  role: 'client' | 'coach'
) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {
    account_verified: verified,
    updated_at: new Date().toISOString(),
  };

  if (verified) {
    patch.approved_at = new Date().toISOString();
    patch.status = 'active';
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;

  // The notification insert is best-effort: the verification change itself is
  // what matters, and a notification failure should not report a failed action.
  await supabase.from('notifications').insert({
    user_id: userId,
    title: verified ? 'Account Verification Approved' : 'Account Verification Revoked',
    message: verified
      ? 'Your Groove account has been verified by the administrator. You now have full access to the platform.'
      : 'Your account verification has been revoked by the administrator. Please re-submit your ID documents.',
    cta_url: role === 'coach' ? '/coach/profile' : '/client/profile',
  });
}

/**
 * Approve or reject a verification submission.
 *
 * This replaces the boolean-only `setUserVerification` toggle for the review
 * flow. It records a real state: a rejection stores the admin's reason and the
 * document it applies to, so the account owner can see what has to change
 * instead of only learning that it failed.
 *
 * Guard rails, in order:
 *   1. Approval is refused client-side when a required document is missing, so
 *      the admin gets an explanation instead of a database exception. The same
 *      rule is enforced again by `guard_verification_approval` in the database —
 *      this check is UX, that one is authority.
 *   2. Rejection requires a non-empty reason. A rejection the user cannot act on
 *      is worse than no decision at all.
 *   3. RBAC: the write goes through the caller's own session, and
 *      `guard_verification_fields` in the database raises for any non-admin, so
 *      nothing here is a privilege escalation path.
 *
 * @param reviewedBy the admin's own profile id, recorded as the reviewer.
 */
export async function reviewVerification(params: {
  userId: string;
  decision: 'approve' | 'reject';
  role: 'client' | 'coach';
  /** Required when rejecting; ignored when approving. */
  reason?: string;
  /** Optional: which document the rejection is about. */
  document?: string | null;
  reviewedBy?: string | null;
  /** Present-tense guard supplied by the caller; see approvalBlockMessage(). */
  blockingMessage?: string | null;
}): Promise<void> {
  const { userId, decision, role, reason, document, reviewedBy, blockingMessage } = params;
  const supabase = createClient();
  const now = new Date().toISOString();

  if (decision === 'approve' && blockingMessage) {
    throw new Error(blockingMessage);
  }

  if (decision === 'reject' && !reason?.trim()) {
    throw new Error(
      'A rejection needs a reason so the account owner knows what to correct.'
    );
  }

  const approving = decision === 'approve';
  const profileHref = role === 'coach' ? '/coach/profile' : '/client/profile';

  const patch: Record<string, unknown> = {
    account_verified: approving,
    verification_status: approving ? 'verified' : 'rejected',
    verification_rejection_reason: approving ? null : reason!.trim(),
    verification_rejected_document: approving ? null : document ?? null,
    verification_reviewed_at: now,
    verification_reviewed_by: reviewedBy ?? null,
    updated_at: now,
  };

  if (approving) {
    patch.approved_at = now;
    patch.approved_by = reviewedBy ?? null;
    patch.status = 'active';
  }

  // `select(...)` sets Prefer: return=representation, so PostgREST returns the
  // updated rows and a policy that filters the row out becomes detectable.
  // Without it a write blocked by RLS still returns HTTP 200 with an empty body
  // and `error === null`, which reads as success while nothing was saved.
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('id, verification_status, account_verified');
  if (error) throw error;

  if (!updated || updated.length === 0) {
    throw new Error(
      'The database accepted the request but updated no rows. The signed-in ' +
        "account's RLS policies do not allow writing to this profile, so the " +
        'decision was not saved.'
    );
  }

  // Notification is best-effort, exactly as in setUserVerification: the review
  // itself is what the admin asked for, and the reason is already persisted on
  // the profile where the user will read it.
  await supabase.from('notifications').insert({
    user_id: userId,
    title: approving ? 'Account Verified' : 'Verification Needs Correction',
    message: approving
      ? 'Your Groove account has been verified. You can now book sessions and use every feature that requires a verified account.'
      : `Your verification was not approved. Reason: ${reason!.trim()}${
          document ? ` (Document: ${document})` : ''
        }. Please update the required documents on your profile and an administrator will review them again.`,
    cta_url: profileHref,
  });
}

/**
 * Return a rejected account to the review queue.
 *
 * Separate from `reviewVerification` because the account owner is the one who
 * corrects the documents: the status moves rejected -> pending so the admin
 * queue picks it up again, and the rejection text is cleared because it described
 * the previous submission.
 */
export async function resubmitVerification(userId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      verification_status: 'pending',
      verification_rejection_reason: null,
      verification_rejected_document: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    // Scoped so a caller cannot move an account that is not actually rejected.
    .eq('verification_status', 'rejected');
  if (error) throw error;
}

/**
 * Admin-only list of submissions waiting for a decision.
 *
 * Reuses `fetchUsers()` and filters in memory rather than adding a second query:
 * the console already loads every profile with its detail row, and paging here
 * would be a round trip for a dataset that is platform-sized, not user-scale.
 * Admins are excluded — they are auto-verified and submit no documents.
 */
export async function fetchVerificationQueue(): Promise<AdminUserRecord[]> {
  const users = await fetchUsers();
  return users.filter((u) => u.role !== 'admin');
}

/**
 * Delete a profile.
 *
 * `profiles.id` references `auth.users` with ON DELETE CASCADE, but the reverse
 * direction does not cascade, so the auth account is removed through the server
 * route (service role) after this succeeds. The console always calls the route
 * rather than this function directly.
 */
export async function deleteUserProfile(userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}

/** Edit the coach-specific commercial record. */
export async function updateCoachProfile(
  coachId: string,
  patch: Partial<
    Pick<
      CoachProfile,
      | 'talents'
      | 'genres'
      | 'service_fee'
      | 'duration'
      | 'payment_type'
      | 'payment_provider'
      | 'payment_handle'
      | 'notice_hours'
      | 'notice_days'
      | 'cancellation_method'
    >
  >
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('coach_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', coachId);
  if (error) throw error;
}

/** Edit the client-specific record. */
export async function updateClientProfile(
  clientId: string,
  patch: Partial<Pick<ClientProfile, 'talent'>>
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('client_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', clientId);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

export async function fetchBookings(limit = 300): Promise<AdminBookingRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('*, client:client_id(*), coach:coach_id(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminBookingRecord[];
}

export async function setBookingStatus(
  bookingId: number,
  status: Appointment['status']
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) throw error;
}

export async function deleteBooking(bookingId: number) {
  const supabase = createClient();
  const { error } = await supabase.from('appointments').delete().eq('id', bookingId);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Support & inquiries                                                         */
/* -------------------------------------------------------------------------- */

export async function fetchTickets(limit = 300): Promise<Ticket[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function updateTicket(
  ticketId: number,
  patch: Partial<Pick<Ticket, 'status' | 'priority'>>
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('tickets')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) throw error;
}

export async function deleteTicket(ticketId: number) {
  const supabase = createClient();
  const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Contracts & reviews                                                         */
/* -------------------------------------------------------------------------- */

export async function fetchAgreements() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('agreements')
    .select('*, client:client_id(*), coach:coach_id(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteAgreement(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from('agreements').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchFeedback(): Promise<Feedback[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('feedbacks')
    .select('*, user:user_id(*), coach:coach_id(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Feedback[];
}

export async function deleteFeedback(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from('feedbacks').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Dashboard aggregates                                                        */
/* -------------------------------------------------------------------------- */

export interface AdminOverview {
  clients: number;
  coaches: number;
  admins: number;
  pendingVerification: number;
  suspended: number;
  newThisWeek: number;
  bookingsTotal: number;
  bookingsPending: number;
  bookingsConfirmed: number;
  bookingsCompleted: number;
  bookingsCancelled: number;
  bookingsToday: number;
  openTickets: number;
  totalTickets: number;
  activeNotices: number;
  announcementCount: number;
  coachTalents: string[];
  /** Signed-in coaches per account_status value, for the verification funnel */
  coachVerification: { verified: number; unverified: number };
  revenueEstimate: number;
  /**
   * Minimal directory of non-admin accounts, used by the notification composers
   * on /admin/control and /admin/settings to populate a recipient picker.
   */
  recipients: { id: string; name: string; role: string; status: string }[];
}

/**
 * Everything the dashboard shows, in one batch.
 *
 * Uses `head: true` count queries rather than fetching rows, so the count does
 * not depend on RLS row visibility or on the query limit. Counts and the small
 * talent list are independent, so they run concurrently.
 */
export async function fetchOverview(): Promise<AdminOverview> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // `head: true` count queries return a thenable, not a response — each has to be
  // awaited individually. `run()` exists purely to turn those into plain numbers.
  const run = async (query: PromiseLike<{ count: number | null }>) =>
    (await query).count ?? 0;

  const [
    clients,
    coaches,
    admins,
    pendingVerification,
    suspended,
    newThisWeek,
    bookingsTotal,
    bookingsPending,
    bookingsConfirmed,
    bookingsCompleted,
    bookingsCancelled,
    bookingsToday,
    openTickets,
    totalTickets,
    activeNotices,
    announcementCount,
    coachVerified,
    coachUnverified,
    talentResult,
    agreementResult,
    recipientResult,
  ] = await Promise.all([
    run(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client')),
    run(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach')),
    run(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin')),
    run(
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_verified', false)
        .neq('role', 'admin')
    ),
    run(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended')),
    run(supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo)),
    run(supabase.from('appointments').select('*', { count: 'exact', head: true })),
    run(supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
    run(supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')),
    run(supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completed')),
    run(supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'cancelled')),
    run(supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('date', today)),
    run(supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open')),
    run(supabase.from('tickets').select('*', { count: 'exact', head: true })),
    run(
      supabase
        .from('maintenance_notices')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
    ),
    run(supabase.from('announcements').select('*', { count: 'exact', head: true })),
    run(
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'coach')
        .eq('account_verified', true)
    ),
    run(
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'coach')
        .eq('account_verified', false)
    ),
    supabase.from('coach_profiles').select('talents').limit(500),
    supabase.from('agreements').select('appointment_price').limit(500),
    // Only the fields the recipient pickers render. Fetching whole profile rows
    // here would duplicate the users table for no benefit.
    supabase
      .from('profiles')
      .select('id, firstname, lastname, role, status')
      .neq('role', 'admin')
      .order('firstname')
      .limit(500),
  ]);

  const talents = (talentResult.data ?? []).map((r) => r.talents || '').filter(Boolean);
  const revenueEstimate = (agreementResult.data ?? []).reduce<number>((sum, row) => {
    const value = Number.parseFloat(String(row.appointment_price ?? '').replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    clients,
    coaches,
    admins,
    pendingVerification,
    suspended,
    newThisWeek,
    bookingsTotal,
    bookingsPending,
    bookingsConfirmed,
    bookingsCompleted,
    bookingsCancelled,
    bookingsToday,
    openTickets,
    totalTickets,
    activeNotices,
    announcementCount,
    coachTalents: talents,
    coachVerification: { verified: coachVerified, unverified: coachUnverified },
    revenueEstimate,
    recipients: (recipientResult.data ?? []).map((r) => ({
      id: r.id,
      name: `${r.firstname ?? ''} ${r.lastname ?? ''}`.trim() || 'Unnamed',
      role: String(r.role ?? 'client'),
      status: String(r.status ?? 'active'),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Activity log                                                                */
/* -------------------------------------------------------------------------- */

export async function fetchActivityLog(limit = 50): Promise<AdminActivityEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminActivityEntry[];
}

/* -------------------------------------------------------------------------- */
/* Theme                                                                       */
/* -------------------------------------------------------------------------- */

export interface PlatformSettings {
  theme: string;
  theme_accent: string;
  theme_locked: string;
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const supabase = createClient();
  const { data, error } = await supabase.from('system_settings').select('key, value');
  if (error) throw error;

  const map: Record<string, string> = {};
  (data ?? []).forEach((row) => {
    map[row.key] = row.value ?? '';
  });

  return {
    theme: map.theme || 'dark',
    theme_accent: map.theme_accent || 'gold',
    theme_locked: map.theme_locked || 'false',
  };
}

export async function savePlatformSetting(key: string, value: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Notifications & announcements                                              */
/* -------------------------------------------------------------------------- */

export async function broadcastNotification(userIds: string[], title: string, message: string, ctaUrl?: string) {
  const supabase = createClient();
  if (userIds.length === 0) return;
  const { error } = await supabase.from('notifications').insert(
    userIds.map((user_id) => ({ user_id, title, message, cta_url: ctaUrl ?? null }))
  );
  if (error) throw error;
}

export async function fetchAnnouncements() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAnnouncement(input: {
  title: string;
  message: string;
  cta_url?: string | null;
  cta_label?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: input.title,
      message: input.message,
      author: 'Admin',
      cta_url: input.cta_url ?? null,
      cta_label: input.cta_label ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMaintenanceNotices() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('maintenance_notices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMaintenanceNotice(input: {
  title: string;
  type: string;
  message: string;
  starts_at?: string | null;
  ends_at?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('maintenance_notices')
    .insert({
      title: input.title,
      type: input.type,
      message: input.message,
      is_active: true,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleMaintenanceNotice(id: number, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from('maintenance_notices')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMaintenanceNotice(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from('maintenance_notices').delete().eq('id', id);
  if (error) throw error;
}