-- ==============================================================================
-- Fix achievement badge status RPC + harden user_achievements RLS
-- ==============================================================================
--
-- 1. get_user_badge_status raised:
--      SQLSTATE 42702  column reference "role" is ambiguous
--    The RETURNS TABLE output column named `role` shadows `profiles.role` in
--    `SELECT role INTO v_role FROM public.profiles`. Every call failed, so the
--    badge always rendered locked. The lookup is now fully qualified.
--
-- 2. user_achievements shipped with `FOR ALL USING (true)`, which exposed every
--    row to any client and permitted writes that bypass server validation.
--    All writes go through SECURITY DEFINER RPCs (which run as the table owner
--    and are not subject to RLS), so the permissive policy is removed and only
--    the "view your own rows" SELECT policy remains.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_badge_status(p_user_id UUID)
RETURNS TABLE (
    role user_role,
    badge_name VARCHAR(100),
    badge_description TEXT,
    tasks_completed INTEGER,
    tasks_total INTEGER,
    unlocked_at TIMESTAMPTZ,
    is_unlocked BOOLEAN
) AS $$
DECLARE
    v_role user_role;
BEGIN
    -- Fully qualify the column: the output parameter named `role` shadows it.
    SELECT p.role INTO v_role
    FROM public.profiles AS p
    WHERE p.id = p_user_id;

    IF v_role IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        v_role,
        a.badge_name,
        a.badge_description,
        COUNT(CASE WHEN ua.completed_at IS NOT NULL THEN 1 END)::INTEGER,
        COUNT(*)::INTEGER,
        MAX(ua.completed_at),
        public.has_user_earned_badge(p_user_id, v_role)
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua
        ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.role = v_role AND a.is_active = TRUE
    GROUP BY a.badge_name, a.badge_description;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the over-broad policy. Reads of a user's own rows are still permitted
-- by the "Users can view own achievements" policy from migration 10.
DROP POLICY IF EXISTS "System can manage user achievements" ON public.user_achievements;
