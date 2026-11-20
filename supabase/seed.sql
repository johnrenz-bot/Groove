-- ==============================================================================
-- GrooveSystem: Supabase Seed Data & System Defaults
-- ==============================================================================

-- 1. Ensure System Settings Exist
--    Only columns that exist in schema.sql (`key`, `value`) are used here.
--    Neutral public defaults; no personal addresses are seeded.
INSERT INTO public.system_settings (key, value)
VALUES
    ('theme', 'light'),
    ('app_name', 'Groove Performing Arts'),
    ('openrouter_model', 'deepseek/deepseek-chat')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Ensure initial announcement exists
INSERT INTO public.announcements (title, message, author, cta_label, cta_url)
VALUES (
    'Welcome to GrooveSystem 2.0',
    'Experience the next generation platform for performing arts coaching, digital agreements, and realtime session bookings.',
    'Admin',
    'Explore Coaches',
    '/talent'
);

-- 3. (Removed) The old seed created a weak-password administrator.
--
-- Admin provisioning now lives in supabase/seed_admin.sql, which requires
-- an explicit app.seed_admin_password setting and seeds only the pinned
-- platform admin (see that file). Do NOT re-add a hardcoded admin password.
