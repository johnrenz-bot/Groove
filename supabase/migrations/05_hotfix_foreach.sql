-- =============================================================================
-- HOTFIX — replace the LIVE public.notify_booking_parties()
-- =============================================================================
-- Run ONCE in the Supabase SQL Editor, after 04_hotfix_user_status.sql.
-- You run this manually; nothing here is executed automatically.
--
-- THE BUG
-- The live function contained:
--     FOREACH v_recipient IN ARRAY (
--         CASE WHEN v_actor IS DISTINCT FROM v_client THEN v_client END,
--         CASE WHEN v_actor IS DISTINCT FROM v_coach  THEN v_coach  END
--     ) LOOP
--         CONTINUE WHEN v_recipient IS NULL;
--
-- In PL/pgSQL, `FOREACH target IN ARRAY <expr>` — the ARRAY token is the keyword
-- introducing the loop's array expression, NOT the array constructor. The
-- constructor form needs square brackets (ARRAY[...]). Round brackets make it a
-- parenthesised ROW, i.e. a record, so PL/pgSQL raised:
--     ERROR: FOREACH expression must yield an array, not type record
--
-- WHY IT BROKE ACCEPT
-- booking_event_notify is AFTER INSERT ON public.booking_events. Accepting runs
--     UPDATE appointments SET status='accepted'
--       -> guard_booking_transition (BEFORE UPDATE) inserts booking_events
--         -> booking_event_notify (AFTER INSERT) -> notify_booking_parties()
--            -> FOREACH -> ERROR
-- Being an AFTER trigger in the same transaction, the error ABORTED the whole
-- appointments UPDATE, so the booking stayed 'pending'. Accept never partially
-- succeeded — it failed outright at the first step.
--
-- THE FIX
--     FOREACH v_recipient IN ARRAY array_remove(ARRAY[v_client, v_coach], v_actor) LOOP
-- ARRAY[...] is unambiguously a real uuid[]; array_remove drops the actor, so the
-- OTHER party is notified — identical intent. When v_actor is NULL, array_remove
-- strips only NULL elements, and v_client/v_coach are guaranteed non-NNULL by the
-- guard above, so both survive and both parties are notified. The removed
-- CONTINUE is unreachable once the array cannot contain NULL.
--
-- SCOPE — one function, nothing else
--   * appointment_status enum: untouched
--   * RLS policies:            untouched
--   * guard_booking_transition: untouched
--   * guard_agreement_signature: untouched
--   * confirm_booking_when_both_signed: untouched
--   * booking_event_notify trigger: NOT recreated, keeps calling this same
--     function (CREATE OR REPLACE with the identical signature)
--   * no data is read or written by this file
--
-- Same signature (no arguments, RETURNS TRIGGER), so CREATE OR REPLACE succeeds
-- and the existing trigger keeps resolving to the same function.
-- Idempotent: safe to run more than once.
-- =============================================================================


-- =============================================================================
-- STEP 1 — BEFORE-SHOT (read-only). Confirms the live body is the broken one.
-- =============================================================================
-- Expect: has_fix = f  (the live copy is still the old, invalid version).
SELECT pg_get_functiondef(p.oid) AS definition,
       (pg_get_functiondef(p.oid) LIKE '%array_remove(ARRAY[v_client, v_coach], v_actor)%') AS has_fix
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'notify_booking_parties';


-- =============================================================================
-- STEP 2 — REPLACE THE LIVE FUNCTION
-- =============================================================================
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


-- The trigger is intentionally NOT dropped and recreated. CREATE OR REPLACE
-- keeps the same OID-free binding by name, so this statement is a no-op and is
-- here only to make the existing definition visible.
SELECT tgname,
       pg_get_triggerdef(oid) AS definition
  FROM pg_trigger
 WHERE NOT tgisinternal AND tgrelid = 'public.booking_events'::regclass;


-- =============================================================================
-- STEP 3 — VERIFICATION
-- =============================================================================
-- 3a. The function exists and the fix is in its live body. Expect has_fix = t.
SELECT p.proname,
       p.prorettype::regtype AS returns,
       p.prosecdef          AS security_definer,
       (pg_get_functiondef(p.oid) LIKE '%array_remove(ARRAY[v_client, v_coach], v_actor)%') AS has_fix,
       -- the broken form must be gone. A comment quoting it is fine, so this
       -- deliberately tests for the live 'IN ARRAY (' + CASE shape instead.
       (pg_get_functiondef(p.oid) ~ 'IN ARRAY \(\s*CASE') AS still_broken
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'notify_booking_parties';
-- PASS: has_fix = t  AND  still_broken = f

-- 3b. The trigger still points at this function. Expect one row naming
--     notify_booking_parties().
SELECT tgname,
       pg_get_triggerdef(oid) AS definition
  FROM pg_trigger
 WHERE NOT tgisinternal
   AND tgrelid = 'public.booking_events'::regclass
   AND pg_get_triggerdef(oid) ILIKE '%notify_booking_parties%';

-- 3c. No other booking function was altered. Each of these must still exist.
--     Only notify_booking_parties should differ from before this file ran.
SELECT proname,
       (pg_get_functiondef(oid) LIKE '%IS DISTINCT FROM%suspended%') AS transition_guard_intact,
       (pg_get_functiondef(oid) LIKE '%both signatures are required%') AS signature_gate_intact,
       (pg_get_functiondef(oid) LIKE '%array_remove(ARRAY[v_client, v_coach], v_actor)%') AS notify_fixed
  FROM pg_proc
  JOIN pg_namespace n ON n.oid = pronamespace
 WHERE n.nspname = 'public'
   AND proname IN ('guard_booking_transition', 'guard_agreement_signature',
                   'guard_agreement_edit_scope', 'confirm_booking_when_both_signed',
                   'notify_booking_parties', 'can_book_appointment')
 ORDER BY proname;
-- PASS: guard_booking_transition.transition_guard_intact = t
--       guard_booking_transition.signature_gate_intact = t
--       notify_booking_parties.notify_fixed           = t

-- 3d. The enum is untouched. Expect exactly 7 labels, including accepted and
--     agreement_required.
SELECT enumlabel
  FROM pg_enum
  JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status'
 ORDER BY enumsortorder;

-- 3e. RLS policy count on appointments is unchanged (3) and on agreements (3).
SELECT tablename, count(*) AS policies
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename IN ('appointments', 'agreements')
 GROUP BY tablename ORDER BY tablename;

-- 3f. No data was written by this file.
SELECT (SELECT count(*) FROM public.appointments)  AS appointments,
       (SELECT count(*) FROM public.agreements)   AS agreements,
       (SELECT count(*) FROM public.booking_events) AS booking_events;

-- =============================================================================
-- STEP 4 — UI CHECK
-- =============================================================================
-- Coach -> Coaching Requests -> Accept on a pending request. Expect:
--   * no "FOREACH expression must yield an array" error
--   * appointments.status = 'agreement_required'
--   * exactly 2 booking_events rows for that booking
--     (pending->accepted, accepted->agreement_required)
--   * exactly 1 notification for the client
--
-- The booking lifecycle is unchanged by this file:
--   pending -> accepted -> agreement_required -> confirmed (both signed)
-- =============================================================================
