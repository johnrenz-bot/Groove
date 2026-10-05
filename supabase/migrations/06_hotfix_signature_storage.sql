-- =============================================================================
-- HOTFIX — repair the LIVE contract-signatures storage policies
-- =============================================================================
-- Run ONCE in the Supabase SQL Editor, after 05_hotfix_foreach.sql.
-- You run this manually; nothing here is executed automatically.
--
-- THE BUG
-- Signing failed with:
--     The signature image could not be stored
--     (new row violates row-level security policy)
--
-- The signing code writes this object name:
--     storage.objects.name = '<booking id>/<party>-<unix>.png'
--     e.g. '7/client-1758000000000.png'
--
-- The live policies compared the booking id against:
--     ap.id::TEXT = (storage.foldername(name))[2]
--
-- Two mistakes, and the first is the fatal one:
--
--   1. THE BUCKET IS NOT PART OF `name`. The bucket is the bucket_id column, so
--      name is only '7/client-....png' and storage.foldername(name) returns
--      ['7'] — ONE element. Index [2] is NULL, so `ap.id::TEXT = NULL` is never
--      true, EXISTS() is always false, and EVERY upload was refused.
--   2. storage.foldername(name) EXCLUDES the filename, so the leaf must come
--      from storage.filename(name), never from another foldername index.
--
-- The same wrong index was in the SELECT policy, so signed-URL reads were
-- broken too — a signature that could be uploaded would never have rendered.
--
-- This is the same gotcha documented and avoided in
-- supabase/storage_policies.sql for verification-documents, where objects are
-- 'clients/<uid>/<file>': folder segments [1] and [2], leaf via
-- storage.filename(name). This file follows that proven convention.
--
-- SCOPE — two storage policies, nothing else
--   * bucket stays PRIVATE (public = false, untouched)
--   * no agreement or appointment RLS touched
--   * guard_agreement_signature / guard_agreement_edit_scope untouched
--   * the booking lifecycle and appointment_status untouched
--   * no UPDATE or DELETE policy added; signatures stay write-once
--
-- NET EFFECT: strictly MORE RESTRICTIVE than what is live now.
--   * adds TO authenticated, so anon cannot be granted INSERT by inheritance
--   * adds array_length(...) = 1, rejecting a nested path such as
--     '7/sub/client-x.png' that would otherwise bypass the leaf check
-- Idempotent: DROP ... IF EXISTS then CREATE.
-- =============================================================================


-- =============================================================================
-- STEP 1 — BEFORE-SHOT (read-only). Confirms the broken index is live.
-- =============================================================================
SELECT policyname, cmd, roles::text, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'storage'
   AND tablename = 'objects'
   AND policyname IN ('Participants read own agreement signatures',
                      'Parties upload own agreement signature')
 ORDER BY policyname;
-- Expect the body to contain foldername(name))[2]  -> that is the bug.


-- =============================================================================
-- STEP 2 — BUCKET (asserted, never made public)
-- =============================================================================
-- Deliberately an assertion rather than a silent fix: if this bucket were
-- public, signatures would be world-readable and that must be surfaced loudly
-- rather than quietly corrected.
DO $$
DECLARE v_public BOOLEAN; v_limit BIGINT;
BEGIN
    SELECT public, file_size_limit INTO v_public, v_limit
      FROM storage.buckets WHERE id = 'contract-signatures';

    IF v_public IS NULL THEN
        RAISE EXCEPTION 'Bucket contract-signatures does not exist';
    END IF;

    IF v_public THEN
        RAISE EXCEPTION 'Bucket contract-signatures is PUBLIC — signatures would be readable by anyone. Set public = false before proceeding.';
    END IF;

    RAISE NOTICE 'contract-signatures: private, size limit % bytes', v_limit;
END $$;


-- =============================================================================
-- STEP 3 — REPLACE THE TWO POLICIES
-- =============================================================================
-- Signed images are read through short-lived signed URLs, which are authorised
-- by this SELECT policy. It stays; it is simply corrected.
DROP POLICY IF EXISTS "Participants read own agreement signatures" ON storage.objects;
CREATE POLICY "Participants read own agreement signatures"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'contract-signatures'
        -- Rejects a nested path like '7/sub/client-x.png'. foldername() strips
        -- the leaf, so a legitimate object has exactly one folder segment.
        AND array_length(storage.foldername(name), 1) = 1
        AND EXISTS (
            SELECT 1
              FROM public.appointments ap
             WHERE ap.id::TEXT = (storage.foldername(name))[1]
               AND (ap.client_id = auth.uid() OR ap.coach_id = auth.uid())
        )
    );

