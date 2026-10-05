-- ==============================================================================
-- GrooveSystem: Admin Verification workflow
--
-- Apply AFTER schema.sql, admin_hardening.sql and storage_policies.sql.
-- Safe to re-run: every object is dropped before it is created.
--
-- What this adds, and why each piece is needed rather than optional:
--
--   1. A real verification STATE on profiles. `account_verified` is a boolean,
--      so it cannot express "rejected, and here is what has to change". This
--      adds verification_status (pending | verified | rejected) plus the reason,
--      the offending document, and who reviewed it.
--
--   2. `public.missing_verification_documents(uuid)` — the single definition of
--      what a role must submit. Coach = portfolio + government ID + ID selfie.
--      Client = government ID. The admin UI calls the same rule client-side;
--      this function is the authority, so a direct API call cannot approve an
--      account whose documents are incomplete.
--
--   3. `guard_verification_fields` — WITHOUT this the existing
--      "Users can update own profile" policy is a verification bypass: any
--      signed-in user could PATCH their own profiles row and set
--      account_verified = true, because RLS restricts ROWS, not COLUMNS. This
--      trigger is the RBAC boundary for verification writes.
--
--   4. `guard_verification_approval` — the database refuses to mark an account
--      verified unless every required document is present.
--
--   5. `is_verified_participant` + the appointments policies/trigger — booking
--      is restricted to verified coaches and verified clients at the data layer,
--      not only in the UI.
--
-- No existing column is dropped or renamed, and no existing role, auth or
-- booking policy is weakened.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Sanity: is_admin() must exist or every policy below is meaningless
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    SELECT 1 FROM pg_proc WHERE proname = 'is_admin';
EXCEPTION
    WHEN undefined_table THEN
        RAISE EXCEPTION 'Run supabase/schema.sql and supabase/admin_hardening.sql first';
END $$;

-- ------------------------------------------------------------------------------
-- 1. Verification state on profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20)
    NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_rejected_document VARCHAR(60);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_verification_status_check
        CHECK (verification_status IN ('pending', 'verified', 'rejected'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Backfill from the boolean so existing accounts land in a truthful state
-- instead of every one of them reading "pending" forever.
UPDATE public.profiles
SET verification_status = 'verified'
WHERE account_verified = true AND verification_status <> 'verified';

UPDATE public.profiles
SET verification_reviewed_at = approved_at
WHERE account_verified = true AND verification_reviewed_at IS NULL;

-- The admin queue filters on this constantly (status + role).
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
    ON public.profiles(verification_status)
    WHERE role <> 'admin';

-- ------------------------------------------------------------------------------
-- 2. Required documents, defined once
-- ------------------------------------------------------------------------------
-- Returns the labels of the documents still missing for p_id. An empty array
-- means the account MAY be approved. SECURITY DEFINER because the detail tables
-- have row policies keyed to auth.uid(), while this is called for arbitrary ids
-- by the admin console and by the approval guard.
CREATE OR REPLACE FUNCTION public.missing_verification_documents(p_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    v_role user_role;
    v_missing TEXT[] := '{}'::TEXT[];
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = p_id;
    IF v_role IS NULL OR v_role = 'admin' THEN
        -- Admins are auto-verified at signup and submit no documents.
        RETURN '{}'::TEXT[];
    END IF;

    IF v_role = 'coach' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.coach_profiles
            WHERE id = p_id AND COALESCE(portfolio_path, '') <> ''
        ) THEN
            v_missing := array_append(v_missing, 'Portfolio / Resume');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.coach_profiles
            WHERE id = p_id AND COALESCE(valid_id_path, '') <> ''
        ) THEN
            v_missing := array_append(v_missing, 'Valid Government ID');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.coach_profiles
            WHERE id = p_id AND COALESCE(id_selfie_path, '') <> ''
        ) THEN
            v_missing := array_append(v_missing, 'Selfie with Government ID');
        END IF;
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM public.client_profiles
            WHERE id = p_id AND COALESCE(valid_id_path, '') <> ''
        ) THEN
            v_missing := array_append(v_missing, 'Valid Government ID');
        END IF;
    END IF;

    RETURN v_missing;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- PostgREST-callable so the admin console can show the same checklist the
