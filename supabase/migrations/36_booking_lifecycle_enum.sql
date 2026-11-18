-- =============================================================================
-- STEP 1 of 2 (run FIRST, alone) — Booking lifecycle enum labels: expired/in_progress/no_show
-- =============================================================================
-- Run this file ALONE, as its own script, in the Supabase SQL Editor.
-- It must commit before you run 37_booking_lifecycle_cron.sql.
--
-- WHY IT IS SEPARATE:
-- PostgreSQL cannot use a newly-added enum label in the same transaction that
-- added it ("unsafe use of new value ... of enum type"). The Supabase SQL
-- Editor wraps a pasted script in one transaction, so adding the labels and
-- using them in the same paste would fail partway through.
--
-- IDEMPOTENT: safe to run more than once.
--
-- WHAT IS IN HERE AND NOTHING ELSE: three ADD VALUE statements + a self-check.
-- Nothing reads or writes any table. No data is at risk. Rollback note: Postgres
-- cannot remove enum labels; they are kept forever, which is why they are
-- additive. (Same trade-off as migration 01.)
-- =============================================================================

DO $$
BEGIN
    ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'expired';
    RAISE NOTICE 'added/present: expired';
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'expired already present';
    WHEN others THEN RAISE WARNING 'could not add expired: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'in_progress';
    RAISE NOTICE 'added/present: in_progress';
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'in_progress already present';
    WHEN others THEN RAISE WARNING 'could not add in_progress: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'no_show';
    RAISE NOTICE 'added/present: no_show';
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'no_show already present';
    WHEN others THEN RAISE WARNING 'could not add no_show: %', SQLERRM;
END $$;

-- Self-check. Expect ten rows.
SELECT enumlabel AS label, enumsortorder AS sort_order
  FROM pg_enum
  JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status'
 ORDER BY enumsortorder;