-- A party may only ever write their OWN leaf: the filename must start with
-- 'client' or 'coach', resolved against that booking's actual parties. So a
-- client cannot write the coach's file even if they guess the path, and cannot
-- write into a booking they are not part of.
DROP POLICY IF EXISTS "Parties upload own agreement signature" ON storage.objects;
CREATE POLICY "Parties upload own agreement signature"
    ON storage.objects
    FOR INSERT
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

-- No UPDATE and no DELETE policy is created. Signatures are write-once
-- (guard_agreement_signature refuses any change to a recorded timestamp), so
-- the absence of these is deliberate, not an oversight.


-- =============================================================================
-- STEP 4 — VERIFICATION
-- =============================================================================
-- 4a. Bucket is still private. Expect public = f.
SELECT id, public, file_size_limit, allowed_mime_types
  FROM storage.buckets WHERE id = 'contract-signatures';

-- 4b. Exactly two policies on this bucket, both TO authenticated, and neither
--     references the wrong index. Expect 2 rows, uses_correct_index = t.
SELECT policyname,
       cmd,
       roles::text,
       (COALESCE(qual, '') || COALESCE(with_check, ''))
         LIKE '%foldername(name))[1]%' AS uses_correct_index,
       (COALESCE(qual, '') || COALESCE(with_check, ''))
         LIKE '%foldername(name))[2]%' AS still_broken
  FROM pg_policies
 WHERE schemaname = 'storage'
   AND tablename = 'objects'
   AND policyname IN ('Participants read own agreement signatures',
                      'Parties upload own agreement signature')
 ORDER BY policyname;
-- PASS: uses_correct_index = t on both rows, still_broken = f on both.

-- 4c. No UPDATE/DELETE policy crept in. Expect ZERO rows.
SELECT policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'storage'
   AND tablename = 'objects'
   AND policyname ILIKE '%agreement signature%'
   AND cmd IN ('UPDATE', 'DELETE', 'ALL');
-- PASS = 0 rows

-- 4d. Simulate the path the signing code produces, for every booking, to show
--     which uid is authorised to write which leaf. Read-only.
--     Replace 7 with a real appointment id that has a pending agreement.
SELECT ap.id AS appointment_id,
       ap.client_id AS client_may_write_prefix,
       'client-'                                   AS client_leaf_prefix,
       ap.coach_id  AS coach_may_write_prefix,
       'coach-'                                    AS coach_leaf_prefix,
       -- what the corrected policy evaluates
       array_length(storage.foldername(
           ap.id::TEXT || '/client-1758000000000.png'), 1) AS folder_segments,
       (storage.foldername(
           ap.id::TEXT || '/client-1758000000000.png'))[1] AS booking_id_read,
       storage.filename(
           ap.id::TEXT || '/client-1758000000000.png')   AS leaf_read
  FROM public.appointments ap
 ORDER BY ap.id DESC
 LIMIT 5;
-- PASS: folder_segments = 1, booking_id_read = ap.id, leaf_read = 'client-....png'

-- 4e. Signature guard and lifecycle untouched. Expect both t.
SELECT
  (SELECT pg_get_functiondef(oid) LIKE '%Client signature is immutable once recorded%'
     FROM pg_proc WHERE proname = 'guard_agreement_signature')  AS signature_immutable_intact,
  (SELECT pg_get_functiondef(oid) LIKE '%both signatures are required%'
     FROM pg_proc WHERE proname = 'guard_booking_transition')   AS transition_guard_intact,
  (SELECT pg_get_functiondef(oid) LIKE '%array_remove(ARRAY[v_client, v_coach], v_actor)%'
     FROM pg_proc WHERE proname = 'notify_booking_parties')     AS notify_hotfix_intact;

-- 4f. Enumeration untouched. Expect 7 labels.
SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
 WHERE typname = 'appointment_status' ORDER BY enumsortorder;

-- 4g. No rows changed.
SELECT (SELECT count(*) FROM public.appointments) AS appointments,
       (SELECT count(*) FROM public.agreements)  AS agreements;

-- =============================================================================
-- STEP 5 — UI CHECK (needs two signed-in sessions; not done by this file)
-- =============================================================================
--   a) Client signs  -> image uploads, client_signed_at stamped by trigger,
--                       agreement.client_signature_path = '<id>/client-<ts>.png',
--                       coach sees "Client ✓" in /messages via realtime.
--   b) Coach signs   -> coach_signed_at stamped, agreement flips to CONFIRMED
--                       automatically; both see "Booking confirmed".
--   c) A third user  -> upload refused (42501). Not a party on that booking, so
--                       the EXISTS() is false for them.
--   d) Client tries to write the coach's leaf -> refused: the CASE resolves to
--                       'client' for them, which does not match 'coach-...'.
--
-- Signed URLs: reading uses the corrected SELECT policy, so a signature written
-- under this policy renders immediately in /messages and in /contracts/[id].
-- The bucket stays private; nothing here uses getPublicUrl.
-- =============================================================================