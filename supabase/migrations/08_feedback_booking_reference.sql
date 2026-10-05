-- =============================================================================
-- STEP 8 — link public.feedbacks to the booking it belongs to
-- =============================================================================
-- Run ONCE in the Supabase SQL Editor. You run this manually.
-- Idempotent.
--
-- THE BUG
-- components/appointments/FeedbackModal.tsx inserted a booking reference:
--     supabase.from('feedbacks').insert({
--       appointment_id: appointment.appointment_id || appointment.id, ...
-- live public.feedbacks has no such column, so every review failed with:
--     HTTP 400  PGRST204
--     Could not find the 'appointment_id' column of 'feedbacks' in the schema cache
--
-- WHY appointments.id AND NOT appointments.appointment_id
--   appointments.id  is BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY — the
--     real key. It is what public.agreements.appointment_id and
--     public.booking_events.appointment_id already reference.
--   appointments.appointment_id is the 5-digit human-facing booking reference
--     (INTEGER UNIQUE, a 5-digit sequence). Nothing foreign-keys it, and it is
--     the value the UI pads and displays.
--   So the FK points at appointments(id). This matches the naming convention
--   already used by agreements.appointment_id, which likewise stores
--   appointments.id under the name 'appointment_id'.
--
-- TYPE
--   BIGINT, matching appointments.id exactly. Using INTEGER here would be a
--   latent mismatch against a BIGINT identity column.
--
-- ROW COUNT — MEASURED, NOT GUESSED
--   public.feedbacks returned Content-Range: */* and an empty body. Its SELECT
--   policy is USING (true), so anon sees every row: the table is genuinely
--   EMPTY and there is nothing to backfill. Adding a nullable column therefore
--   cannot lose or alter any existing review.
--
-- RLS — NO CHANGE NEEDED
--   Three policies exist on feedbacks and none references the new column:
--     SELECT  "Public can view feedback"      USING (true)
--     INSERT  "Clients can submit feedback"   WITH CHECK (auth.uid() = user_id)
--     ALL     "Admins can manage feedback"    (admin_hardening.sql)
--   A new nullable column is invisible to all three. Deliberately NOT tightening
--   the INSERT policy to verify the reviewer actually held that booking — that is
--   a worthwhile integrity control, but it is a behaviour change and out of
--   scope here.
--
-- NOT TOUCHED: agreements, signatures, booking confirmation logic, the
-- appointment_status enum, and every other table.
-- =============================================================================

ALTER TABLE public.feedbacks
    ADD COLUMN IF NOT EXISTS appointment_id BIGINT REFERENCES public.appointments(id) ON DELETE CASCADE;

-- Reviews will be read per booking (the agreement panel, the coach's session
-- view), so a plain btree index on the FK column is the right access path.
-- Partial, because historical rows without a booking reference would otherwise
-- occupy index entries that are never queried.
CREATE INDEX IF NOT EXISTS feedbacks_appointment_id_idx
    ON public.feedbacks (appointment_id)
    WHERE appointment_id IS NOT NULL;

COMMENT ON COLUMN public.feedbacks.appointment_id IS
    'The booking this review belongs to. References public.appointments(id) (the BIGINT identity PK), NOT appointments.appointment_id, which is only the human-facing 5-digit reference. Added by 08_feedback_booking_reference.sql.';


-- =============================================================================
-- OPTIONAL TIGHTENING — read before deciding
-- =============================================================================
-- The column above is NULLABLE, which is the smallest change and loses nothing.
-- But the bug being fixed here was precisely "a review with no booking
-- reference", so leaving it nullable allows the same mistake to reappear
-- silently.
--
-- Making it NOT NULL is free today: the table has zero rows.
--
-- BEFORE you do that, note this: lib/services/appointmentService.ts:69 has a
-- second feedbacks insert that sends NO appointment_id. That file is DEAD CODE
-- (grep confirms nothing imports it) and is already wrong, so it would break —
-- harmlessly, since nothing can reach it. It should be deleted or corrected
-- rather than left as a trap.
--
-- Uncomment if you want the invariant enforced:
--
-- ALTER TABLE public.feedbacks ALTER COLUMN appointment_id SET NOT NULL;


-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- 8a. The column and FK exist. Expect one row with the type and FK target.
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'feedbacks'
   AND column_name = 'appointment_id';
-- PASS: data_type = 'bigint', is_nullable = 'YES'

-- 8b. The FK targets appointments(id) and cascades. Expect one row.
SELECT conname, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conrelid = 'public.feedbacks'::regclass
   AND contype = 'f'
   AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                        WHERE attrelid = 'public.feedbacks'::regclass
                          AND attname = 'appointment_id')];
-- PASS: REFERENCES public.appointments(id) ON DELETE CASCADE

-- 8c. No rows were created or destroyed. Expect 0.
SELECT count(*) AS feedback_rows FROM public.feedbacks;

-- 8d. RLS is unchanged: still exactly three policies, none naming the column.
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'feedbacks'
 ORDER BY policyname;
-- PASS: 3 rows, unchanged from before.

-- 8e. After applying, PostgREST must see the column. Run this as the app's
--     anon key — a PGRST204 here means the schema cache has not reloaded.
--     If so:  NOTIFY pgrst, 'reload schema';
-- SELECT appointment_id FROM public.feedbacks?select=appointment_id&limit=1;
-- PASS: HTTP 200. (Or run the statement in the SQL Editor, which bypasses cache.)
--
-- 8f. Then sign in as the client and submit a review. Expect:
--     feedbacks row created with appointment_id = 7 (appointments.id),
--     appointments.rating + appointments.feedback updated for id = 7,
--     and no error.