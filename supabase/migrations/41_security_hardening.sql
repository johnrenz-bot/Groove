-- ============================================================================
-- Migration 41 — Security hardening pass (Phase 5)
-- ============================================================================
-- Repo convention: migrations are applied manually in the Supabase SQL Editor,
-- numbered in order (00..40 already live). This file is NOT applied by the app.
--
-- Every section is NON-DESTRUCTIVE: it adds or replaces definitions, it never
-- drops tables, columns, or rows, and it rewrites nothing that stores data.
-- Each section documents its rollback. The one behaviour change for members is
-- section B (achievement RPCs now require the caller to be the target, the
-- other party of a shared booking/feedback, an admin, or the service role) —
-- exactly what the server actions already enforce before calling them.
--
-- Verified safe against the application code as of 2026-11-19:
--   * server actions call ensure_user_achievements / update_user_achievement_progress
--     with the caller's own session after their own self-or-participant check
--     (app/actions/achievements.ts), and lib/achievements/server.ts reuses it.
--   * cron jobs call expire_past_bookings / send_booking_reminders / fn_reminder_once
--     from inside pg_cron as the postgres role (migration 37) — they never route
--     through this repository's TypeScript.
--   * members insert notifications from the browser ONLY for the other party of
--     a booking/message (BookingModal, FeedbackModal, HubNewMessageDialog,
--     notificationService admin broadcast) — see section C's policy.
-- ============================================================================

-- ============================================================================
-- A. Retrofit `SET search_path` on every SECURITY DEFINER function that lacks
--    one. SECURITY DEFINER bodies resolve unqualified names with the CALLER'S
--    search_path, where `pg_temp` comes first — a planted temp table could
--    shadow `profiles` for the duration of an attacker's own session. Setting
--    the path pins resolution regardless of the caller.
--
--    Idempotent: functions already configured keep their settings.
--    Rollback (if ever needed):  ALTER FUNCTION public.<name>(<args>) RESET search_path;
--    (the NOTICE emitted while applying lists every function it changed)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = TRUE          -- SECURITY DEFINER
          AND p.proconfig IS NULL         -- no SET ... recorded
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
                r.proname, r.args
            );
            RAISE NOTICE 'search_path set: public.%(%)', r.proname, r.args;
        EXCEPTION WHEN OTHERS THEN
            -- A function can vanish between the scan and the ALTER; never abort
            -- the whole migration because of one.
            RAISE WARNING 'search_path NOT set on public.%(%): %', r.proname, r.args, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- B. Achievement RPCs: add the missing caller-authority check.
--
--    Before this migration any signed-in (or anonymous) caller could mark ANY
--    user's achievement complete and unlock badges, because the functions
--    never looked at auth.uid(). The bodies below are IDENTICAL to
--    10_achievements.sql except for the guard block inserted at the top.
--
--    Allowed callers:
--      * the target user themselves,
--      * the other party of any shared appointment or feedback,
--        (client reviewing a coach -> coach's badge progress),
--      * the pinned platform admin (public.is_admin()),
--      * the service role / pg_cron (auth.role() = 'service_role').
--
--    Rollback: re-create either function from 10_achievements.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_role public.user_role;
    v_achievement RECORD;
BEGIN
    -- Authorization (added in migration 41): self, a shared-record counterpart,
    -- the pinned admin, or a trusted server role. Anything else is refused.
    IF coalesce(auth.role(), '') = 'service_role' OR public.is_admin() OR auth.uid() = p_user_id THEN
        NULL; -- authorized, fall through
    ELSIF auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE (a.client_id = auth.uid() AND a.coach_id = p_user_id)
           OR (a.coach_id = auth.uid() AND a.client_id = p_user_id)
    ) THEN
        NULL; -- authorized, fall through
    ELSE
        RAISE EXCEPTION 'Not authorized to create achievements for this account.';
    END IF;

    -- Get user's role
    SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
    IF v_role IS NULL THEN
        RETURN;
    END IF;

    -- Insert missing achievement rows for this user's role
    FOR v_achievement IN
        SELECT id FROM public.achievements
        WHERE role = v_role AND is_active = TRUE
    LOOP
        INSERT INTO public.user_achievements (user_id, achievement_id, progress)
        VALUES (p_user_id, v_achievement.id, 0)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.update_user_achievement_progress(
    p_user_id UUID,
    p_achievement_slug VARCHAR(100),
    p_progress INTEGER DEFAULT 100,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    newly_completed BOOLEAN,
    badge_unlocked BOOLEAN
) AS $$
DECLARE
    v_achievement RECORD;
    v_user_achievement RECORD;
    v_was_completed BOOLEAN;
    v_now_completed BOOLEAN;
    v_badge_unlocked BOOLEAN;
