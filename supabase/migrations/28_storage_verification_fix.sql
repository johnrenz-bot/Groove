-- ==============================================================================
-- GrooveSystem: Fix verification-documents storage policies
-- Migration 28: Enforce filename pattern, MIME types, and size limits
-- Apply AFTER storage_policies.sql. Safe to re-run.
-- ==============================================================================

-- Drop existing policies first to ensure clean state
DROP POLICY IF EXISTS "Users upload own client verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own coach verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users read own verification doc" ON storage.objects;
DROP POLICY IF EXISTS "Users replace own verification doc" ON storage.objects;
DROP POLICY IF EXISTS "Admins read all verification docs" ON storage.objects;

-- ==============================================================================
-- Client verification documents
-- Path pattern: clients/<auth.uid()>/<13-digit epoch ms>_<4 digits>.<ext>
-- Allowed: PDF, JPEG, PNG, WebP (max 5 MB)
-- ==============================================================================
CREATE POLICY "Users upload own client verification docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = 'clients'
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND array_length(storage.foldername(name), 1) = 2
    AND storage.filename(name) ~ '^[0-9]{13}_[0-9]{4}\.[A-Za-z0-9]{1,5}$'
    AND (metadata->>'size')::bigint <= 5242880
    AND (metadata->>'mimetype') IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    )
  );

-- ==============================================================================
-- Coach verification documents
-- Path pattern: coaches/<auth.uid()>/<13-digit epoch ms>_<4 digits>.<ext>
-- Allowed: PDF, JPEG, PNG, WebP (max 5 MB)
-- ==============================================================================
CREATE POLICY "Users upload own coach verification docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = 'coaches'
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND array_length(storage.foldername(name), 1) = 2
    AND storage.filename(name) ~ '^[0-9]{13}_[0-9]{4}\.[A-Za-z0-9]{1,5}$'
    AND (metadata->>'size')::bigint <= 5242880
    AND (metadata->>'mimetype') IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    )
  );

-- ==============================================================================
-- Read own documents
-- ==============================================================================
CREATE POLICY "Users read own verification doc"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] IN ('clients', 'coaches')
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- ==============================================================================
-- Replace own documents (upsert support)
-- ==============================================================================
CREATE POLICY "Users replace own verification doc"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] IN ('clients', 'coaches')
    AND (storage.foldername(name))[2] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] IN ('clients', 'coaches')
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND array_length(storage.foldername(name), 1) = 2
    AND storage.filename(name) ~ '^[0-9]{13}_[0-9]{4}\.[A-Za-z0-9]{1,5}$'
    AND (metadata->>'size')::bigint <= 5242880
    AND (metadata->>'mimetype') IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    )
  );

-- ==============================================================================
-- Admin read all verification documents
-- ==============================================================================
CREATE POLICY "Admins read all verification docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND public.is_admin()
  );