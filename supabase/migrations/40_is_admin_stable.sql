-- =============================================================================
-- 40 — is_admin(): plpgsql → SQL, VOLATILE → STABLE (same semantics)
-- =============================================================================
-- Run manually in the Supabase SQL Editor. Idempotent (CREATE OR REPLACE).
--
-- WHY
--   Nearly every RLS policy on every table calls public.is_admin(). As a
--   plpgsql function the planner cannot inline it or treat it as stable, so
--   each policy re-executes the function per row scanned: one EXISTS probe per
--   row. Recreating it as an SQL-language STABLE function lets the planner
--   inline it into the policy expression (a single index probe on the
--   profiles primary key per statement), which measurably speeds up every
--   admin-capable read on this database.
--
-- SEMANTICS
--   Byte-for-byte the same predicate as the hardened definition in
--   supabase/admin_hardening.sql and migrations/27_admin_hardening.sql:
--   the caller must be signed in, have profiles.role = 'admin' AND the pinned
--   admin email. The pinned email is the same one the application
--   (lib/admin/access.ts, falls back to admin@gmail.com) uses; if it is ever
--   changed there it must change here in the same migration window, which is
--   already the case for every other definition in this repo.
--
-- WHAT THIS DOES NOT DO
--   - No policy is created, dropped or altered.
--   - No data is changed; no RLS is weakened or disabled.
--   - STABLE is the truth: auth.uid() cannot change inside one statement.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND lower(email) = 'admin@gmail.com'
  );
$$;
