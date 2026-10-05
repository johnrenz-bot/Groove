-- =============================================================================
-- STEP 2 of 2 (run third) — Booking schema, state machine, RLS, storage, audit
-- =============================================================================
-- Run AFTER 00_appointment_reference.sql and 01_booking_enum.sql have both
-- committed. See 01 for why the enum step cannot share this transaction, and
-- 00 for the appointment_id default that booking inserts depend on.
--
-- Safe in the Supabase SQL Editor. Idempotent: every statement is IF NOT EXISTS,
-- DROP ... IF EXISTS, or CREATE OR REPLACE, so a re-run converges rather than
-- erroring.
--
-- What it changes, in one line each:
--   - adds lifecycle timestamp columns to public.appointments
--   - adds the booking link + full document body to public.agreements
--   - creates public.booking_events (append-only audit trail)
--   - installs the transition guard, the signature guard, the both-signed
--     auto-confirm, and the agreement edit-scope guard
--   - REPLACES the appointments INSERT/UPDATE policies with verified-participant
--     versions, and DROPS the agreements FOR ALL policy
--   - creates the private contract-signatures bucket + its object policies
--   - adds appointments/agreements/booking_events to supabase_realtime
--
-- What it deliberately does NOT do:
--   - no DROP TABLE, no TRUNCATE, no DELETE, no column removal
--   - no change to appointments or agreements RLS for SELECT (participants still
--     read their own bookings/agreements; admins still read all)
--   - no change to profiles, messages, verification, feedback, or notifications
--     data. notifications gains three nullable/defaulted columns only.
--   - does not touch supabase/verification_workflow.sql functions, because those
--     do not exist in the live database (probed PGRST202)
--
-- Verified empty before writing this: public.appointments and public.agreements
-- both return 0 rows, so the section-3 backfill has nothing to match and cannot
-- mis-link anything. If rows appear before you run this, re-check that UPDATE.
-- =============================================================================

-- =============================================================================
-- 2. APPOINTMENTS — lifecycle timestamps and the terms the agreement snapshots
-- =============================================================================
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS accepted_at            TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS agreement_required_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS declined_at            TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS changes_requested_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancellation_reason    TEXT,
    ADD COLUMN IF NOT EXISTS coach_notes            TEXT,
    ADD COLUMN IF NOT EXISTS requested_changes_note  TEXT,
    -- Terms copied onto the booking at request time so the agreement reflects
    -- what the client agreed to, not what the coach's profile says today.
    ADD COLUMN IF NOT EXISTS rate                   NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS duration_minutes       INTEGER,
    ADD COLUMN IF NOT EXISTS location               TEXT,
    ADD COLUMN IF NOT EXISTS is_online              BOOLEAN NOT NULL DEFAULT FALSE;

-- duration is derivable from start_time/end_time, but storing it explicitly
-- lets the UI and the agreement agree without re-parsing strings, and keeps
-- the value stable if the coach later edits the profile default.
COMMENT ON COLUMN public.appointments.rate IS 'Agreed fee for this booking, snapshotted at request time.';
COMMENT ON COLUMN public.appointments.is_online IS 'TRUE for a remote session; FALSE for face-to-face (address is then used).';

