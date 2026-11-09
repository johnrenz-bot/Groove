-- ==============================================================================
-- GrooveSystem: Column-level security for profiles table
-- Migration 29: Prevent ordinary users from updating security-sensitive columns
-- Apply AFTER schema.sql and admin_hardening.sql. Safe to re-run.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Security-sensitive columns that ordinary users must not modify:
--   role              - authorization boundary
--   account_verified  - verification status
--   email_verified    - email confirmation status
--   email             - identity anchor
--   suspended_at      - admin-only status
--   suspended_reason  - admin-only status
--   approved_at       - admin-only
--   approved_by       - admin-only
--   verification_status - verification workflow
--   verification_rejection_reason - admin-only
--   verification_rejected_document - admin-only
--   verification_reviewed_at - admin-only
--   verification_reviewed_by - admin-only
-- ------------------------------------------------------------------------------

-- Helper function: true when caller is the pinned platform admin
-- (already defined in admin_hardening.sql as public.is_admin())

-- Drop the broad "Users can update own profile" policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Replace with a policy that only allows non-sensitive column updates
-- Users can update their own profile EXCEPT for security-sensitive columns
CREATE POLICY "Users can update own profile (non-sensitive columns)"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent modification of security-sensitive columns by comparing
    -- the OLD and NEW values. Only the pinned admin (via the admin policy)
    -- may change these columns.
    AND (
      (OLD.role IS NOT DISTINCT FROM NEW.role)
      AND (OLD.account_verified IS NOT DISTINCT FROM NEW.account_verified)
      AND (OLD.email_verified IS NOT DISTINCT FROM NEW.email_verified)
      AND (OLD.email IS NOT DISTINCT FROM NEW.email)
      AND (OLD.suspended_at IS NOT DISTINCT FROM NEW.suspended_at)
      AND (OLD.suspended_reason IS NOT DISTINCT FROM NEW.suspended_reason)
      AND (OLD.approved_at IS NOT DISTINCT FROM NEW.approved_at)
      AND (OLD.approved_by IS NOT DISTINCT FROM NEW.approved_by)
      AND (OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status)
      AND (OLD.verification_rejection_reason IS NOT DISTINCT FROM NEW.verification_rejection_reason)
      AND (OLD.verification_rejected_document IS NOT DISTINCT FROM NEW.verification_rejected_document)
      AND (OLD.verification_reviewed_at IS NOT DISTINCT FROM NEW.verification_reviewed_at)
      AND (OLD.verification_reviewed_by IS NOT DISTINCT FROM NEW.verification_reviewed_by)
    )
  );

-- The existing admin policy already allows full access for the pinned admin:
-- CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL USING (public.is_admin());
-- This remains unchanged and covers admin modifications of sensitive columns.