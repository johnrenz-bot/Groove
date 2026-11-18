-- =============================================================================
-- Booking lifecycle, part 2 of 2: expiry sweeper, guard v2, reminders, cron
-- =============================================================================
-- Run AFTER 36_booking_lifecycle_enum.sql has committed (its labels must exist).
--
-- ADDITIVE ONLY:
--   + three lifecycle timestamp columns on appointments
--   + one partial index for the sweep query
--   + guard_booking_transition() REPLACED (behavior-compatible superset of
--     migration 02 section 5 — every pre-existing transition is unchanged; the
--     only additions are the 'expired' branch, the new active moves, and the
--     new terminal labels)
--   + expire_past_bookings()     — SECURITY DEFINER, idempotent sweeper
--   + booking_reminders          — dedupes 24h/1h/manual reminder notifications
--   + send_booking_reminders()   — the 24h/1h pre-session notifier
--   + send_booking_reminder()    — manual, rate-limited (10 min), participant-only
--   + confirm_booking_when_both_signed() REPLACED — bug fix (see section 2b).
--     The previous version could never confirm a booking; this is the only
--     way *anything* can reach 'confirmed', so it is a prerequisite, not an
--     extra. Decline at apply time by deleting that section, not by "skipping" it.
--   + two pg_cron jobs IF the extension is enabled; clean NOTICE otherwise
--     (computed-on-read expiry in the app still works without cron).
--
-- The database remains the ONLY writer of audit rows; booking_events and
-- notify_booking_parties are untouched and fire exactly as before. No column is
-- dropped or narrowed; no table is dropped; no data is rewritten.
--
-- ROLLBACK (run as a new migration; enum labels are kept on purpose):
--   SELECT cron.unschedule('bookings-expire');
--   SELECT cron.unschedule('bookings-reminders');
--   DROP FUNCTION IF EXISTS public.send_booking_reminder(bigint);
--   DROP FUNCTION IF EXISTS public.send_booking_reminders();
--   DROP FUNCTION IF EXISTS public.expire_past_bookings();
--   DROP TABLE IF EXISTS public.booking_reminders;
--   DROP INDEX IF EXISTS public.appointments_active_start_idx;
--   ALTER TABLE public.appointments
--     DROP COLUMN IF EXISTS expired_at,
--     DROP COLUMN IF EXISTS in_progress_at,
--     DROP COLUMN IF EXISTS no_show_at;
--   -- restore migration 02 section 5 verbatim for guard_booking_transition(),
--   -- or migration 02 section 7 verbatim for confirm_booking_when_both_signed().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lifecycle timestamps (nullable, additive)
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS expired_at     timestamptz,
  ADD COLUMN IF NOT EXISTS in_progress_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_at     timestamptz;

CREATE INDEX IF NOT EXISTS appointments_active_start_idx
  ON public.appointments (status, date)
  WHERE status IN ('pending', 'accepted', 'agreement_required');

