-- =============================================================================
-- Migration 25: GCash QR codes — private Storage bucket + profile records
-- =============================================================================
-- WHY THIS FILE EXISTS SEPARATELY FROM 21
--   21_gcash_payment_system.sql was written but NEVER applied to this project.
--   Verified against the live database on 2026-10-19 by querying PostgREST with
--   the anon key:
--       GET /rest/v1/gcash_profiles      -> 404 PGRST205 (table not in schema cache)
--       GET /rest/v1/payment_transactions -> 404 PGRST205
--   Meanwhile the tables 21 depends on DO exist (appointments, agreements,
--   profiles), and client_profiles.valid_id_path is populated, so 21 is simply
--   an unapplied file rather than a partially applied one.
--
--   This file creates the ONE piece of 21 that the product actually needs — the
--   GCash QR profile and the Storage bucket behind it — and leaves
--   payment_transactions alone. Nothing in the shipped UI reads or writes that
--   table, so creating it here would add an unused, RLS-bearing table for no
--   benefit.
--
-- SECURITY POSTURE — STRICTER THAN 21, ON PURPOSE
--   21's draft policy was:
--       CREATE POLICY "Anyone can view active gcash profiles"
--         FOR SELECT TO authenticated USING (is_active = true OR ...)
--   That hands every signed-in member the registered NAME and 11-digit MOBILE
--   NUMBER of every other member who has ever set up GCash. A GCash number is a
--   real-world payment target; publishing it platform-wide to anyone who registers
--   is a disclosure bug, not a feature. It also stores the QR image in the
--   `avatars` bucket, which is PUBLIC — so the screenshot would be permanently
--   fetchable by anyone who guesses or enumerates the path.
--
--   This file therefore does NOT recreate that policy. It drops it if present
--   and installs owner-only access instead, with the image in a PRIVATE bucket
--   reachable only through short-lived signed URLs. See the two notes in
--   section 3 for how the payee's QR still reaches the payer.
--
--   Net effect: no existing policy is weakened. Where 21's draft would have
--   granted broad read access, this file grants less.
--
-- Idempotent: every statement is IF NOT EXISTS / DROP ... IF EXISTS /
-- CREATE OR REPLACE, so a re-run converges instead of erroring.
-- =============================================================================


-- =============================================================================
-- 1. PRIVATE STORAGE BUCKET
-- =============================================================================
-- PRIVATE on purpose. `avatars` (used by 21) is a public bucket: anything written
-- there is readable forever by URL. A GCash QR is a live payment instrument, so
-- it gets its own bucket that stays private and is read through signed URLs.
--
-- The ceilings below are the authority; the matching client-side checks in
-- features/payments/services/gcashQrService.ts exist for UX and must agree.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-qr-codes',
    'payment-qr-codes',
    false,
    2097152, -- 2 MB. A QR screenshot is a phone photo crop, not a document.
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
    SET public             = false,
        file_size_limit    = 2097152,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON COLUMN storage.buckets.public IS
    'payment-qr-codes is private; read it with createSignedUrl, never a public URL.';


-- =============================================================================
-- 2. STORAGE OBJECT POLICIES — owner-scoped only
-- =============================================================================
-- Object name shape (mandated by the policies below):
--     <auth.uid()>/<13-digit epoch ms>.<ext>
-- e.g. payment-qr-codes/2c157499-.../1792323446042.png
--
-- storage.foldername(name) returns FOLDERS ONLY — it strips the filename — so a
-- two-segment path yields a ONE-element array. The uid is therefore
-- foldername(name)[1], and the leaf must be read with storage.filename(name).
-- This is the same correction already documented in supabase/storage_policies.sql
-- and 02_booking_schema.sql; getting it wrong denies every object silently.
--
-- array_length(...) = 1 rejects a nested path like "<uid>/sub/x.png", so a user
-- cannot bury an object deeper to slip past the leaf check.

-- ── INSERT ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users upload own gcash qr" ON storage.objects;
CREATE POLICY "Users upload own gcash qr"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'payment-qr-codes'
        AND (storage.foldername(name))[1] = (auth.uid())::text
        AND array_length(storage.foldername(name), 1) = 1
        AND storage.filename(name) ~ '^[0-9]{13}\.[A-Za-z0-9]{1,5}$'
        AND (metadata->>'size')::bigint <= 2097152
        AND (metadata->>'mimetype') IN ('image/png', 'image/jpeg', 'image/webp')
    );

-- ── SELECT ────────────────────────────────────────────────────────────────
-- Owner-only. This is the read half of "no one may learn someone else's GCash
-- details": signing a URL requires SELECT on the object.
DROP POLICY IF EXISTS "Users read own gcash qr" ON storage.objects;
CREATE POLICY "Users read own gcash qr"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'payment-qr-codes'
        AND (storage.foldername(name))[1] = (auth.uid())::text
        AND array_length(storage.foldername(name), 1) = 1
    );

-- ── UPDATE ────────────────────────────────────────────────────────────────
-- Required because supabase.storage.upload({ upsert: true }) issues a SELECT
-- and then an UPDATE when the object exists. Without this, replacing a QR would
-- 403 on a write the INSERT policy would have allowed.
DROP POLICY IF EXISTS "Users replace own gcash qr" ON storage.objects;
CREATE POLICY "Users replace own gcash qr"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'payment-qr-codes'
        AND (storage.foldername(name))[1] = (auth.uid())::text
        AND array_length(storage.foldername(name), 1) = 1
    )
    WITH CHECK (
        bucket_id = 'payment-qr-codes'
        AND (storage.foldername(name))[1] = (auth.uid())::text
        AND array_length(storage.foldername(name), 1) = 1
        AND storage.filename(name) ~ '^[0-9]{13}\.[A-Za-z0-9]{1,5}$'
        AND (metadata->>'size')::bigint <= 2097152
        AND (metadata->>'mimetype') IN ('image/png', 'image/jpeg', 'image/webp')
    );

