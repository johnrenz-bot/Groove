-- =============================================================================
-- Post-migration verification checklist
-- =============================================================================
-- Run each block after 01_booking_enum.sql and 02_booking_schema.sql have both
-- completed. Every block states what a PASS looks like. Anything marked
-- [MUST] is a hard stop: the booking flow is not correct until it passes.
--
-- Run in the Supabase SQL Editor. Read-only — this file changes no data.
-- =============================================================================


-- [MUST] 1. Enum has all seven labels.
-- Expect 7 rows, including 'accepted' and 'agreement_required'.
SELECT enumlabel AS label
  FROM pg_enum
  JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status'
 ORDER BY enumsortorder;

-- Sanity: expect 7. (If 5, file 01 did not commit.)
SELECT count(*)::int AS enum_label_count FROM pg_enum
  JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status';


-- [MUST] 2. New columns exist on both tables.
-- Expect 15 rows, all NOT NULL = false.
SELECT table_name, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND (   (table_name = 'appointments'
            AND column_name IN ('accepted_at','agreement_required_at','confirmed_at',
                                'declined_at','cancelled_at','completed_at','cancelled_by',
                                'cancellation_reason','coach_notes','rate','duration_minutes',
                                'location','is_online','changes_requested_at','requested_changes_note'))
       OR (table_name = 'agreements'
            AND column_name IN ('appointment_id','version','status','session_type','location',
                                'rate','duration_minutes','scheduled_at','terms',
                                'cancellation_terms','responsibilities','payment_terms',
                                'content','client_signed_at','coach_signed_at','countersigned_at',
                                'changes_note','declined_at')))
 ORDER BY table_name, column_name;

-- Sanity: expect 15 and 18 respectively.
SELECT table_name, count(*)::int AS added_columns
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name IN ('appointments','agreements')
   AND column_name NOT IN (
     -- pre-existing columns, for contrast
     'id','appointment_id','client_id','coach_id','name','email','contact','address','date',
     'start_time','end_time','session_type','talent','experience','purpose','message','status',
     'feedback','rating','created_at','updated_at','agreement_date','appointment_price',
     'session_duration','payment_method','notice_hours','notice_days','cancellation_method',
     'client_signature_path','coach_signature_path','agreement_pdf_path','updated_at')
 GROUP BY table_name ORDER BY table_name;


-- [MUST] 3. The audit table exists and is RLS-protected.
SELECT relrowsecurity AS rls_enabled
  FROM pg_class WHERE relname = 'booking_events' AND relnamespace = 'public'::regnamespace;
-- Expect: t

-- There must be a SELECT policy and NO insert policy. One row expected.
SELECT policyname, cmd, roles::text
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'booking_events'
 ORDER BY policyname;


-- [MUST] 4. The dangerous agreements FOR ALL policy is GONE.
-- Expect ZERO rows. Any row here means a client can still write the coach's
-- signature column, and signatures are meaningless until this is empty.
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'agreements'
   AND cmd = 'ALL';
-- PASS = 0 rows


-- [MUST] 5. The replacement agreements policies are in place.
-- Expect: Participants can view agreements (SELECT),
--         Coaches can create agreements (INSERT),
--         Participants can update agreements (UPDATE).
SELECT policyname, cmd, permissive
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'agreements'
 ORDER BY cmd, policyname;


-- [MUST] 6. The appointments INSERT policy now requires BOTH parties verified.
SELECT policyname, cmd, left(qual, 120) AS using_clause, left(with_check, 220) AS check_clause
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'appointments'
 ORDER BY cmd, policyname;


-- [MUST] 7. All five trigger functions exist.
-- Expect 4 rows: booking_transition_guard, agreement_signature_guard,
--         agreement_confirm_booking, agreement_edit_scope_guard,
--         booking_event_notify.
SELECT tgname, tgenabled
  FROM pg_trigger
 WHERE NOT tgisinternal
   AND tgrelid IN ('public.appointments'::regclass, 'public.agreements'::regclass,
                   'public.booking_events'::regclass)
 ORDER BY tgname;


