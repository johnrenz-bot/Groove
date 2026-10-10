-- ==============================================================================
-- Achievement & Badge System for Groove PH
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Achievement definitions table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,           -- e.g., 'coach_profile_complete'
    role user_role NOT NULL,                     -- 'client' or 'coach'
    title VARCHAR(150) NOT NULL,                 -- Display title
    description TEXT NOT NULL,                   -- What the user needs to do
    icon VARCHAR(50) NOT NULL,                   -- Lucide icon name
    badge_name VARCHAR(100) NOT NULL,            -- e.g., 'Groove Coach'
    badge_description TEXT,                      -- Badge description when unlocked
    badge_image_url TEXT,                        -- Optional custom badge image
    task_order INTEGER NOT NULL DEFAULT 0,       -- Order in the task list
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User achievement progress tracking
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 0,         -- 0-100 or 0-1 for boolean tasks
    completed_at TIMESTAMPTZ,                    -- When the task was completed
    unlocked_at TIMESTAMPTZ,                     -- When the badge was unlocked (all 3 tasks done)
    metadata JSONB DEFAULT '{}',                 -- Extra data (e.g., appointment_id, review_id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievements_role ON public.achievements(role);

-- RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements: Public can view active achievements
CREATE POLICY "Public can view active achievements" ON public.achievements
    FOR SELECT USING (is_active = TRUE);

-- User achievements: Users can view their own, admins can view all
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- NOTE: user_achievements is intentionally write-inaccessible to clients.
-- All writes happen inside SECURITY DEFINER RPCs (ensure_user_achievements,
-- update_user_achievement_progress), which run as the table owner and are not
-- subject to RLS. A previous `FOR ALL USING (true)` policy exposed every row
-- and allowed writes that bypassed server validation; see migration 14.

-- ==============================================================================
-- Seed Achievement Definitions
-- ==============================================================================

-- Coach Achievements (3 tasks for "Groove Coach" badge)
INSERT INTO public.achievements (slug, role, title, description, icon, badge_name, badge_description, task_order) VALUES
('coach_profile_complete', 'coach', 'Complete Your Coach Profile', 'Add your photo, bio, skills, genres, rates, and payment details', 'UserCheck', 'Groove Coach', 'Awarded to coaches who complete their profile, secure their first booking, and earn their first 5-star review.', 1),
('coach_first_booking', 'coach', 'Secure Your First Booking', 'Get a client to book and confirm a session with you', 'CalendarCheck', 'Groove Coach', 'Awarded to coaches who complete their profile, secure their first booking, and earn their first 5-star review.', 2),
('coach_first_five_star', 'coach', 'Earn a 5-Star Review', 'Receive a 5-star rating from a completed session', 'Star', 'Groove Coach', 'Awarded to coaches who complete their profile, secure their first booking, and earn their first 5-star review.', 3)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    badge_name = EXCLUDED.badge_name,
    badge_description = EXCLUDED.badge_description,
    task_order = EXCLUDED.task_order,
    updated_at = NOW();

-- Client Achievements (3 tasks for "Groove Active" badge)
INSERT INTO public.achievements (slug, role, title, description, icon, badge_name, badge_description, task_order) VALUES
('client_profile_complete', 'client', 'Complete Your Performer Profile', 'Add your photo, talent, and location details', 'UserCheck', 'Groove Active', 'Awarded to performers who complete their profile, book their first session, and share their experience.', 1),
('client_first_booking', 'client', 'Book Your First Session', 'Book and confirm a session with a coach', 'CalendarCheck', 'Groove Active', 'Awarded to performers who complete their profile, book their first session, and share their experience.', 2),
('client_first_review', 'client', 'Leave Your First Review', 'Share feedback after a completed session', 'MessageSquare', 'Groove Active', 'Awarded to performers who complete their profile, book their first session, and share their experience.', 3)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    badge_name = EXCLUDED.badge_name,
    badge_description = EXCLUDED.badge_description,
    task_order = EXCLUDED.task_order,
    updated_at = NOW();

-- ==============================================================================
-- Helper Functions
-- ==============================================================================

-- Get or create user achievement progress rows
CREATE OR REPLACE FUNCTION public.ensure_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_role user_role;
    v_achievement RECORD;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has earned a badge (all 3 role tasks completed)
CREATE OR REPLACE FUNCTION public.has_user_earned_badge(p_user_id UUID, p_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM public.achievements
    WHERE role = p_role AND is_active = TRUE;

    SELECT COUNT(*) INTO v_count
    FROM public.user_achievements ua
    JOIN public.achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id
      AND a.role = p_role
      AND ua.completed_at IS NOT NULL;

    RETURN v_count >= v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's badge unlock status
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
    LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.role = v_role AND a.is_active = TRUE
    GROUP BY a.badge_name, a.badge_description;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user achievement progress (server-side validation)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure achievements exist for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_achievements()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.ensure_user_achievements(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_achievements_created ON public.profiles;
CREATE TRIGGER on_user_achievements_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_achievements();

-- Backfill existing users
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN SELECT id FROM public.profiles LOOP
        PERFORM public.ensure_user_achievements(v_user.id);
    END LOOP;
END $$;