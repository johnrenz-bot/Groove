-- ==============================================================================
-- GrooveSystem: Admin Account Seed Migration
-- Target Account: admin@gmail.com / Admin123!
-- Role: admin
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
    target_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    admin_encrypted_pw TEXT;
    existing_user_id UUID;
BEGIN
    -- Hash Admin123! using bcrypt (standard Supabase GoTrue algorithm)
    admin_encrypted_pw := crypt('Admin123!', gen_salt('bf', 10));

    -- Check if admin@gmail.com already exists in auth.users
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@gmail.com' LIMIT 1;

    IF existing_user_id IS NULL THEN
        -- Insert new user into auth.users
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
            'admin@gmail.com',
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
        -- Update password and metadata for existing user
        UPDATE auth.users
        SET 
            encrypted_password = admin_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = raw_user_meta_data || '{"role": "admin", "firstname": "System", "lastname": "Admin"}'::jsonb,
            updated_at = NOW()
        WHERE id = existing_user_id;
    END IF;

    -- Defuse any pre-existing 'admin' username held by a non-admin account. This
    -- must run BEFORE the insert below, otherwise the insert collides with it.
    UPDATE public.profiles
    SET username = 'admin_legacy'
    WHERE lower(username) = 'admin'
      AND lower(email) <> 'admin@gmail.com';

    -- Ensure profile exists in public.profiles with role = 'admin'
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
        'admin@gmail.com',
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
        email = 'admin@gmail.com',
        username = 'admin',
        terms_accepted = TRUE,
        email_verified = TRUE,
        account_verified = TRUE,
        updated_at = NOW();

    -- Retire any stale admin rows left over from a previous admin account so
    -- they cannot linger with role='admin' after the email pin moved. Run AFTER
    -- the insert above so it never demotes the current admin.
    UPDATE public.profiles
    SET role = 'client'
    WHERE role = 'admin'
      AND lower(email) <> 'admin@gmail.com';

END $$;
