-- ==============================================================================
-- GrooveSystem: Supabase Seed Data & System Defaults
-- ==============================================================================

-- 1. Ensure System Settings Exist
INSERT INTO public.system_settings (key, value, previous_contact_email, contact_email_updated_at)
VALUES 
    ('theme', 'light', NULL, NULL),
    ('app_name', 'Groove Performing Arts', NULL, NULL),
    ('support_email', 'support@groovesystem.com', NULL, NULL),
    ('openrouter_model', 'deepseek/deepseek-chat', NULL, NULL),
    ('contact_email', 'grooveyyph@gmail.com', 'Groove1152000@gmail.com', NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    previous_contact_email = COALESCE(system_settings.previous_contact_email, 'Groove1152000@gmail.com'),
    contact_email_updated_at = COALESCE(system_settings.contact_email_updated_at, NOW());

-- 2. Ensure initial announcement exists
INSERT INTO public.announcements (title, message, author, cta_label, cta_url)
VALUES (
    'Welcome to GrooveSystem 2.0',
    'Experience the next generation platform for performing arts coaching, digital agreements, and realtime session bookings.',
    'Admin',
    'Explore Coaches',
    '/talent'
);

-- 3. Seed Default Administrator Account: admin@groove.com / Admin123!
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
    target_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    admin_encrypted_pw TEXT;
    existing_user_id UUID;
BEGIN
    admin_encrypted_pw := crypt('Admin123!', gen_salt('bf', 10));

    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@groove.com' LIMIT 1;

    IF existing_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            target_admin_id,
            'authenticated',
            'authenticated',
            'admin@groove.com',
            admin_encrypted_pw,
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"role": "admin", "firstname": "System", "lastname": "Admin"}'::jsonb,
            FALSE,
            NOW(),
            NOW()
        );
        existing_user_id := target_admin_id;
    ELSE
        UPDATE auth.users
        SET 
            encrypted_password = admin_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = raw_user_meta_data || '{"role": "admin", "firstname": "System", "lastname": "Admin"}'::jsonb,
            updated_at = NOW()
        WHERE id = existing_user_id;
    END IF;

    INSERT INTO public.profiles (
        id,
        custom_id,
        role,
        firstname,
        lastname,
        email,
        username,
        status,
        terms_accepted,
        email_verified,
        account_verified,
        created_at,
        updated_at
    ) VALUES (
        existing_user_id,
        'ADM001',
        'admin',
        'System',
        'Admin',
        'admin@groove.com',
        'admin',
        'offline',
        TRUE,
        TRUE,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        email = 'admin@groove.com',
        username = 'admin',
        terms_accepted = TRUE,
        email_verified = TRUE,
        account_verified = TRUE,
        updated_at = NOW();

    UPDATE public.profiles
    SET role = 'admin'
    WHERE email = 'admin@groove.com' OR username = 'admin';

END $$;
