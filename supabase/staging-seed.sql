-- =============================================================================
-- GroovePH — STAGING synthetic test data (manual, owner-applied)
-- =============================================================================
-- Creates two synthetic QA members (the admin account comes from seed_admin.sql):
--   qa-client@example.invalid   (role: client, starts UNVERIFIED)
--   qa-coach@example.invalid    (role: coach,  starts UNVERIFIED)
--
-- Design notes, learned the hard way (verified against the scratch replay):
--   * auth.users INSERT fires handle_new_user(), which creates the profiles row
--     and the client_profiles/coach_profiles sub-row FROM metadata. Hand-inserting
--     profiles rows double-creates and violates the pkey. Do not add them.
--   * guard_verification_fields() allows verification changes only from is_admin()
--     callers, so this seed CANNOT mark accounts verified — not even as postgres.
--     Verification must happen through the app as the pinned staging admin
--     (/admin/verifications), which is also the flow Task 4 wants exercised.
--   * The admin account must be the pinned one (seed_admin.sql, with
--     app.seed_admin_password); a 'qa-admin' account would clamp to 'client' at
--     signup (by design) and could never enter /admin/*.
--
-- SECURITY CONTRACT
--   * Run ONLY after docs/STAGING_MIGRATION_RUNBOOK.md §2 and §4 pass.
--   * Run ONLY on the staging project. Never on production.
--   * Uses example.invalid addresses — unroutable, cannot email real people.
--   * Passwords are NOT stored in this file. Provide them at apply time:
--         SET app.staging_client_password = '…';
--         SET app.staging_coach_password  = '…';
--     Any missing/too-short value aborts the whole script; nothing is created.
--   * No production data is copied or derived.
-- =============================================================================

DO $$
DECLARE
    client_pw TEXT := current_setting('app.staging_client_password', true);
    coach_pw  TEXT := current_setting('app.staging_coach_password', true);
    client_pw_ok BOOLEAN := client_pw IS NOT NULL AND length(client_pw) >= 12;
    coach_pw_ok  BOOLEAN := coach_pw  IS NOT NULL AND length(coach_pw)  >= 12;
BEGIN
    IF NOT client_pw_ok OR NOT coach_pw_ok THEN
        RAISE EXCEPTION
            'Staging seed aborted: set app.staging_client_password and app.staging_coach_password (both >= 12 characters) first. See header.';
    END IF;

    -- ── client ───────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'qa-client@example.invalid') THEN
        INSERT INTO auth.users (
            aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
        ) VALUES (
            'authenticated', 'authenticated', 'qa-client@example.invalid',
            crypt(client_pw, gen_salt('bf', 10)), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"role":"client","firstname":"QA","lastname":"Client","talent":"Dance","custom_id":"QAC001"}'::jsonb,
            FALSE, now(), now()
        );
    END IF;

    -- ── coach ────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'qa-coach@example.invalid') THEN
        INSERT INTO auth.users (
            aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
        ) VALUES (
            'authenticated', 'authenticated', 'qa-coach@example.invalid',
            crypt(coach_pw, gen_salt('bf', 10)), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"role":"coach","firstname":"QA","lastname":"Coach","talents":"Dance","custom_id":"QAC002"}'::jsonb,
            FALSE, now(), now()
        );
    END IF;

    -- Sub-profiles (client_profiles / coach_profiles) and the profiles row are
    -- created by the handle_new_user trigger. Do not insert them here.
    RAISE NOTICE 'Staging seed complete: qa-client@example.invalid / qa-coach@example.invalid (unverified by design)';
END $$;

-- Sanity output for the operator (identifiers only).
SELECT p.role, p.email, p.username, p.status, p.account_verified, p.verification_status
  FROM public.profiles p
 WHERE p.email LIKE 'qa-%@example.invalid'
 ORDER BY 1;
