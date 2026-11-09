-- ==============================================================================
-- GrooveSystem: Legacy admin investigation (SAFE - READ ONLY)
-- Migration 30: Investigate admin@groove.com before cleanup
-- This migration is INVESTIGATION ONLY - no data modifications
-- ==============================================================================

-- 1. Check all admin-role accounts and their metadata
SELECT
    p.id,
    p.role,
    p.email,
    p.username,
    p.account_verified,
    p.email_verified,
    p.created_at,
    p.updated_at,
    u.email_confirmed_at,
    u.raw_user_meta_data
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';

-- 2. Check for any data dependencies on admin@groove.com
-- Appointments where this user is a coach or client
SELECT 'appointments_coach' AS table_name, COUNT(*) AS count
FROM public.appointments WHERE coach_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'appointments_client', COUNT(*)
FROM public.appointments WHERE client_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'agreements_coach', COUNT(*)
FROM public.agreements WHERE coach_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'agreements_client', COUNT(*)
FROM public.agreements WHERE client_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'coach_profiles', COUNT(*)
FROM public.coach_profiles WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'client_profiles', COUNT(*)
FROM public.client_profiles WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'messages_sent', COUNT(*)
FROM public.messages WHERE sender_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'messages_received', COUNT(*)
FROM public.messages WHERE receiver_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'community_posts', COUNT(*)
FROM public.community_posts WHERE author_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'tickets', COUNT(*)
FROM public.tickets WHERE user_id = 'a0000000-0000-0000-0000-000000000001';

-- 3. Check admin activity log entries (if any)
SELECT *
FROM public.admin_activity_log
WHERE admin_id = 'a0000000-0000-0000-0000-000000000001'
   OR admin_email = 'admin@groove.com';

-- 4. Compare with pinned admin (admin@gmail.com)
SELECT
    p.id,
    p.role,
    p.email,
    p.username,
    p.account_verified,
    p.email_verified,
    p.created_at,
    u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email = 'admin@gmail.com';

-- ==============================================================================
-- RECOMMENDED CLEANUP (RUN MANUALLY AFTER REVIEW):
-- ==============================================================================
-- ONLY run this AFTER confirming:
-- 1. admin@groove.com has no critical data dependencies
-- 2. admin@gmail.com is the intended sole administrator
-- 3. The seed_admin.sql retirement logic was intended to demote this account

-- UPDATE public.profiles
-- SET role = 'client'
-- WHERE id = 'a0000000-0000-0000-0000-000000000001'
--   AND lower(email) = 'admin@groove.com';