-- =============================================================================
-- 3. AGREEMENTS — bind to the booking, and carry the full signed document
-- =============================================================================
ALTER TABLE public.agreements
    ADD COLUMN IF NOT EXISTS appointment_id       BIGINT REFERENCES public.appointments(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS version              VARCHAR(20) NOT NULL DEFAULT '1.0',
    ADD COLUMN IF NOT EXISTS status               VARCHAR(30) NOT NULL DEFAULT 'awaiting_signatures',
    ADD COLUMN IF NOT EXISTS session_type         VARCHAR(50),
    ADD COLUMN IF NOT EXISTS location             TEXT,
    ADD COLUMN IF NOT EXISTS rate                 NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS duration_minutes     INTEGER,
    ADD COLUMN IF NOT EXISTS scheduled_at         TIMESTAMPTZ,
    -- The body of the agreement. Kept as explicit columns rather than one blob
    -- so each clause can be shown, diffed between versions, and translated.
    ADD COLUMN IF NOT EXISTS terms                TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_terms   TEXT,
    ADD COLUMN IF NOT EXISTS responsibilities     TEXT,
    ADD COLUMN IF NOT EXISTS payment_terms        TEXT,
    ADD COLUMN IF NOT EXISTS content              TEXT,
    ADD COLUMN IF NOT EXISTS client_signed_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS coach_signed_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS countersigned_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS changes_note         TEXT,
    ADD COLUMN IF NOT EXISTS declined_at          TIMESTAMPTZ;

-- ONE agreement per booking. This is what makes "the agreement belongs to the
-- booking" enforceable rather than a convention: a second row for the same
-- appointment is impossible, so the messages view cannot disagree with the
-- booking about which document is authoritative.
CREATE UNIQUE INDEX IF NOT EXISTS agreements_appointment_id_key
    ON public.agreements (appointment_id) WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS agreements_client_signed_idx  ON public.agreements (client_signed_at)  WHERE client_signed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS agreements_coach_signed_idx   ON public.agreements (coach_signed_at)   WHERE coach_signed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS agreements_status_idx         ON public.agreements (status);

-- Backfill: link pre-existing agreements to their booking.
--
-- ⚠ THIS IS THE ONLY STATEMENT IN THIS FILE THAT MUTATES EXISTING ROWS.
-- It is deliberately defensive because a naive version of this is a real
-- corruption risk: if one client/coach pair has SEVERAL bookings, a join on
-- (client_id, coach_id) alone would attach an agreement to an ARBITRARY one of
-- them, and the unique index would then lock in that wrong answer.
--
-- So the pairing is made unambiguous before anything is written:
--   * the two parties must have EXACTLY ONE booking between them, and
--   * exactly one unlinked agreement, and
--   * their dates must be the same day (agreement_date vs date)
-- Any pair that does not satisfy all three is left NULL for a human to match.
-- On the live database both tables are empty, so this updates 0 rows.
DO $$
DECLARE
    v_linked INTEGER := 0;
    v_skipped INTEGER := 0;
BEGIN
    WITH candidates AS (
        SELECT a.id AS agreement_id, ap.id AS appointment_id
          FROM public.agreements a
          JOIN public.appointments ap
            ON ap.client_id = a.client_id
           AND ap.coach_id  = a.coach_id
           AND ap.date      = a.agreement_date
         WHERE a.appointment_id IS NULL
           -- exactly one booking for this pair ...
           AND (SELECT count(*) FROM public.appointments x
                 WHERE x.client_id = a.client_id AND x.coach_id = a.coach_id) = 1
           -- ... and exactly one unlinked agreement for it
           AND (SELECT count(*) FROM public.agreements y
                 WHERE y.client_id = a.client_id AND y.coach_id = a.coach_id
                   AND y.appointment_id IS NULL) = 1
           AND NOT EXISTS (
                SELECT 1 FROM public.agreements z
                 WHERE z.appointment_id = ap.id AND z.id <> a.id)
    ), upd AS (
        UPDATE public.agreements a
           SET appointment_id = c.appointment_id
          FROM candidates c
         WHERE a.id = c.agreement_id
        RETURNING 1
    )
    SELECT count(*) INTO v_linked FROM upd;

    SELECT count(*) INTO v_skipped
      FROM public.agreements WHERE appointment_id IS NULL;

    RAISE NOTICE 'agreements backfill: % linked, % left unlinked for manual matching',
                 v_linked, v_skipped;
END $$;

-- =============================================================================
-- 4. AUDIT HISTORY
-- =============================================================================
-- One immutable row per lifecycle event. Written ONLY by the trigger below,
-- which is SECURITY DEFINER, so there is deliberately NO client INSERT policy:
-- if the browser could write history it could forge it.
CREATE TABLE IF NOT EXISTS public.booking_events (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id BIGINT NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    actor_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type     VARCHAR(40) NOT NULL,
    from_status    public.appointment_status,
    to_status      public.appointment_status,
    note           TEXT,
    metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_events_appointment_idx
    ON public.booking_events (appointment_id, created_at);

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- Participants and admins may read the history; nobody may write it directly.
DROP POLICY IF EXISTS "Participants can read booking events" ON public.booking_events;
CREATE POLICY "Participants can read booking events" ON public.booking_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments ap
             WHERE ap.id = booking_events.appointment_id
               AND (ap.client_id = auth.uid() OR ap.coach_id = auth.uid())
        )
        OR public.is_admin()
    );

COMMENT ON TABLE public.booking_events IS
    'Immutable audit trail of booking lifecycle events. Insert is performed only by the SECURITY DEFINER trigger; there is no client INSERT policy by design.';