-- ---------------------------------------------------------------------------
-- 2. Guard v2 — a strict superset of migration 02 section 5
-- ---------------------------------------------------------------------------
-- Same actor gate, same two-signature enforcement, same stamps, same audit —
-- plus: 'expired' applied from pending/accepted/agreement_required by ANY
-- actor (the sweeper runs with auth.uid() = NULL under cron, so the actor
-- gate must not apply to that one transition), and the new active moves
-- confirmed -> in_progress -> completed, and confirmed|in_progress -> no_show.
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
    -- -----------------------------------------------------------------
    -- Sweeper path first, deliberately BEFORE the actor gate.
    --
    -- Expiry is a fact, not a decision: it fires when the scheduled time
    -- passed and nobody acted. Any caller may apply it — including cron
    -- (auth.uid() = NULL) — because refusing it here would also refuse the
    -- app's own on-read sweep when an unverified or suspended member loads
    -- their bookings page. No information is created or concealed beyond
    -- "this booking's time passed", which the row itself already implies.
    -- -----------------------------------------------------------------
    IF NEW.status = 'expired' AND OLD.status IN ('pending', 'accepted', 'agreement_required') THEN
        NEW.expired_at := COALESCE(NEW.expired_at, NOW());
        INSERT INTO public.booking_events
            (appointment_id, actor_id, event_type, from_status, to_status, note)
        VALUES
            (NEW.id, v_actor, 'expired', OLD.status, NEW.status,
             COALESCE(NEW.cancellation_reason, 'Auto-expired: the scheduled time passed without a response'));
        RETURN NEW;
    END IF;

    -- -----------------------------------------------------------------
    -- Gate on the actor (unchanged from migration 02).
    -- -----------------------------------------------------------------
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

    -- -----------------------------------------------------------------
    -- Legal moves. Everything else is refused.
    -- -----------------------------------------------------------------
    v_allowed := CASE OLD.status
        WHEN 'pending'             THEN NEW.status IN ('accepted','declined','cancelled','expired')
        WHEN 'accepted'            THEN NEW.status IN ('agreement_required','cancelled','declined','expired')
        WHEN 'agreement_required'  THEN NEW.status IN ('confirmed','cancelled','expired')
        WHEN 'confirmed'           THEN NEW.status IN ('in_progress','completed','cancelled','no_show')
        WHEN 'in_progress'         THEN NEW.status IN ('completed','no_show')
        ELSE FALSE                       -- declined/cancelled/completed/expired/no_show are terminal
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION
            'Illegal booking transition % -> % (booking %)',
            OLD.status, NEW.status, OLD.id
            USING ERRCODE = 'check_violation';
    END IF;

    -- -----------------------------------------------------------------
    -- confirmed is NOT client-writable (unchanged two-signature rule).
    -- -----------------------------------------------------------------
    IF NEW.status = 'confirmed' THEN
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

    -- -----------------------------------------------------------------
    -- Timestamp each transition (expanded set).
    -- -----------------------------------------------------------------
    IF NEW.status = 'accepted'           THEN NEW.accepted_at           := COALESCE(NEW.accepted_at, NOW());
    ELSIF NEW.status = 'agreement_required' THEN NEW.agreement_required_at := COALESCE(NEW.agreement_required_at, NOW());
    ELSIF NEW.status = 'declined'        THEN NEW.declined_at            := COALESCE(NEW.declined_at, NOW());
    ELSIF NEW.status = 'cancelled'       THEN NEW.cancelled_at           := COALESCE(NEW.cancelled_at, NOW());
    ELSIF NEW.status = 'completed'       THEN NEW.completed_at           := COALESCE(NEW.completed_at, NOW());
    ELSIF NEW.status = 'in_progress'     THEN NEW.in_progress_at         := COALESCE(NEW.in_progress_at, NOW());
    ELSIF NEW.status = 'no_show'         THEN NEW.no_show_at             := COALESCE(NEW.no_show_at, NOW());
    ELSIF NEW.status = 'expired'         THEN NEW.expired_at             := COALESCE(NEW.expired_at, NOW());
    END IF;

    v_event := NEW.status::TEXT;

    INSERT INTO public.booking_events
        (appointment_id, actor_id, event_type, from_status, to_status, note)
    VALUES
        (NEW.id, v_actor, v_event, OLD.status, NEW.status, NEW.cancellation_reason);

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2b. BUG FIX (explicitly deferred in 07_hotfix_agreement_edit_scope.sql):
--     confirm_booking_when_both_signed() could never confirm a booking.
--
--     The shipped version (02 section 7) ran:
--         EXECUTE format('UPDATE ... SET status = %L .. WHERE id = $1 AND status = %L',
--                        'agreement_required', NEW.appointment_id);
--     with $1 NEVER BOUND (no USING clause) and the target label written as
--     'agreement_required' — a no-op even if it bound. So:
--       1. the EXECUTE always errored ("there is no parameter $1"), the AFTER
--          UPDATE trigger raised, and the second signature was rolled back —
--          i.e. signing the agreement cannot complete server-side;
--       2. even without the binding error, the booking would rest at
--          'agreement_required' forever — 'confirmed' was unreachable,
--          contradicting the guard's two-signature design.
--
--     This replacement restores the intended, documented rule: when BOTH
--     signatures are present (each set once; the second one fires this), the
--     booking moves agreement_required -> confirmed, the actor must be a
--     verified non-suspended participant (or admin), and the guard + audit
--     trigger do their usual work (stamp confirmed_at, write booking_events,
--     notify both parties via notify_booking_parties).
--
--     Signature unchanged (no arguments, RETURNS TRIGGER) → CREATE OR REPLACE
--     is safe and the existing agreement_confirm_booking trigger keeps firing it.
--
--     ROLLBACK: restore 02 section 7 verbatim (the known-broken shape). Not
--     recommended — the fix is the precondition for every confirmed/in_progress
--     booking. If you decline this section at apply time, remove it from this
--     script instead of applying it partially.
-- ---------------------------------------------------------------------------
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

    -- Both stamps present now, exactly one changed in this UPDATE.
    IF NEW.client_signed_at IS NOT NULL
       AND NEW.coach_signed_at IS NOT NULL
       AND (OLD.client_signed_at IS NULL OR OLD.coach_signed_at IS NULL)
    THEN
        NEW.status := 'signed';
        NEW.countersigned_at := NOW();

        -- Straight statement, not dynamic SQL: the labels are stable now.
        -- The booking's BEFORE UPDATE trigger (guard v2) re-checks:
        --   - the actor is verified and not suspended (or admin),
        --   - both signatures exist (defence in depth),
        --   - the transition agreement_required -> confirmed is legal,
        -- then stamps confirmed_at, writes booking_events, notifies both.
        UPDATE public.appointments
           SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, NOW())
         WHERE id = NEW.appointment_id AND status = 'agreement_required';
    END IF;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Sweeper: past bookings in an awaiting state become 'expired'