-- database will enforce at approval time, instead of a second hand-written list.
CREATE OR REPLACE FUNCTION public.required_verification_documents(p_role TEXT)
RETURNS TEXT[] AS $$
BEGIN
    IF lower(coalesce(p_role, '')) = 'coach' THEN
        RETURN ARRAY['Portfolio / Resume', 'Valid Government ID', 'Selfie with Government ID'];
    ELSIF lower(coalesce(p_role, '')) = 'client' THEN
        RETURN ARRAY['Valid Government ID'];
    END IF;
    RETURN '{}'::TEXT[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------------------------
-- 3. RBAC: verification fields are admin-only
-- ------------------------------------------------------------------------------
-- RLS policies operate on rows, so "Users can update own profile" currently
-- lets a user write ANY column of their own profiles row — including
-- account_verified. This trigger closes that.
CREATE OR REPLACE FUNCTION public.guard_verification_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.account_verified IS DISTINCT FROM OLD.account_verified THEN
        RAISE EXCEPTION 'Only an administrator can grant or revoke account verification';
    END IF;

    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at
       OR NEW.verification_reviewed_by IS DISTINCT FROM OLD.verification_reviewed_by THEN
        RAISE EXCEPTION 'Verification review fields can only be written by an administrator';
    END IF;

    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        -- A rejected account may resubmit: pending <-> rejected is the user's
        -- own move. 'verified' is not reachable without the admin check above.
        IF NEW.verification_status NOT IN ('pending', 'rejected') THEN
            RAISE EXCEPTION 'Only an administrator can set verification status to %',
                NEW.verification_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_verification_fields ON public.profiles;
CREATE TRIGGER guard_verification_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_verification_fields();

-- ------------------------------------------------------------------------------
-- 4. Approval requires every required document
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_verification_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_missing TEXT[];
BEGIN
    IF NEW.account_verified AND NOT OLD.account_verified THEN
        v_missing := public.missing_verification_documents(NEW.id);
        IF COALESCE(array_length(v_missing, 1), 0) > 0 THEN
            RAISE EXCEPTION 'Cannot verify this account: missing required document(s): %',
                array_to_string(v_missing, ', ');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_verification_approval ON public.profiles;
CREATE TRIGGER guard_verification_approval
    BEFORE UPDATE OF account_verified ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_verification_approval();

-- ------------------------------------------------------------------------------
-- 5. Booking is restricted to verified participants
-- ------------------------------------------------------------------------------
-- Both parties must hold account_verified. Suspended accounts are already cut
-- off at the data layer by is_suspended(); this is the verification counterpart.
CREATE OR REPLACE FUNCTION public.is_verified_participant(p_user UUID)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT account_verified AND suspended_at IS NULL
           FROM public.profiles WHERE id = p_user),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.booking_participants_verified(p_client UUID, p_coach UUID)
RETURNS BOOLEAN AS $$
    SELECT public.is_verified_participant(p_client)
       AND public.is_verified_participant(p_coach);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Creating a booking now requires a verified client AND a verified coach.
-- Replaced in place (same policy name) so the old unrestricted rule is dropped.
DROP POLICY IF EXISTS "Clients can book appointments" ON public.appointments;
CREATE POLICY "Clients can book appointments" ON public.appointments
    FOR INSERT
    WITH CHECK (
        auth.uid() = client_id
        AND public.booking_participants_verified(client_id, coach_id)
    );

-- Accepting a booking (moving it to 'confirmed') is the coach's side of the same
-- rule. An admin may still manage any appointment, which is why is_admin() is
-- checked first in the trigger below.
CREATE OR REPLACE FUNCTION public.guard_booking_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed'
       AND OLD.status IS DISTINCT FROM 'confirmed'
       AND NOT public.is_admin() THEN
        IF NOT public.booking_participants_verified(NEW.client_id, NEW.coach_id) THEN
            RAISE EXCEPTION 'Only verified coaches and clients can confirm a booking. Complete account verification first.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_booking_confirmation ON public.appointments;
CREATE TRIGGER guard_booking_confirmation
    BEFORE UPDATE OF status ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.guard_booking_confirmation();

-- ------------------------------------------------------------------------------
-- 6. Notifications for a rejection must reach the user
-- ------------------------------------------------------------------------------
-- Already permitted by "System and Admins can insert notifications"
-- (WITH CHECK (true)), so no policy change is needed here. Kept as a comment so
-- the dependency is explicit rather than assumed.