-- =============================================================================
-- 5. STATE MACHINE — one trigger, so the rules cannot be bypassed from a client
-- =============================================================================
-- Centralising this in the database is what makes "booking is the source of
-- truth" true. A client that hand-crafts a status update still cannot skip a
-- step, confirm without two signatures, or move backwards out of a terminal
-- state: the trigger rejects the row.
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

DROP TRIGGER IF EXISTS booking_transition_guard ON public.appointments;
CREATE TRIGGER booking_transition_guard
    BEFORE UPDATE OF status ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.guard_booking_transition();

-- =============================================================================
-- 6. SIGNATURE STATE MACHINE — on the agreement
-- =============================================================================
-- A party may only ever sign their own column, once, and never clear it. The
-- "never clear" rule matters: without it a party could un-sign and silently
-- un-confirm a booking that the other party had already countersigned.
CREATE OR REPLACE FUNCTION public.guard_agreement_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Signature columns are only ever set, never cleared or rewritten. There is
    -- deliberately no INSERT branch: a freshly created agreement has no
    -- signatures by definition, and allowing one at insert time would let a
    -- coach pre-sign on the client's behalf.
    IF TG_OP = 'INSERT' THEN
        IF NEW.client_signed_at IS NOT NULL OR NEW.coach_signed_at IS NOT NULL THEN
            RAISE EXCEPTION 'An agreement cannot be created already signed'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.client_signed_at IS NOT NULL AND NEW.client_signed_at IS DISTINCT FROM OLD.client_signed_at THEN
        RAISE EXCEPTION 'Client signature is immutable once recorded' USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.coach_signed_at IS NOT NULL AND NEW.coach_signed_at IS DISTINCT FROM OLD.coach_signed_at THEN
        RAISE EXCEPTION 'Coach signature is immutable once recorded' USING ERRCODE = 'check_violation';
    END IF;

    -- Stamp the timestamp the moment a signature path lands, so the two can
    -- never disagree about whether it was signed.
    IF NEW.client_signed_at IS NULL AND NEW.client_signature_path IS NOT NULL
       AND NEW.client_signed_at IS DISTINCT FROM OLD.client_signed_at THEN
        NEW.client_signed_at := NOW();
    END IF;
    IF NEW.coach_signed_at IS NULL AND NEW.coach_signature_path IS NOT NULL
       AND NEW.coach_signed_at IS DISTINCT FROM OLD.coach_signed_at THEN
        NEW.coach_signed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agreement_signature_guard ON public.agreements;
CREATE TRIGGER agreement_signature_guard
    BEFORE UPDATE ON public.agreements
    FOR EACH ROW EXECUTE FUNCTION public.guard_agreement_signature();

-- =============================================================================
-- 7. CONFIRM-ON-BOTH-SIGNED
-- =============================================================================
-- The counterpart to the guard above. When the second signature lands, the
-- booking advances itself. This is the only path to CONFIRMED, which is why
-- section 5 refuses to let a client set it directly.
CREATE OR REPLACE FUNCTION public.confirm_booking_when_both_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.appointment_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Condition is deliberately NOT "both stamps changed in this statement".
    -- They never do: each party signs in a separate update, so the second
    -- signer changes only one column. Requiring both to move in the same UPDATE
    -- would mean the auto-confirm could never fire. The test is simply "both
    -- are now present", which is the actual business rule.
    IF NEW.client_signed_at IS NOT NULL
       AND NEW.coach_signed_at IS NOT NULL
       AND (OLD.client_signed_at IS NULL OR OLD.coach_signed_at IS NULL)
    THEN
        NEW.status := 'signed';
        NEW.countersigned_at := NOW();

        -- Dynamic SQL: 'agreement_required' was added by this same file.
        EXECUTE format(
            'UPDATE public.appointments
                SET status = %L, confirmed_at = COALESCE(confirmed_at, NOW())
              WHERE id = $1 AND status = %L',
            'agreement_required', NEW.appointment_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agreement_confirm_booking ON public.agreements;
CREATE TRIGGER agreement_confirm_booking
    AFTER UPDATE ON public.agreements
    FOR EACH ROW EXECUTE FUNCTION public.confirm_booking_when_both_signed();

-- =============================================================================
-- 8. BOOKING GATE — an unverified account cannot book
-- =============================================================================
-- Enforced in RLS rather than only in the UI. The UI check exists for a good
-- error message; this one is what makes the rule true.
--
-- NOTE ON THE EXISTING POLICY: schema.sql:372 installs
--   "Clients can book appointments" ... WITH CHECK (auth.uid() = client_id)
-- and that is what is live — supabase/verification_workflow.sql, which would
-- have replaced it with a verified-participants check, was never applied
-- (probed: its helper functions return PGRST202). So today the only thing
-- stopping an unverified client is the Book button being hidden, which a crafted
-- request walks straight past. Replacing the policy below closes that.
DROP POLICY IF EXISTS "Clients can book appointments" ON public.appointments;
CREATE POLICY "Verified clients can book appointments" ON public.appointments FOR INSERT
    WITH CHECK (
        auth.uid() = client_id
        AND EXISTS (
            SELECT 1 FROM public.profiles p
             WHERE p.id = auth.uid()
               AND COALESCE(p.account_verified, false)
               AND COALESCE(p.verification_status, '') = 'verified'
               AND p.status IS DISTINCT FROM 'suspended'
        )
        AND EXISTS (
            -- The coach must also be verified and not suspended: booking an
            -- unverified coach is how a client ends up paying someone whose ID
            -- was never checked.
            SELECT 1 FROM public.profiles p
             WHERE p.id = coach_id
               AND COALESCE(p.account_verified, false)
               AND COALESCE(p.verification_status, '') = 'verified'
               AND p.status IS DISTINCT FROM 'suspended'
        )
    );

-- Any participant who is verified and not suspended may move the booking.
-- Suspended accounts keep their history but cannot transact.
--
-- `public.is_admin()` is deliberately outside the verification EXISTS: an admin
-- must be able to unwind a bad booking regardless of their own verification
-- state, which is the whole point of the override.
DROP POLICY IF EXISTS "Participants can update appointments" ON public.appointments;
CREATE POLICY "Participants can update appointments" ON public.appointments FOR UPDATE
    USING (
        public.is_admin()
        OR (
            (auth.uid() = client_id OR auth.uid() = coach_id)
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid()
                   AND COALESCE(p.account_verified, false)
                   AND p.status IS DISTINCT FROM 'suspended'
            )
        )
    );

