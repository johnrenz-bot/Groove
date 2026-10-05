-- =============================================================================
-- HOTFIX — replace the LIVE public.guard_agreement_edit_scope()
-- =============================================================================
-- Run ONCE in the Supabase SQL Editor, after 06_hotfix_signature_storage.sql.
-- You run this manually; nothing here is executed automatically.
--
-- THE BUG
-- Signing failed with:
--     The signature could not be recorded
--     (column "coach_id" does not exist)
--
-- The live function referenced three agreement columns with NO prefix:
--     IF v_is_admin OR (auth.uid() = coach_id AND OLD.status = 'draft') THEN
--     v_is_client := (auth.uid() = client_id);
--     IF auth.uid() = coach_id AND ( ...
--
-- WHY THAT RAISES
-- PL/pgSQL resolves a bare identifier by trying, in order: a declared variable,
-- then a column of a table belonging to a SQL statement currently in scope,
-- then it gives up. Inside an IF condition or an assignment there is NO SQL
-- statement in scope, so there is nothing to match 'coach_id' against and the
-- function raises before evaluating any of its own rules. Every signature write
-- was rejected — including the legitimate ones.
--
-- THE FIX
-- Qualify all three with OLD.: the party identity and the document status are
-- properties of the row being edited, so OLD. is the correct qualifier.
--
-- NOT IN SCOPE OF THIS FIX, and deliberately left alone:
--   * confirm_booking_when_both_signed() still sets the appointment to
--     'agreement_required' on both-signed. That is a separate business-logic
--     bug and is NOT touched here, per instruction.
--   * guard_agreement_signature() is untouched (it has no bare references).
--   * Storage policies, the bucket, tables, columns, and RLS are untouched.
--   * Every security rule in the function is preserved verbatim: the admin
--     override, the coach-in-draft escape, the client-may-not-touch-the-coach's-
--     signature check, and the coach-may-not-touch-the-client's check.
--
-- One incidental removal: the unused DECLARE v_uid, which was dead. No
-- behaviour depends on it.
--
-- Same signature (no arguments, RETURNS TRIGGER), so CREATE OR REPLACE
-- succeeds and the existing agreement_edit_scope_guard trigger keeps firing it.
-- Idempotent.
-- =============================================================================


-- =============================================================================
-- STEP 1 — BEFORE-SHOT (read-only)
-- =============================================================================
-- has_bare = t means the live function is still the broken one.
SELECT pg_get_functiondef(p.oid) AS definition,
       (pg_get_functiondef(p.oid) ~ 'auth\.uid\(\) = coach_id')            AS has_bare_coach,
       (pg_get_functiondef(p.oid) ~ 'auth\.uid\(\) = client_id')           AS has_bare_client,
       (pg_get_functiondef(p.oid) LIKE '%OLD.coach_id%')                      AS has_fix
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'guard_agreement_edit_scope';
-- BEFORE running: has_bare_coach = t, has_fix = f


-- =============================================================================
-- STEP 2 — REPLACE THE LIVE FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.guard_agreement_edit_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN := public.is_admin();
    v_is_client BOOLEAN;
BEGIN
    -- Every reference to a column of the agreement row is written OLD.<col> or
    -- NEW.<col>.
    --
    -- A BARE column name in a trigger function is resolved by falling back
    -- through variable, then "any table of a SQL statement currently in
    -- scope", then raising. Inside these IF / assignment statements there is no
    -- SQL statement in scope, so the fallback had nothing to match and every
    -- update failed with:
    --     ERROR: column "coach_id" does not exist
    -- That aborted signing entirely, before this function's own rules could
    -- even be evaluated.
    --
    -- The other bare names elsewhere in this file (WHERE id = ..., INSERT INTO
    -- booking_events (appointment_id, ...)) are fine — they sit inside a SQL
    -- statement that names its table, so the column resolves normally. Only the
    -- three in a trigger context were broken.

    -- The coach assembling the document, or an admin correcting it.
    IF v_is_admin OR (auth.uid() = OLD.coach_id AND OLD.status = 'draft') THEN
        RETURN NEW;
    END IF;

    v_is_client := (auth.uid() = OLD.client_id);

    -- Everything except the signer's own signature must be byte-identical.
    IF v_is_client AND (
        NEW.appointment_price IS DISTINCT FROM OLD.appointment_price OR
        NEW.session_duration   IS DISTINCT FROM OLD.session_duration   OR
        NEW.payment_method     IS DISTINCT FROM OLD.payment_method     OR
        NEW.cancellation_terms IS DISTINCT FROM OLD.cancellation_terms OR
        NEW.responsibilities   IS DISTINCT FROM OLD.responsibilities   OR
        NEW.payment_terms      IS DISTINCT FROM OLD.payment_terms      OR
        NEW.terms              IS DISTINCT FROM OLD.terms              OR
        NEW.version            IS DISTINCT FROM OLD.version            OR
        NEW.rate               IS DISTINCT FROM OLD.rate               OR
        NEW.location           IS DISTINCT FROM OLD.location           OR
        NEW.scheduled_at       IS DISTINCT FROM OLD.scheduled_at       OR
        NEW.coach_signed_at    IS DISTINCT FROM OLD.coach_signed_at    OR
        NEW.coach_signature_path IS DISTINCT FROM OLD.coach_signature_path
    ) THEN
        RAISE EXCEPTION 'A client may only record their own signature on an agreement'
            USING ERRCODE = 'check_violation';
    END IF;

    IF auth.uid() = OLD.coach_id AND (
        NEW.client_signed_at    IS DISTINCT FROM OLD.client_signed_at    OR
        NEW.client_signature_path IS DISTINCT FROM OLD.client_signature_path
    ) THEN
        RAISE EXCEPTION 'A coach may only record their own signature on an agreement'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;


-- =============================================================================
-- STEP 3 — VERIFICATION
-- =============================================================================
-- 3a. The function exists and no bare reference survives. Expect t / f / f.
SELECT p.proname,
       p.prorettype::regtype AS returns,
       p.prosecdef          AS security_definer,
       (pg_get_functiondef(p.oid) LIKE '%OLD.coach_id%')    AS has_fix,
       (pg_get_functiondef(p.oid) ~ 'auth\.uid\(\) = coach_id')  AS still_bare_coach,
       (pg_get_functiondef(p.oid) ~ 'auth\.uid\(\) = client_id') AS still_bare_client
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'guard_agreement_edit_scope';
-- PASS: has_fix = t, still_bare_coach = f, still_bare_client = f

-- 3b. Both security rules are still present. Expect t / t / t.
SELECT
  (pg_get_functiondef(oid) LIKE '%A client may only record their own signature%')
      AS client_rule_intact,
  (pg_get_functiondef(oid) LIKE '%A coach may only record their own signature%')
      AS coach_rule_intact,
  (pg_get_functiondef(oid) LIKE '%OLD.status = ''draft''%')
      AS coach_draft_escape_intact,
  (pg_get_functiondef(oid) LIKE '%public.is_admin()%')
      AS admin_override_intact
  FROM pg_proc WHERE proname = 'guard_agreement_edit_scope';

-- 3c. The trigger still points at this function. Expect one row.
SELECT tgname, pg_get_triggerdef(oid) AS definition
  FROM pg_trigger
 WHERE NOT tgisinternal
   AND tgrelid = 'public.agreements'::regclass
   AND pg_get_triggerdef(oid) ILIKE '%guard_agreement_edit_scope%';

-- 3d. guard_agreement_signature() is untouched. Expect t / t.
SELECT
  (pg_get_functiondef(oid) LIKE '%Client signature is immutable once recorded%')
      AS client_immutable_intact,
  (pg_get_functiondef(oid) LIKE '%Coach signature is immutable once recorded%')
      AS coach_immutable_intact
  FROM pg_proc WHERE proname = 'guard_agreement_signature';

-- 3e. KNOWN, DELIBERATELY NOT FIXED. The both-signed trigger still writes
--     'agreement_required' to the appointment, so after both parties sign the
--     booking sits at agreement_required instead of confirmed. Confirm this is
--     still the live text so it is not mistaken for a regression later.
SELECT (pg_get_functiondef(oid) LIKE '%agreement_required%') AS both_signed_sets_agreement_required
  FROM pg_proc WHERE proname = 'confirm_booking_when_both_signed';
-- Expected t — a reminder of the separate issue, not a failure of this hotfix.

-- 3f. Enumeration and row counts untouched. Expect 7 labels.
SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status' ORDER BY enumsortorder;

SELECT (SELECT count(*) FROM public.agreements) AS agreements;

-- =============================================================================
-- STEP 4 — UI CHECK
-- =============================================================================
-- Client signs -> the upload now reaches the agreement UPDATE, the path is
-- recorded, and guard_agreement_signature stamps client_signed_at.
-- Expect afterwards:
--   agreements.client_signature_path = '<booking id>/client-<ts>.png'
--   agreements.client_signed_at      IS NOT NULL
--   agreements.status                = 'signed'
--   client_signature_path           IS NULL   (the coach has not signed yet)
-- Coach sees "Client ✓" in /messages via realtime.
--
-- EXPECT THE BOOKING TO STAY AT 'agreement_required' AFTER BOTH SIGN — that is
-- the separate bug in 3e, not fixed here.
-- =============================================================================