-- [MUST] 8. The signature bucket is PRIVATE.
SELECT id, public, file_size_limit, allowed_mime_types
  FROM storage.buckets WHERE id = 'contract-signatures';
-- PASS: public = false. If public = t, a signature is world-readable — fix immediately.


-- [MUST] 9. The signing helper function works on real data.
-- Jrenz Client  = verified  -> expect true
-- LUNA CRUZ     = pending   -> expect false
SELECT
    (SELECT public.can_book_appointment('c4f3a53b-d19c-4ea3-a094-dfe588d8ea75'::uuid)) AS jrenz_verified_expect_true,
    (SELECT public.can_book_appointment('9c9f041b-7f1b-477f-84ef-2b454b76762b'::uuid)) AS luna_pending_expect_false,
    (SELECT public.can_book_appointment('c4f3a53b-d19c-4ea3-a094-dfe588d8ea75'::uuid)) IS TRUE AS gate_works;


-- [MUST] 10. Storage object policies for signatures are scoped to participants.
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
   AND policyname ILIKE '%agreement signature%'
 ORDER BY policyname;
-- Expect exactly 2: read + upload. There should be NO update/delete policy —
-- signatures are write-once.


-- 11. Realtime publication includes the three new tables.
SELECT pubname, tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND tablename IN ('appointments','agreements','booking_events','profiles','messages')
 ORDER BY tablename;
-- Expect 5 rows (3 new + profiles from presence_realtime.sql + messages from
-- messenger.sql). Fewer means realtime will silently never fire.


-- 12. Nothing was lost. Row counts must be unchanged from before the migration.
SELECT 'appointments' AS tbl, count(*)::int FROM public.appointments
UNION ALL SELECT 'agreements',      count(*)::int FROM public.agreements
UNION ALL SELECT 'messages',        count(*)::int FROM public.messages
UNION ALL SELECT 'profiles',        count(*)::int FROM public.profiles
UNION ALL SELECT 'feedbacks',       count(*)::int FROM public.feedbacks
UNION ALL SELECT 'notifications',   count(*)::int FROM public.notifications
UNION ALL SELECT 'booking_events',  count(*)::int FROM public.booking_events
ORDER BY tbl;
-- Expected right now: appointments 0, agreements 0, messages 0, profiles 5,
--                     feedbacks 0, notifications 0, booking_events 0.


-- 13. No agreement was mis-linked by the backfill.
-- Should be 0. Any row here means the backfill paired an agreement with an
-- arbitrary booking and it needs manual correction.
SELECT a.id, a.client_id, a.coach_id, a.appointment_id
  FROM public.agreements a
 WHERE a.appointment_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.appointments ap
                    WHERE ap.id = a.appointment_id
                      AND ap.client_id = a.client_id
                      AND ap.coach_id  = a.coach_id);


-- =============================================================================
-- NOT verified by this checklist — needs two signed-in sessions.
-- =============================================================================
-- The following were reasoned about but cannot be proven by SQL alone, because
-- RLS keys off auth.uid() and a plain SQL session has none. Test them in the UI:
--
--   a) Verified client books a verified coach          -> appointments row, status pending
--   b) Unverified client books                         -> 42501, refused
--   c) Client books an unverified coach                -> 42501, refused
--   d) Coach accepts                                   -> status accepted, booking_events row
--   e) Coach tries to jump pending -> confirmed        -> refused: illegal transition
--   f) Coach confirms before signatures exist          -> refused: both signatures required
--   g) Client signs                                    -> agreements.client_signed_at set, still not confirmed
--   h) Coach signs                                     -> booking auto-moves to confirmed
--   i) Client tries to set coach_signed_at             -> refused: edit-scope guard
--   j) Coach tries to re-sign after signing            -> refused: signature immutable
--   k) Coach completes                                 -> status completed
--   l) Declined / cancelled are terminal (no further moves)
-- =============================================================================