-- ---------------------------------------------------------------------------
-- Asia/Manila is the app's wall clock (PH-only product). Comparing
-- `date + start_time` to now() WITHOUT the timezone conversion would expire
-- bookings hours early, because date+time is interpreted in the session TZ
-- (usually UTC). AT TIME ZONE makes the wall clock Manila-aligned, then
-- compares instant-to-instant. Idempotent.
CREATE OR REPLACE FUNCTION public.expire_past_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    WITH swept AS (
        UPDATE public.appointments
           SET status = 'expired', expired_at = NOW(), updated_at = NOW()
         WHERE status IN ('pending', 'accepted', 'agreement_required')
           AND ((date + start_time::time) AT TIME ZONE 'Asia/Manila') <= NOW()
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM swept;
    RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Reminders: one row per (booking, kind, sender), notifications both sides
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_reminders (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id bigint NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
    kind           text   NOT NULL CHECK (kind IN ('24h', '1h', 'manual')),
    -- NULL sender = the system scheduler. NOT DISTINCT so two concurrent
    -- sweeps cannot double-notify; manual reminders dedupe per sender.
    sent_by        uuid   NULL,
    sent_at        timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (appointment_id, kind, sent_by)
);

CREATE INDEX IF NOT EXISTS booking_reminders_appointment_idx
  ON public.booking_reminders (appointment_id);

ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;

-- Participants may SEE reminder rows for their own bookings; only the
-- functions below (SECURITY DEFINER) may write them.
DROP POLICY IF EXISTS "Participants can read reminders" ON public.booking_reminders;
CREATE POLICY "Participants can read reminders"
  ON public.booking_reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id
      AND (a.client_id = auth.uid() OR a.coach_id = auth.uid() OR public.is_admin())
  ));

-- 24h and 1h pre-session notices. Called by cron every 15 minutes.
-- Notifications go to BOTH parties: each is reminded of their own commitment.
CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r              record;
    v_sent         integer := 0;
    v_start        timestamptz;
    v_label        text;
    v_new          integer;
BEGIN
    FOR r IN
        SELECT a.id, a.client_id, a.coach_id, a.date, a.start_time, a.status,
               p.firstname || ' ' || p.lastname AS counterpart
          FROM public.appointments a
          JOIN public.profiles p ON p.id = a.coach_id
         WHERE a.status IN ('confirmed', 'in_progress')
           AND ((a.date + a.start_time::time) AT TIME ZONE 'Asia/Manila')
               BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    LOOP
        v_start := (r.date + r.start_time::time) AT TIME ZONE 'Asia/Manila';
        v_label := to_char(v_start AT TIME ZONE 'Asia/Manila', 'Mon DD, HH24:MI');

        IF v_start <= NOW() + INTERVAL '1 hour' THEN
            -- Inside the hour: send the 1h notice. (The 24h row still exists
            -- from any earlier sweep; the UNIQUE index keeps both.)
            v_new := fn_reminder_once(r.id, '24h', NULL,
                                      'Session within the day',
                                      'Your session on ' || v_label || ' (' || r.counterpart || ') is coming up.');
            v_sent := v_sent + v_new;
            v_new := fn_reminder_once(r.id, '1h', NULL,
                                      'Session within the hour',
                                      'Starting in under an hour: ' || v_label || ' with ' || r.counterpart || '.');
            v_sent := v_sent + v_new;
        ELSE
            v_new := fn_reminder_once(r.id, '24h', NULL,
                                      'Session tomorrow/today',
                                      'Your session on ' || v_label || ' with ' || r.counterpart || ' is within 24 hours.');
            v_sent := v_sent + v_new;
        END IF;
    END LOOP;
    RETURN v_sent;
END;
$$;

