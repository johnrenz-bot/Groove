-- =============================================================================
-- Migration 29 — SUPERSEDED, DO NOT APPLY
-- =============================================================================
-- This file is retained only for numbering continuity. It never worked:
--
--   * Row-security policies have no OLD/NEW records. The policy it tried to
--     create ("Users can update own profile (non-sensitive columns)")
--     references OLD.role inside a CREATE POLICY — PostgreSQL rejects it with
--     "missing FROM-clause entry for table 'old'".
--   * Step 1 of the file drops the ORIGINAL "Users can update own profile"
--     policy BEFORE the failing CREATE. Applied statement-by-statement, that
--     DROP commits and the CREATE does not — leaving members with no
--     self-service profile UPDATE policy at all.
--   * Run as one transaction, the whole file rolls back and accomplishes
--     nothing at all.
--
-- The sensitive-column boundary it was meant to provide is delivered by:
--   * supabase/verification_workflow.sql — guard_verification_fields() and
--     guard_verification_approval() BEFORE UPDATE triggers on profiles
--     (codified here by its presence in the manual-apply order:
--     schema.sql -> admin_hardening.sql -> verification_workflow.sql),
--   * migration 41 §B — caller-authority guards on the achievements RPCs, and
--   * guard_role_assignment() from admin_hardening.sql (role changes pinned
--     to the pinned admin email).
--
-- Applying this file is unnecessary and unsafe. It intentionally does nothing.
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 29 is a no-op — superseded by verification_workflow.sql guards and migration 41. See the header of this file.';
END $$;
