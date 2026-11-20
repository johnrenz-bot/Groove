-- =============================================================================
-- GroovePH — staging database verification (READ-ONLY)
-- =============================================================================
-- Purpose: produce the actual state of a staging database to compare against
-- docs/DB_SECURITY_VERIFICATION.md (expected values per section).
--
-- Usage (staging only):
--   psql "$STAGING_DB_URL" -f scripts/verify-db-security.sql
--   -- or paste section by section into the Supabase SQL Editor
--
-- This file contains NO DDL, NO DML. It only reads catalogs.
-- Never run it against production without owner approval (it is read-only,
-- but it reveals schema internals — treat output as internal evidence).
-- =============================================================================
\echo '=== 1. RLS enabled on every public table (relrowsecurity must be t) ==='
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY 1;

\echo '=== 2. All policies in public schema (look for USING (true) / WITH CHECK (true)) ==='
SELECT tablename, policyname, cmd,
       coalesce(qual, '') AS using_expr,
       coalesce(with_check, '') AS check_expr
  FROM pg_policies
 WHERE schemaname = 'public'
 ORDER BY tablename, policyname;

\echo '=== 3. Notification INSERT policies (expect only the participant-scoped one) ==='
SELECT policyname, cmd, coalesce(with_check, '') AS check_expr
  FROM pg_policies
 WHERE tablename = 'notifications' AND cmd = 'INSERT';

\echo '=== 4. SECURITY DEFINER functions: search_path + volatility (proconfig non-null expected) ==='
SELECT p.proname,
       p.prosecdef AS is_definer,
       coalesce(p.proconfig::text, 'NO SEARCH_PATH') AS config,
       p.provolatile
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef
 ORDER BY 1;

\echo '=== 5. Cron-only RPCs and their execute grants (expect service_role only) ==='
SELECT p.proname, p.proacl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('expire_past_bookings', 'send_booking_reminders', 'fn_reminder_once');

\echo '=== 6. Achievement RPCs (expect prosecdef=t and a search_path setting) ==='
SELECT p.proname, p.prosecdef, p.proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('update_user_achievement_progress', 'ensure_user_achievements');

\echo '=== 7. Triggers on appointments/agreements/profiles (expect O = enabled) ==='
SELECT t.tgname, c.relname AS table_name, t.tgenabled
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE NOT t.tgisinternal
 ORDER BY 2, 1;

\echo '=== 8. Realtime publication membership (profiles must NOT appear — H-8) ==='
SELECT pubname, tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
 ORDER BY 2;

\echo '=== 9. Unique indexes the schema relies on ==='
SELECT indexname, tablename
  FROM pg_indexes
 WHERE indexname IN ('agreements_appointment_id_key',
                     'unique_post_user_react',
                     'user_achievements_user_id_achievement_id_key',
                     'profile_follows_pkey')
    OR indexdef ILIKE '%NULLS NOT DISTINCT%'
 ORDER BY 1;

\echo '=== 10. Foreign keys on hot tables ==='
SELECT conrelid::regclass AS table_name, conname, confrelid::regclass AS referenced
  FROM pg_constraint
 WHERE contype = 'f'
   AND conrelid::regclass::text IN
       ('notifications','appointments','agreements','messages','booking_events','feedbacks','profile_follows')
 ORDER BY 1, 2;

\echo '=== 11. CHECK constraints on guarded columns ==='
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE contype = 'c'
   AND conrelid::regclass::text IN
       ('appointments','feedbacks','post_reacts','user_achievements',
        'dance_updates','singing_updates','acting_updates','theater_updates','studios')
 ORDER BY 1, 2;

\echo '=== 12. Storage buckets (expect all public=f) ==='
SELECT id, name, public, file_size_limit
  FROM storage.buckets
 ORDER BY 1;

\echo '=== 13. Storage object policies by bucket (expect owner/admin-scoped) ==='
SELECT tablename, policyname, cmd, coalesce(qual, '') AS using_expr
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
 ORDER BY 1, 2;

\echo '=== Verification complete. Compare against docs/DB_SECURITY_VERIFICATION.md — every section has an expected value. ==='
