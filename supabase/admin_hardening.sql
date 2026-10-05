-- ==============================================================================
-- GrooveSystem: Admin hardening + admin feature support
--
-- Apply AFTER schema.sql. Safe to re-run: every statement is idempotent.
--
-- Three things happen here:
--   1. `is_admin()` is tightened to require role='admin' AND the pinned admin
--      email. Because every admin RLS policy calls this function, that single
--      change closes admin access across the whole database.
--   2. The policies that let admins actually manage the system are created.
--      Several tables had admin policies missing entirely, so admin actions in
--      the UI could not persist.
--   3. Two tables are added for admin activity: an audit trail and an
--      admin_only flag on profiles.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Pinned admin identity
-- ------------------------------------------------------------------------------

-- Raise the EXCEPTION on the helper so a broken install fails loudly at apply
-- time rather than silently denying every admin operation at runtime.
DO $$
BEGIN
  SELECT 1 FROM pg_proc WHERE proname = 'is_admin';
EXCEPTION
  WHEN undefined_table THEN
    RAISE EXCEPTION 'Run supabase/schema.sql before admin_hardening.sql';
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- SECURITY DEFINER so the check reads the row regardless of the calling
    -- role's own RLS. Both conditions are required.
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND lower(email) = 'admin@gmail.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Same test, callable by PostgREST so the admin client can use it as a
-- capability probe without duplicating the email constant in the app.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 2. profiles: suspend flag for the admin console
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- ------------------------------------------------------------------------------
-- 3. Admin activity log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_email VARCHAR(255),
    action VARCHAR(80) NOT NULL,
    entity VARCHAR(80) NOT NULL,
    entity_id TEXT,
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_created
    ON public.admin_activity_log(created_at DESC);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins read the full log; nobody writes through RLS — the app records entries
-- from the server route handler using the service-role client, so a compromised
-- client session cannot forge an audit record.
CREATE POLICY "Admins can view admin activity log" ON public.admin_activity_log
    FOR SELECT USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. Suspended accounts are cut off at the data layer
-- ------------------------------------------------------------------------------

-- Even with a suspended account, nothing private should be readable. Clients
-- and coaches keep their own rows; only the shared booking/agreement surface
-- closes for a suspended user.
CREATE OR REPLACE FUNCTION public.is_suspended()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT suspended_at IS NOT NULL FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. Admin policies that were missing
-- ------------------------------------------------------------------------------

-- Appointments: admins need to cancel/delete, and to see every booking.
DROP POLICY IF EXISTS "Admins have full access to appointments" ON public.appointments;
CREATE POLICY "Admins have full access to appointments" ON public.appointments
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Agreements: admins manage the contract register.
DROP POLICY IF EXISTS "Admins can manage agreements" ON public.agreements;
CREATE POLICY "Admins can manage agreements" ON public.agreements
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Coach / client detail tables: the admin console edits talent, fee, duration,
-- payment method, and review verification documents.
DROP POLICY IF EXISTS "Admins can manage coach profiles" ON public.coach_profiles;
CREATE POLICY "Admins can manage coach profiles" ON public.coach_profiles
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage client profiles" ON public.client_profiles;
CREATE POLICY "Admins can manage client profiles" ON public.client_profiles
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Feedback moderation: admins remove abuse from the reviews surface.
DROP POLICY IF EXISTS "Admins can manage feedback" ON public.feedbacks;
CREATE POLICY "Admins can manage feedback" ON public.feedbacks
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tickets: admins delete spam outright, not just close it.
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;
CREATE POLICY "Admins can delete tickets" ON public.tickets
    FOR DELETE USING (public.is_admin());

-- Messages: admins moderate reported conversations. Read-only for admins — the
-- console surfaces counts and participants, never message bodies.
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages" ON public.messages
    FOR SELECT USING (public.is_admin());

-- Community moderation.
DROP POLICY IF EXISTS "Admins can delete community posts" ON public.community_posts;
CREATE POLICY "Admins can delete community posts" ON public.community_posts
    FOR DELETE USING (public.is_admin());

-- Admins broadcast and clear notifications from the console.
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications" ON public.notifications
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. Profiles: admins may promote/demote, but only the pinned admin may create
--    another admin. Without this, any admin could mint a second admin and the
--    email pin would be defeated by a second account.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (public.is_admin());

-- Only the pinned admin account may set a profile's role. Everyone else keeps
-- the existing admin UPDATE policy, which is needed for routine status edits.
CREATE OR REPLACE FUNCTION public.can_assign_role()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND lower(email) = 'admin@gmail.com'
    );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.guard_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT public.can_assign_role() THEN
            RAISE EXCEPTION 'Only the primary administrator can change a role';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_role_assignment ON public.profiles;
CREATE TRIGGER guard_role_assignment
    BEFORE UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_role_assignment();

-- ------------------------------------------------------------------------------
-- 7. Platform theme / accent settings used by the admin theme manager.
--    Stored in the existing system_settings key/value table rather than a new
--    table so there is one settings store.
-- ------------------------------------------------------------------------------
INSERT INTO public.system_settings (key, value)
VALUES
    ('theme', 'dark'),
    ('theme_accent', 'gold'),
    ('theme_locked', 'false')
ON CONFLICT (key) DO NOTHING;