-- ── DELETE ────────────────────────────────────────────────────────────────
-- Removing a QR must actually delete the object, not just forget its path, or
-- the image stays in the bucket forever.
DROP POLICY IF EXISTS "Users delete own gcash qr" ON storage.objects;
CREATE POLICY "Users delete own gcash qr"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'payment-qr-codes'
        AND (storage.foldername(name))[1] = (auth.uid())::text
        AND array_length(storage.foldername(name), 1) = 1
    );


-- =============================================================================
-- 3. GCASH PROFILE TABLE
-- =============================================================================
-- One row per account. `user_id` is UNIQUE, which is what makes
-- `.upsert({ ... }, { onConflict: 'user_id' })` safe to call repeatedly — the
-- registration page and the profile page both use it, and neither can create a
-- second row for the same person.
CREATE TABLE IF NOT EXISTS public.gcash_profiles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    account_name   VARCHAR(150) NOT NULL,
    account_number VARCHAR(30)  NOT NULL,
    -- The Storage PATH. This is the source of truth.
    qr_code_path   TEXT,
    -- LEGACY / UNUSED. 21's draft declared it, so it is kept here for schema
    -- compatibility with features/payments/types.ts. It is NOT written by any
    -- shipped code path and MUST NOT be treated as a displayable URL: the
    -- bucket is private, so a public-bucket URL stored here would 400 forever.
    -- Display URLs are signed on demand by gcashQrService.signedQrUrl().
    qr_code_url    TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gcash_profiles_user_id ON public.gcash_profiles(user_id);

COMMENT ON TABLE public.gcash_profiles IS
    'A member''s own GCash details. qr_code_path points at an object in the PRIVATE payment-qr-codes bucket.';
COMMENT ON COLUMN public.gcash_profiles.qr_code_path IS
    'Storage path of the QR image: <auth.uid()>/<epoch_ms>.<ext>. Never a URL.';
COMMENT ON COLUMN public.gcash_profiles.qr_code_url IS
    'Unused with the private payment-qr-codes bucket. Kept only for compatibility with 21''s draft shape. Use createSignedUrl().';


-- =============================================================================
-- 4. ROW-LEVEL SECURITY — owner only, admin included
-- =============================================================================
-- HOW THE PAYEE'S QR STILL REACHES THE PAYER
--   It does NOT go through this table. payment_transactions.payee_qr_url
--   (migration 21) is the intended channel: the payee creates the payment
--   request, and the payer reads the snapshot off the transaction row, which
--   "Participants can view their transactions" already scopes to the two
--   parties. Payment transactions are not shipped yet, so until they are, nobody
--   can read anyone else's QR — which is the correct default for a live payment
--   instrument, not a gap.
--
-- public.is_admin() is included so support staff can resolve a payment dispute.
-- It is a wider grant than a member's own row, and it is already the project's
-- established override (see 02_booking_schema.sql section 8).

ALTER TABLE public.gcash_profiles ENABLE ROW LEVEL SECURITY;

-- Drop 21's permissive draft if it was ever applied, so re-running this file
-- after 21 converges on the strict policy rather than the loose one.
DROP POLICY IF EXISTS "Anyone can view active gcash profiles" ON public.gcash_profiles;

DROP POLICY IF EXISTS "Users can view own gcash profile" ON public.gcash_profiles;
CREATE POLICY "Users can view own gcash profile"
    ON public.gcash_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = (auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own gcash profile" ON public.gcash_profiles;
CREATE POLICY "Users can insert own gcash profile"
    ON public.gcash_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own gcash profile" ON public.gcash_profiles;
CREATE POLICY "Users can update own gcash profile"
    ON public.gcash_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = (auth.uid()) OR public.is_admin())
    WITH CHECK (user_id = (auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own gcash profile" ON public.gcash_profiles;
CREATE POLICY "Users can delete own gcash profile"
    ON public.gcash_profiles
    FOR DELETE
    TO authenticated
    USING (user_id = (auth.uid()) OR public.is_admin());


-- =============================================================================
-- 5. updated_at MAINTENANCE
-- =============================================================================
-- The app writes updated_at on every save, but a direct SQL edit (or an admin
-- fix in the Supabase dashboard) would otherwise leave it stale. This trigger
-- only moves the timestamp forward — it never creates or deletes a row.
CREATE OR REPLACE FUNCTION public.set_gcash_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gcash_profiles_updated_at ON public.gcash_profiles;
CREATE TRIGGER gcash_profiles_updated_at
    BEFORE UPDATE ON public.gcash_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_gcash_profiles_updated_at();


-- =============================================================================
-- DONE
-- =============================================================================
-- After applying, verify:
--   SELECT id, name, public, file_size_limit, allowed_mime_types
--     FROM storage.buckets WHERE id = 'payment-qr-codes';
--   -- expect: public = false, 2097152, {image/png,image/jpeg,image/webp}
--
--   SELECT policyname, cmd FROM pg_policies
--     WHERE tablename = 'gcash_profiles' ORDER BY policyname;
--   -- expect ONLY the four "Users can * own gcash profile" policies.
--   -- "Anyone can view active gcash profiles" must NOT appear.
--
--   SELECT policyname, cmd FROM pg_policies
--     WHERE schemaname = 'storage' AND tablename = 'objects'
--       AND policyname LIKE '%gcash%';
--
-- Then re-run `npm run build` and exercise the QR upload on /register/client.
-- =============================================================================