-- Clients may only cancel their own booking. Coaches accept/decline. Split out
-- from the blanket UPDATE so the split is enforced by policy, not by the UI
-- hiding buttons.
DROP POLICY IF EXISTS "Clients can cancel own appointment" ON public.appointments;
CREATE POLICY "Clients can cancel own appointment" ON public.appointments FOR UPDATE
    USING (auth.uid() = client_id AND status IN ('pending','accepted','agreement_required','confirmed'))
    WITH CHECK (status IN ('cancelled'));

-- =============================================================================
-- 9. AGREEMENT RLS — participants read, each signs only their own column
-- =============================================================================
-- MUST be dropped, not just supplemented.
--
-- schema.sql:382 installs
--   "Participants can insert/update agreements" FOR ALL
--     USING (auth.uid() = client_id OR auth.uid() = coach_id OR is_admin())
-- A FOR ALL policy with no WITH CHECK takes its check from USING, so it grants
-- a CLIENT full UPDATE on their own agreement row — including writing
-- coach_signature_path, i.e. forging the coach's signature. That single line is
-- the reason a signature here means nothing. The specific policies that replace
-- it are below; the edit-scope trigger is a second line of defence.
DROP POLICY IF EXISTS "Participants can insert/update agreements" ON public.agreements;

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view agreements" ON public.agreements;
CREATE POLICY "Participants can view agreements" ON public.agreements FOR SELECT
    USING (auth.uid() = client_id OR auth.uid() = coach_id OR public.is_admin());

-- Created by the COACH when accepting, so only the coach may insert. A client
-- cannot fabricate an agreement for a booking they were refused.
DROP POLICY IF EXISTS "Coaches can create agreements" ON public.agreements;
CREATE POLICY "Coaches can create agreements" ON public.agreements FOR INSERT
    WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Participants can update agreements" ON public.agreements;
CREATE POLICY "Participants can update agreements" ON public.agreements FOR UPDATE
    USING (auth.uid() = client_id OR auth.uid() = coach_id OR public.is_admin());

-- Restricting WHICH column a party may change cannot be done in a RLS policy:
-- WITH CHECK sees the proposed row, never the existing one, so there is no way
-- to express "everything except my own signature must be unchanged". A trigger
-- is the correct tool, and putting it here keeps the rule beside the policy it
-- refines.
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

DROP TRIGGER IF EXISTS agreement_edit_scope_guard ON public.agreements;
CREATE TRIGGER agreement_edit_scope_guard
    BEFORE UPDATE ON public.agreements
    FOR EACH ROW EXECUTE FUNCTION public.guard_agreement_edit_scope();

