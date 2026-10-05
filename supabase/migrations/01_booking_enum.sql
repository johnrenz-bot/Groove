-- =============================================================================
-- STEP 1 of 2 (run second) — Booking lifecycle enum labels
-- =============================================================================
-- Run this file ALONE, as its own statement, in the Supabase SQL Editor.
-- It must commit before you run 02_booking_schema.sql.
--
-- WHY IT IS SEPARATE:
-- PostgreSQL cannot use a newly-added enum label in the same transaction that
-- added it:
--     ERROR: unsafe use of new value "accepted" of enum type appointment_status
-- The Supabase SQL Editor wraps a pasted script in one transaction, so adding
-- the labels and using them in the same paste would fail partway through —
-- leaving a half-applied schema. Running the labels first, separately, is the
-- only reliable way in the SQL Editor.
--
-- Idempotent: safe to run more than once. `IF NOT EXISTS` makes a re-run a
-- no-op, and each statement is in its own DO block so one failure cannot stop
-- the other.
--
-- Verified against the live project: the enum currently holds exactly
-- pending, confirmed, declined, cancelled, completed. Probing 'accepted' and
-- 'agreement_required' returns 22P02 (invalid input value for enum).
--
-- Nothing is read from or written to any existing table. No data is at risk.
-- =============================================================================

DO $$
BEGIN
    ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'accepted';
    RAISE NOTICE 'added/present: accepted';
EXCEPTION
    -- duplicate_object is the expected result on a re-run and is NOT an error.
    WHEN duplicate_object THEN RAISE NOTICE 'accepted already present';
    WHEN others THEN RAISE WARNING 'could not add accepted: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'agreement_required';
    RAISE NOTICE 'added/present: agreement_required';
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'agreement_required already present';
    WHEN others THEN RAISE WARNING 'could not add agreement_required: %', SQLERRM;
END $$;

-- Self-check. Expect seven rows.
SELECT enumlabel AS label, enumsortorder AS sort_order
  FROM pg_enum
  JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status'
 ORDER BY enumsortorder;