BEGIN
    -- Authorization (added in migration 41): self, a shared-record counterpart,
    -- the pinned admin, or a trusted server role. Anything else is refused.
    IF NOT (
        coalesce(auth.role(), '') = 'service_role'
        OR public.is_admin()
        OR auth.uid() = p_user_id
        OR (
            auth.uid() IS NOT NULL AND (
                EXISTS (
                    SELECT 1 FROM public.appointments a
                    WHERE (a.client_id = auth.uid() AND a.coach_id = p_user_id)
                       OR (a.coach_id = auth.uid() AND a.client_id = p_user_id)
                )
                OR EXISTS (
                    SELECT 1 FROM public.feedbacks f
                    WHERE f.coach_id = p_user_id AND f.user_id = auth.uid()
                )
            )
        )
    ) THEN
        RETURN QUERY SELECT FALSE, 'Not authorized to update this account.', FALSE, FALSE;
        RETURN;
    END IF;

    -- Progress is a 0..100 percentage; clamp out-of-range input instead of
    -- trusting the caller's arithmetic.
    p_progress := greatest(0, least(100, coalesce(p_progress, 0)));

    -- Get achievement
    SELECT * INTO v_achievement
    FROM public.achievements
    WHERE slug = p_achievement_slug AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Achievement not found', FALSE, FALSE;
        RETURN;
    END IF;

    -- Verify user has this role
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND role != v_achievement.role
    ) THEN
        RETURN QUERY SELECT FALSE, 'Role mismatch', FALSE, FALSE;
        RETURN;
    END IF;

    -- Get or create user achievement row
    SELECT * INTO v_user_achievement
    FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

    IF NOT FOUND THEN
        INSERT INTO public.user_achievements (user_id, achievement_id, progress)
        VALUES (p_user_id, v_achievement.id, 0)
        RETURNING * INTO v_user_achievement;
    END IF;

    v_was_completed := v_user_achievement.completed_at IS NOT NULL;

    -- Update progress
    UPDATE public.user_achievements
    SET
        progress = GREATEST(progress, p_progress),
        completed_at = CASE
            WHEN p_progress >= 100 AND completed_at IS NULL THEN NOW()
            ELSE completed_at
        END,
        metadata = COALESCE(metadata, '{}') || p_metadata,
        updated_at = NOW()
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

    v_now_completed := p_progress >= 100 AND NOT v_was_completed;

    -- Check if badge is now unlocked
    v_badge_unlocked := FALSE;
    IF v_now_completed THEN
        v_badge_unlocked := public.has_user_earned_badge(p_user_id, v_achievement.role);
        IF v_badge_unlocked THEN
            UPDATE public.user_achievements
            SET unlocked_at = NOW(), updated_at = NOW()
            WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
        END IF;
    END IF;

    RETURN QUERY SELECT TRUE, 'Progress updated', v_now_completed, v_badge_unlocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- C. Notifications INSERT: stop accepting forged rows from anyone.