-- =============================================================================
-- 10. SIGNATURE STORAGE — private bucket, participant-scoped
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contract-signatures', 'contract-signatures', false, 2097152,
        ARRAY['image/png','image/jpeg'])
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = 2097152,
        allowed_mime_types = EXCLUDE.allowed_mime_types;

-- Object name shape:  <booking id>/<party>-<unix>.png
-- e.g. storage.objects.name = '7/client-1758000000000.png'
--
-- TWO corrections here, both of which previously denied EVERY object:
--
-- 1. The bucket is NOT part of `name`. The bucket lives in the bucket_id
--    column, so `name` is only '7/client-....png' and
--    storage.foldername(name) returns ['7'] — ONE element.
--    The booking id is therefore [1]. Reading [2] yields NULL, so
--    `ap.id::TEXT = NULL` is never true, EXISTS() is always false, and every
--    upload and every signed-URL read was refused with a bare RLS error.
--
-- 2. storage.foldername(name) EXCLUDES the filename, so the leaf must come
--    from storage.filename(name) — not from a further foldername index.
--
-- This matches the convention already proven by supabase/storage_policies.sql
-- for verification-documents, where objects are 'clients/<uid>/<file>': folder
-- segments [1] and [2], leaf via storage.filename(name).
--
-- array_length(...,1) = 1 rejects a nested path like '7/sub/client-x.png', so
-- a participant cannot bury an object deeper to slip past the leaf check.
--
-- The booking id sits in the path so access is decidable without joining
-- storage.objects to appointments on every object read.
DROP POLICY IF EXISTS "Participants read own agreement signatures" ON storage.objects;
CREATE POLICY "Participants read own agreement signatures" ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'contract-signatures'
        AND array_length(storage.foldername(name), 1) = 1
        AND EXISTS (
            SELECT 1
              FROM public.appointments ap
             WHERE ap.id::TEXT = (storage.foldername(name))[1]
               AND (ap.client_id = auth.uid() OR ap.coach_id = auth.uid())
        )
    );

-- A party writes only their own file: the leaf must start with their role, so
-- neither party can overwrite the other's signature image even if they guess
-- the path. There is no UPDATE/DELETE policy at all — signatures are write-once
-- (see guard_agreement_signature), so the absence is deliberate.
DROP POLICY IF EXISTS "Parties upload own agreement signature" ON storage.objects;
CREATE POLICY "Parties upload own agreement signature" ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'contract-signatures'
        AND array_length(storage.foldername(name), 1) = 1
        AND EXISTS (
            SELECT 1
              FROM public.appointments ap
             WHERE ap.id::TEXT = (storage.foldername(name))[1]
               AND split_part(storage.filename(name), '-', 1) =
                   CASE WHEN ap.client_id = auth.uid() THEN 'client'
                        WHEN ap.coach_id  = auth.uid() THEN 'coach' END
        )
    );

-- =============================================================================
-- 11. REALTIME — booking + agreement changes should reach open tabs
-- =============================================================================
-- Without this the subscription connects but never fires, which is the failure
-- mode worth naming: no error, just a page that silently never updates.
-- Idempotent publication setup. Notifications below report what was actually
-- added, so there is no separate pre-check to keep in sync with reality.

-- Idempotent publication setup.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- Every failure is swallowed and reported as a NOTICE rather than raised.
-- Realtime is a convenience here, not a correctness requirement: if the
-- publication cannot be altered the booking flow still works, and a hard error
-- would leave the whole migration half-applied for no benefit.
DO $$
DECLARE
    t       TEXT;
    v_added TEXT := '';
BEGIN
    FOREACH t IN ARRAY ARRAY['appointments','agreements','booking_events'] LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
            v_added := v_added || t || ' ';
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'realtime: could not add public.% (%)', t, SQLERRM;
        END;
    END LOOP;
    IF v_added <> '' THEN
        RAISE NOTICE 'realtime publication now includes: %', v_added;
    END IF;
END $$;

