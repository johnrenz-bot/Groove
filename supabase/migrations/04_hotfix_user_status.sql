-- =============================================================================
-- HOTFIX — repair the LIVE user_status enum comparison C:\website\GrooveSystem\supabase\migrations\04_hotfix_user_status.sql
-- =============================================================================
-- Run ONCE, after 00/01/02 are applied. Replaces exactly one database object.
--
-- WHY EDITING 02_booking_schema.sql WAS NOT ENOUGH
-- 02 was applied, so the running database still holds:
--     AND COALESCE(status, '') <> 'suspended'
-- Section 8's RLS policies were corrected, but the BEFORE UPDATE trigger was
-- not — and that trigger fires on precisely the failing operation.
--
-- Accepting a booking is: UPDATE public.appointments SET status = 'accepted'
-- which evaluates BOTH:
--     1. the UPDATE policy USING (...)   -> already corrected
--     2. booking_transition_guard        -> BEFORE UPDATE OF status
--        -> guard_booking_transition()   -> the LIVE copy, still broken
-- That is why the request list renders fine (SELECT never reaches step 2) and
-- only Accept/Decline errors.
--
-- No enum change. No RLS change. No new booking logic. Same function signature
-- (no arguments, RETURNS TRIGGER), so CREATE OR REPLACE succeeds and the
-- existing trigger keeps pointing at the same function.
-- =============================================================================


-- =============================================================================
-- STEP 1 — DIAGNOSTIC (read-only). Run and read this BEFORE continuing.
-- =============================================================================
-- Finds every live function or policy that still forces an empty string into
-- user_status. Expect ZERO rows once this file has been applied.
--
-- Line comments are stripped before matching. prosrc stores the raw source
-- text INCLUDING comments, so without this the function's own explanatory
-- comment would make it match itself and report a false positive.
WITH live AS (
    SELECT 'function'::text AS kind,
           n.nspname || '.' || p.proname AS object_name,
           regexp_replace(p.prosrc, '--[^\n]*', '', 'g') AS body
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
    UNION ALL
    SELECT 'policy',
           tablename || '.' || policyname,
           regexp_replace(coalesce(qual, '') || ' ' || coalesce(with_check, ''),
                          '--[^\n]*', '', 'g')
      FROM pg_policies
     WHERE schemaname = 'public'
)
SELECT kind, object_name
  FROM live
 WHERE body ~* "COALESCE\\(\\s*[a-z_.]*status\\s*,\\s*''"
 ORDER BY kind, object_name;
-- PASS = 0 rows


-- The live trigger chain on appointments, so it is visible what actually runs
-- on an update.
SELECT t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid) AS definition,
       t.tgenabled
  FROM pg_trigger t
 WHERE NOT t.tgisinternal
   AND t.tgrelid = 'public.appointments'::regclass
 ORDER BY t.tgname;


-- =============================================================================
-- STEP 2 — REPLACE THE LIVE FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.guard_booking_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agr        public.agreements%ROWTYPE;
    v_actor      UUID := auth.uid();
    v_event      TEXT;
    v_allowed    BOOLEAN := FALSE;
    v_actor_ok   BOOLEAN;