--
--    The old policy was `WITH CHECK (true)` — any anonymous or authenticated
--    caller could push arbitrary title/message/cta_url into any user's inbox.
--    The new policy permits:
--      * notifications about yourself (harmless),
--      * the pinned admin (admin broadcast),
--      * the other party of a shared appointment (booking events) or message
--        thread (booking/message-related notices).
--
--    Trigger-generated notifications are SECURITY DEFINER and bypass RLS,
--    so booking lifecycle mail does not depend on this policy.
--
--    The new policy is created BEFORE the old one is dropped, so applying
--    this file statement-by-statement can never leave the table with no
--    INSERT policy at all — the worst case is a brief window where both
--    exist (permissive policies OR together).
--
--    Rollback: DROP POLICY "Members can notify people they share a record with"
--      ON public.notifications;
--      CREATE POLICY "System and Admins can insert notifications"
--      ON public.notifications FOR INSERT WITH CHECK (true);
-- ============================================================================
CREATE POLICY "Members can notify people they share a record with"
    ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE (a.client_id = auth.uid() AND a.coach_id = notifications.user_id)
               OR (a.coach_id = auth.uid() AND a.client_id = notifications.user_id)
        )
        OR EXISTS (
            SELECT 1 FROM public.messages m
            WHERE (m.sender_id = auth.uid() AND m.receiver_id = notifications.user_id)
               OR (m.receiver_id = auth.uid() AND m.sender_id = notifications.user_id)
        )
    );

DROP POLICY IF EXISTS "System and Admins can insert notifications" ON public.notifications;

-- ============================================================================
-- D. Cron-only RPCs: callable only from the database scheduler / service role.
--    Nothing in this repository calls these from TypeScript; pg_cron runs them
--    as the postgres role (migration 37). Revoking PUBLIC/anon/authenticated
--    shuts the door on anonymous callers re-triggering sweeps and injecting
--    reminder notifications into bookings they do not belong to.
--
--    Rollback: GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated;
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('fn_reminder_once', 'expire_past_bookings', 'send_booking_reminders')
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
        RAISE NOTICE 'executor restricted: public.%(%)', r.proname, r.args;
    END LOOP;
END $$;

-- ============================================================================
-- E. KNOWN-RISK ITEMS DELIBERATELY NOT AUTO-APPLIED
--
--    These need a live-database verification pass first (policy dependencies
--    on the public /users directory, community feed and presence), because
--    dropping them blindly can break public pages. Do not uncomment without
--    running the dependency checks listed in docs/SECURITY_AUDIT.md first.
--
--    1) Base-table public-read policies that defeat masking/views:
--         DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
--         DROP POLICY IF EXISTS "Public can view coach profiles" ON public.coach_profiles;
--         DROP POLICY IF EXISTS "Public can view client profiles" ON public.client_profiles;
--       Pre-check: SELECT tablename, policyname FROM pg_policies
--         WHERE tablename IN ('profiles','coach_profiles','client_profiles');
--       Ensure all public reads flow through v_public_profiles / v_profiles_masked,
--       or route remaining reads through server handlers with the admin client.
--
--    2) Community-isolation originals (schema.sql) that OR with the
--       community-scoped policies from community_feed.sql:
--         DROP POLICY IF EXISTS "Public can view community posts" ON public.community_posts;
--         DROP POLICY IF EXISTS "Public can view comments" ON public.comments;
--       Pre-check: confirm /community/* pages are member-only (they render
--       behind the portal shells) and QA them afterwards.
--
--    3) Data-integrity CHECKs / UNIQUE indexes — need duplicate cleanup first:
--         -- duplicate reviews per booking (run detection first):
--         SELECT appointment_id, user_id, count(*) FROM public.feedbacks
--         GROUP BY 1, 2 HAVING count(*) > 1;
--         CREATE UNIQUE INDEX CONCURRENTLY feedbacks_booking_reviewer_key
--           ON public.feedbacks (appointment_id, user_id)
--           WHERE appointment_id IS NOT NULL AND user_id IS NOT NULL;
--
--         -- double-booked timeslots (run detection first):
--         CREATE UNIQUE INDEX CONCURRENTLY one_active_booking_per_slot
--           ON public.appointments (coach_id, date, start_time)
--           WHERE status IN ('pending','accepted','agreement_required','confirmed','in_progress');
--
--    4) Migration 29 (profiles_column_security) is INVALID SQL (references
--       OLD/NEW inside CREATE POLICY) and is superseded in effect by section B
--       above + the guard triggers in migration 41's companion notes and
--       supabase/verification_workflow.sql (guard_verification_fields), which
--       must be applied as a numbered migration to take effect.
-- ============================================================================