-- =============================================================================
-- 12. REALTIME NOTIFICATION HOOK
-- =============================================================================
-- Live notifications table is exactly: id, user_id, title, message, read_at,
-- created_at (verified against the live project). Three columns are added so a
-- notification can say WHICH booking it refers to and what kind it is, which is
-- what lets the client/coach UI route to the right conversation instead of
-- guessing from the title text. Additive only — no existing column changes,
-- and `read_at IS NULL` remains the unread test, so existing readers are
-- unaffected.
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS notification_type VARCHAR(40),
    ADD COLUMN IF NOT EXISTS appointment_id    BIGINT REFERENCES public.appointments(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS data              JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS notifications_appointment_idx
    ON public.notifications (appointment_id) WHERE appointment_id IS NOT NULL;

-- One place that tells the other party something happened. The UI reads
-- notifications; it never polls.
CREATE OR REPLACE FUNCTION public.notify_booking_parties()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client UUID;
    v_coach  UUID;
    v_actor  UUID := auth.uid();
    v_recipient UUID;
BEGIN
    SELECT client_id, coach_id INTO v_client, v_coach
      FROM public.appointments WHERE id = NEW.appointment_id;
    IF v_client IS NULL OR v_coach IS NULL THEN RETURN NEW; END IF;

    -- Notify the other party. When the actor is neither (an admin acting, or a
    -- trigger firing outside a request) both are told, because a booking moving
    -- without an identified actor is exactly the case a user needs to see.
    -- array_remove(ARRAY[...], v_actor) yields a real uuid[].
    --
    -- The previous form was FOREACH v_recipient IN ARRAY (CASE ... END, CASE ... END).
    -- In PL/pgSQL the ARRAY keyword here introduces the loop's array expression,
    -- it is NOT the array constructor — the constructor needs square brackets. So
    -- the round brackets made it a parenthesised ROW, i.e. a record, and PL/pgSQL
    -- refused it with:
    --     ERROR: FOREACH expression must yield an array, not type record
    --
    -- Behaviour is unchanged: the actor is dropped from the pair, so the OTHER
    -- party is notified. When v_actor is NULL (a trigger firing outside a
    -- request) array_remove strips only NULL elements; v_client and v_coach are
    -- guaranteed non-NULL by the guard above, so both survive and both parties
    -- are told — which is the intent. The old CONTINUE is gone because a NULL
    -- can no longer reach the loop.
    FOREACH v_recipient IN ARRAY array_remove(ARRAY[v_client, v_coach], v_actor) LOOP
        INSERT INTO public.notifications
            (user_id, title, message, notification_type, appointment_id, data)
        VALUES
            (v_recipient,
             'Booking ' || NEW.to_status::TEXT,
             'Your booking #' || NEW.appointment_id::TEXT || ' is now '
                || NEW.to_status::TEXT || '.',
             'booking',
             NEW.appointment_id,
             jsonb_build_object(
                 'appointment_id', NEW.appointment_id,
                 'status',         NEW.to_status,
                 'event',          NEW.event_type));
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_event_notify ON public.booking_events;
CREATE TRIGGER booking_event_notify
    AFTER INSERT ON public.booking_events
    FOR EACH ROW EXECUTE FUNCTION public.notify_booking_parties();

-- =============================================================================
-- 13. BOOKING-ELIGIBILITY HELPER
-- =============================================================================
-- The single definition of "may this account book". RLS in section 8 enforces
-- it; this exposes the same rule to the UI so the Book button can be disabled
-- with a readable reason instead of letting the request fail. SECURITY DEFINER
-- so a client can read someone else's eligibility (a coach needs to know
-- whether a client may book them) without exposing the profiles table.
CREATE OR REPLACE FUNCTION public.can_book_appointment(p_client UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(p.account_verified, false)
       AND COALESCE(p.verification_status, '') = 'verified'
       AND p.status <> 'suspended'
      FROM public.profiles p
     WHERE p.id = p_client;
$$;

COMMENT ON FUNCTION public.can_book_appointment(UUID) IS
    'True when the client is verified, verified_status = verified, and not suspended. Mirrors the RLS INSERT policy on public.appointments.';

-- =============================================================================
-- DONE
-- =============================================================================
-- After applying, verify:
--   SELECT enumlabel FROM pg_enum
--     JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--    WHERE typname = 'appointment_status';
--   -- expect: pending, confirmed, declined, cancelled, completed,
--   --         accepted, agreement_required
--
--   SELECT public.can_book_appointment('<unverified client uuid>'::uuid);  -- expect false
--   SELECT public.can_book_appointment('<verified client uuid>'::uuid);    -- expect true
--
--   SELECT id, status, accepted_at, confirmed_at FROM public.appointments;
--   SELECT event_type, from_status, to_status, actor_id, created_at
--     FROM public.booking_events ORDER BY created_at DESC LIMIT 20;
--
-- Then re-run `npm run build` — the frontend expects the new labels.
-- =============================================================================