BEGIN
    -- ---------------------------------------------------------------------
    -- Gate on the actor, not just the transition.
    --
    -- IMPORTANT: supabase/verification_workflow.sql declares
    -- is_verified_participant() and guard_booking_confirmation(), but neither
    -- exists in the live database — that migration was never applied (probed:
    -- PGRST202). So there is currently nothing stopping an UNVERIFIED coach
    -- from accepting a booking. This check is therefore self-contained on
    -- purpose: it reads public.profiles directly and does not call those
    -- functions. If verification_workflow.sql is applied later this remains
    -- correct — it just double-checks.
    -- ---------------------------------------------------------------------
    -- NULL-safe enum comparison. profiles.status is the PostgreSQL enum
    -- user_status, so COALESCE(status, '') makes Postgres coerce '' to that
    -- enum and fail with:
    --     ERROR: invalid input value for enum user_status: ""
    -- The failure happens while the comparison is planned, so it fires on EVERY
    -- call, not only when status happens to be NULL.
    --
    -- IS DISTINCT FROM keeps the intended meaning exactly: TRUE for
    -- active/online/away/busy/offline, TRUE for NULL (no status is not
    -- suspended), and FALSE only for 'suspended'.
    --
    -- No ::user_status cast on the literal on purpose. Postgres resolves an
    -- untyped literal from the other operand, so the comparison is typed from
    -- status itself. A schema-qualified cast would be one more thing that can
    -- fail at parse time for no benefit.
    SELECT COALESCE(account_verified, false)
           AND COALESCE(verification_status, '') = 'verified'
           AND status IS DISTINCT FROM 'suspended'
      INTO v_actor_ok
      FROM public.profiles WHERE id = v_actor;

    IF NOT COALESCE(v_actor_ok, false) AND NOT public.is_admin() THEN
        RAISE EXCEPTION
            'Only a verified, non-suspended account may change a booking (booking %)',
            OLD.id
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- ---------------------------------------------------------------------
    -- Legal moves. Everything else is refused.
    -- ---------------------------------------------------------------------
    v_allowed := CASE OLD.status
        WHEN 'pending' THEN NEW.status IN ('accepted','declined','cancelled')
        WHEN 'accepted' THEN NEW.status IN ('agreement_required','cancelled','declined')
        WHEN 'agreement_required' THEN NEW.status IN ('confirmed','cancelled')
        WHEN 'confirmed' THEN NEW.status IN ('completed','cancelled')
        ELSE FALSE                       -- declined/cancelled/completed are terminal
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION
            'Illegal booking transition % -> % (booking %)',
            OLD.status, NEW.status, OLD.id
            USING ERRCODE = 'check_violation';
    END IF;

    -- ---------------------------------------------------------------------
    -- confirmed is NOT client-writable. It happens here and only here, and
    -- only once two independent signatures exist. Reached by dynamic SQL
    -- because 'confirmed' is a pre-existing label but the guard above also
    -- references the newly added ones.
    -- ---------------------------------------------------------------------
    IF NEW.status = 'confirmed' THEN
        -- Defence in depth. Under normal operation nothing sets 'confirmed'
        -- directly: confirm_booking_when_both_signed() does it from the
        -- agreement, and this same function's own dynamic SQL would be the only
        -- other route. Keeping this branch means that even if some future code
        -- path writes 'confirmed' straight to the booking, it still cannot skip
        -- the two-signature requirement.
        SELECT * INTO v_agr FROM public.agreements WHERE appointment_id = NEW.id;
        IF v_agr.id IS NULL THEN
            RAISE EXCEPTION 'Cannot confirm booking %: no agreement exists', NEW.id
                USING ERRCODE = 'check_violation';
        END IF;
        IF v_agr.client_signed_at IS NULL OR v_agr.coach_signed_at IS NULL THEN
            RAISE EXCEPTION
                'Cannot confirm booking %: both signatures are required (client % / coach %)',
                NEW.id, v_agr.client_signed_at, v_agr.coach_signed_at
                USING ERRCODE = 'check_violation';
        END IF;
        NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());
        UPDATE public.agreements
           SET status = 'signed', countersigned_at = NOW()
         WHERE appointment_id = NEW.id;
    END IF;

    -- ---------------------------------------------------------------------
    -- Timestamp each transition, so the UI never has to infer it.
    -- ---------------------------------------------------------------------
    IF NEW.status = 'accepted'           THEN NEW.accepted_at           := COALESCE(NEW.accepted_at, NOW());
    ELSIF NEW.status = 'agreement_required' THEN NEW.agreement_required_at := COALESCE(NEW.agreement_required_at, NOW());
    ELSIF NEW.status = 'declined'        THEN NEW.declined_at            := COALESCE(NEW.declined_at, NOW());
    ELSIF NEW.status = 'cancelled'       THEN NEW.cancelled_at           := COALESCE(NEW.cancelled_at, NOW());
    ELSIF NEW.status = 'completed'       THEN NEW.completed_at           := COALESCE(NEW.completed_at, NOW());
    END IF;

    v_event := NEW.status::TEXT;

    -- ---------------------------------------------------------------------
    -- Audit row. Append-only.
    -- ---------------------------------------------------------------------
    INSERT INTO public.booking_events
        (appointment_id, actor_id, event_type, from_status, to_status, note)
    VALUES
        (NEW.id, v_actor, v_event, OLD.status, NEW.status, NEW.cancellation_reason);

    RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 3 — RE-CREATE THE THREE POLICIES (defensive)
