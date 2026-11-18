-- =============================================================================
-- 38 — Performance indexes for the hottest application read paths
-- =============================================================================
-- Run manually in the Supabase SQL Editor (like the other numbered migrations).
-- Idempotent: every statement is CREATE INDEX IF NOT EXISTS. Nothing here
-- rewrites, drops or narrows existing data; no RLS policy, trigger, function
-- or column is touched. Safe to re-run.
--
-- WHY (queries audited in the application code)
--
--   1. Dashboard + calendar appointment lists
--        appointments
--          .select('id', { count: 'exact', head: true })
--          .eq('client_id'|'coach_id', $id)
--          .in('status', ['pending','accepted','agreement_required','confirmed'])
--          .gte('date', today)
--      The existing single-column indexes (client_id / coach_id / status /
--      date) let Postgres satisfy this with a bitmap AND of up to four scans.
--      A composite index answers it with one ordered scan. Both roles.
--      features/home/services/homeService.ts, the calendars and booking
--      timelines all use this shape.
--
--   2. Coach reviews + average rating
--        feedbacks .eq('coach_id', $id) ORDER BY created_at DESC
--      No index on feedbacks.coach_id existed (only the partial
--      feedbacks_appointment_id_idx), so every coach dashboard and every coach
--      profile review panel seq-scanned the whole feedbacks table.
--      features/home/services/homeService.ts (fetchCoachReviews,
--      attachCoachRatings).
--
--   3. Conversation list ("last message per partner")
--        messages .or(sender_id.eq.$me, receiver_id.eq.$me)
--                  ORDER BY created_at DESC LIMIT 500
--      idx_messages_pair(sender_id, receiver_id) matches neither the OR branch
--      order nor the ORDER BY. Per-branch composite indexes on
--      (sender_id, created_at) and (receiver_id, created_at) let Postgres
--      merge two index scans in order. lib/messenger/queries.ts
--      (fetchConversationsForUser / fetchConversationsForAdmin / fetchThread).
--
--   4. Notification bell
--        notifications .eq('user_id', $me) ORDER BY created_at DESC LIMIT 10
--      The only notification index is a partial on unread rows; the recency
--      ordering had no support.
--      components/shared/NotificationDropdown.tsx.
--
-- Verified against the query shapes in the codebase on 2026-11-18. If a name
-- below ever collides with an existing index created outside this file, the
-- IF NOT EXISTS clause makes that a no-op.
-- =============================================================================

-- 1. Appointment dashboards / calendars (both roles, both directions of the FK)
CREATE INDEX IF NOT EXISTS appointments_client_status_date_idx
  ON public.appointments (client_id, status, date);

CREATE INDEX IF NOT EXISTS appointments_coach_status_date_idx
  ON public.appointments (coach_id, status, date);

-- 2. Coach reviews: average + latest-three + reviewer lookup
CREATE INDEX IF NOT EXISTS feedbacks_coach_created_idx
  ON public.feedbacks (coach_id, created_at DESC);

-- 3. Conversation lists and threads: ORDER BY created_at DESC per direction
CREATE INDEX IF NOT EXISTS messages_sender_created_idx
  ON public.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_created_idx
  ON public.messages (receiver_id, created_at DESC);

-- 4. Notification bell: newest-first page per user
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

-- 5. Coach/profile showcase rows and the "posts by author" count
--      community_posts .eq('author_id', $id) ORDER BY created_at DESC
--    No index existed; both the profile showcase and the leaderboard read it.
CREATE INDEX IF NOT EXISTS community_posts_author_created_idx
  ON public.community_posts (author_id, created_at DESC);

-- 6. Reactions-per-user count for the leaderboard / profile stats
--      post_reacts .select('user_id') (aggregated client-side)
CREATE INDEX IF NOT EXISTS post_reacts_user_idx
  ON public.post_reacts (user_id);

-- 7. Admin ticket queue: .eq('status', 'open') count on every admin dashboard
CREATE INDEX IF NOT EXISTS tickets_status_idx
  ON public.tickets (status);

-- 8. Verified-coach directory filter: .eq('account_verified', true)
--    Partial: only true rows are ever queried.
CREATE INDEX IF NOT EXISTS profiles_account_verified_idx
  ON public.profiles (account_verified)
  WHERE account_verified = true;

-- 9. Reviews left BY a member (achievements + profile history)
CREATE INDEX IF NOT EXISTS feedbacks_user_created_idx
  ON public.feedbacks (user_id, created_at DESC);