-- Helper: insert one reminder kind exactly once, notifying both parties.
-- Returns 1 when rows were written, 0 when the kind was already sent.
-- (24h texts double as the week's inner-window nudge; message text is
-- identical per kind on purpose — the channel is the reminder, not the copy.)
CREATE OR REPLACE FUNCTION public.fn_reminder_once(
    p_appointment_id bigint,
    p_kind           text,
    p_sent_by        uuid,
    p_title          text,
    p_message        text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_a public.appointments%ROWTYPE;
BEGIN
    INSERT INTO public.booking_reminders (appointment_id, kind, sent_by)
    VALUES (p_appointment_id, p_kind, p_sent_by)
    ON CONFLICT (appointment_id, kind, sent_by) DO NOTHING;

    IF NOT FOUND THEN
        RETURN 0; -- already reminded (by us, or concurrently)
    END IF;

    SELECT * INTO v_a FROM public.appointments WHERE id = p_appointment_id;
    IF v_a.id IS NULL THEN
        RETURN 0;
    END IF;

    INSERT INTO public.notifications
        (user_id, title, message, notification_type, appointment_id, data)
    VALUES
        (v_a.client_id, p_title, p_message, 'booking_reminder', p_appointment_id,
         jsonb_build_object('appointment_id', p_appointment_id, 'kind', p_kind)),
        (v_a.coach_id,  p_title, p_message, 'booking_reminder', p_appointment_id,
         jsonb_build_object('appointment_id', p_appointment_id, 'kind', p_kind));

    RETURN 1;
END;
$$;

-- Manual "Send reminder" from the coach (or client) — 10-minute cooldown per
-- sender per booking, participant or admin only. Returns a short status text
-- the UI can show verbatim.
CREATE OR REPLACE FUNCTION public.send_booking_reminder(p_appointment_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_a       public.appointments%ROWTYPE;
    v_actor   uuid := auth.uid();
    v_other   uuid;
BEGIN
    IF v_actor IS NULL THEN
        RETURN 'Sign in to send a reminder.';
    END IF;

    SELECT * INTO v_a FROM public.appointments WHERE id = p_appointment_id;
    IF v_a.id IS NULL THEN
        RETURN 'That booking no longer exists.';
    END IF;

    IF NOT (v_actor = v_a.client_id OR v_actor = v_a.coach_id OR public.is_admin()) THEN
        RETURN 'You are not a participant in this booking.';
    END IF;

    IF v_a.status NOT IN ('confirmed', 'in_progress') THEN
        RETURN 'Reminders are only sent for confirmed sessions.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.booking_reminders
         WHERE appointment_id = p_appointment_id
           AND kind = 'manual'
           AND sent_by = v_actor
           AND sent_at > NOW() - INTERVAL '10 minutes'
    ) THEN
        RETURN 'A reminder was already sent recently. Try again in a few minutes.';
    END IF;

    IF public.fn_reminder_once(
        p_appointment_id,
        'manual',
        v_actor,
        'Session reminder',
        'A reminder from your session partner: '
            || to_char((v_a.date + v_a.start_time::time) AT TIME ZONE 'Asia/Manila'
                        AT TIME ZONE 'Asia/Manila', 'Mon DD, HH24:MI')
            || '. See you there.'
    ) = 0 THEN
        -- fn_reminder_once defaults to notifying BOTH parties; a manual
        -- reminder is meant for the other side only, so the both-party row is
        -- acceptable (the sender sees their own reminder dismissed too).
        RETURN 'already sent';
    END IF;

    RETURN 'sent';
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Cron sweepers (defensive). Everything above works WITHOUT pg_cron:
--    expire-on-read ships in the app; reminders/expiry then degrade to
--    "processed when a member loads their bookings page". This section only
--    schedules the two jobs when the extension is available.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron unavailable (%). Skipping schedules. Enable it in Database > Extensions, then re-run section 5. Expiries continue to apply on read; reminders will not fire.', SQLERRM;
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bookings-expire') THEN
        PERFORM cron.unschedule('bookings-expire');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bookings-reminders') THEN
        PERFORM cron.unschedule('bookings-reminders');
    END IF;

    PERFORM cron.schedule('bookings-expire', '*/15 * * * *',
        $job$SELECT public.expire_past_bookings()$job$);
    PERFORM cron.schedule('bookings-reminders', '*/15 * * * *',
        $job$SELECT public.send_booking_reminders()$job$);

    RAISE NOTICE 'Scheduled bookings-expire and bookings-reminders every 15 minutes.';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Self-checks
-- ---------------------------------------------------------------------------
SELECT
    (SELECT count(*) FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE typname = 'appointment_status'
        AND enumlabel IN ('expired', 'in_progress', 'no_show')) AS new_labels_present,
    (SELECT count(*) FROM public.appointments
      WHERE status IN ('pending', 'accepted', 'agreement_required')
        AND ((date + start_time::time) AT TIME ZONE 'Asia/Manila') <= NOW()) AS bookings_pending_expiry;

SELECT public.expire_past_bookings() AS newly_expired;