-- =============================================================================
-- Section 8 was reported as already corrected. These are the same approved
-- verified-participant conditions, re-applied so this file repairs the database
-- on its own. They TIGHTEN access; nothing here is looser than what is live.
DROP POLICY IF EXISTS "Clients can book appointments" ON public.appointments;
CREATE POLICY "Verified clients can book appointments" ON public.appointments FOR INSERT
    WITH CHECK (
        auth.uid() = client_id
        AND EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = auth.uid()
                       AND COALESCE(p.account_verified, false)
                       AND COALESCE(p.verification_status, '') = 'verified'
                       AND p.status IS DISTINCT FROM 'suspended')
        AND EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = coach_id
                       AND COALESCE(p.account_verified, false)
                       AND COALESCE(p.verification_status, '') = 'verified'
                       AND p.status IS DISTINCT FROM 'suspended')
    );

DROP POLICY IF EXISTS "Participants can update appointments" ON public.appointments;
CREATE POLICY "Participants can update appointments" ON public.appointments FOR UPDATE
    USING (
        public.is_admin()
        OR (
            (auth.uid() = client_id OR auth.uid() = coach_id)
            AND EXISTS (SELECT 1 FROM public.profiles p
                         WHERE p.id = auth.uid()
                           AND COALESCE(p.account_verified, false)
                           AND p.status IS DISTINCT FROM 'suspended')
        )
    );

DROP POLICY IF EXISTS "Clients can cancel own appointment" ON public.appointments;
CREATE POLICY "Clients can cancel own appointment" ON public.appointments FOR UPDATE
    USING (auth.uid() = client_id
           AND status IN ('pending','accepted','agreement_required','confirmed'))
    WITH CHECK (status IN ('cancelled'));

-- =============================================================================
-- STEP 4 — VERIFY
-- =============================================================================
-- 4a. The function is in place and typed correctly. Expect one row.
SELECT p.proname,
       p.prorettype::regtype,
       p.prosecdef,
       (pg_get_functiondef(p.oid) LIKE '%IS DISTINCT FROM%suspended%') AS has_fix
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'guard_booking_transition';
-- PASS: has_fix = t

-- 4b. No object anywhere still holds the bug. Expect ZERO rows.
WITH live AS (
    SELECT 'function'::text AS kind, n.nspname || '.' || p.proname AS object_name,
           regexp_replace(p.prosrc, '--[^\n]*', '', 'g') AS body
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
    UNION ALL
    SELECT 'policy', tablename || '.' || policyname,
           regexp_replace(coalesce(qual,'') || ' ' || coalesce(with_check,''), '--[^\n]*', '', 'g')
      FROM pg_policies WHERE schemaname = 'public'
)
SELECT kind, object_name FROM live
 WHERE body ~* "COALESCE\\(\\s*[a-z_.]*status\\s*,\\s*''";
-- PASS = 0 rows

-- 4c. The enum itself is untouched. Expect exactly 7 labels.
SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status' ORDER BY enumsortorder;

-- 4d. No data was modified by this file. Expect 0 / 0.
SELECT (SELECT count(*) FROM public.appointments) AS appointments,
       (SELECT count(*) FROM public.agreements)      AS agreements;

-- 4e. Then in the UI: Coach -> Coaching Requests -> Accept.
-- The booking should move pending -> accepted, appointments.accepted_at should
-- be stamped, and exactly one row should appear in booking_events.
-- =============================================================================
