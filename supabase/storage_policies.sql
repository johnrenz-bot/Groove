-- Storage policies for private buckets.
-- Safe to re-run: every object is dropped before it is created.
--
-- verification-documents is PRIVATE. Nothing here changes bucket.public, so the
-- bucket must already be private and stays private. Do not set it public to make
-- uploads work -- the INSERT policy below is what makes uploads succeed.

-- ============================================================================
-- verification-documents (private)
--
-- Client ID documents are uploaded AFTER auth.signUp(), so the writer is
-- authenticated and the object name carries their uid:
--   clients/<auth.uid()>/<timestamp>_<custom_id>.<ext>
--   coaches/<auth.uid()>/<timestamp>_<custom_id>.<ext>
--
-- The 5 MB and MIME restrictions mirror the client-side checks in
-- components/auth/RegistrationFormFields.tsx (handleIdChange) and
-- app/register/coach/page.tsx. RLS is the authority: a client-side check is
-- trivially bypassed, so both layers exist and must agree.
-- ============================================================================

drop policy if exists "Users upload own client verification docs"
  on storage.objects;
create policy "Users upload own client verification docs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    -- Own folder only. This is the ownership guarantee: no one can write into
    -- another user's folder, and the anon role is not granted INSERT at all.
    and (storage.foldername(name))[1] = 'clients'
    and (storage.foldername(name))[2] = (auth.uid())::text
    -- Exactly one file level below the uid folder: no nested traversal.
    -- storage.foldername() returns FOLDERS ONLY -- it strips the filename --
    -- so a 3-segment path yields a 2-element array, not 3.
    and array_length(storage.foldername(name), 1) = 2
    -- Name shape: <epoch_ms>_<4-digit custom_id>.<ext>. The leaf segment comes
    -- from storage.filename(), not from foldername()[3].
    and storage.filename(name) ~ '^[0-9]{13}_[0-9]{4}\.[A-Za-z0-9]{1,5}$'
    -- Size ceiling: 5 MB. (metadata->>'size') is the byte count Supabase records.
    and (metadata->>'size')::bigint <= 5242880
    -- MIME allowlist, matching the form's validTypes.
    and (metadata->>'mimetype') in (
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    )
  );

drop policy if exists "Users upload own coach verification docs"
  on storage.objects;
create policy "Users upload own coach verification docs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = (auth.uid())::text
    -- Same correction as the client policy above: foldername() strips the
    -- filename, so 3 path segments => 2-element array, and the leaf is read
    -- with storage.filename().
    and array_length(storage.foldername(name), 1) = 2
    and storage.filename(name) ~ '^[0-9]{13}_[0-9]{4}\.[A-Za-z0-9]{1,5}$'
    and (metadata->>'size')::bigint <= 5242880
    and (metadata->>'mimetype') in (
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    )
  );

-- Upsert support. supabase.storage.upload({ upsert: true }) issues a SELECT
-- before writing and an UPDATE when the object already exists, so INSERT-only
-- policies 403 on a re-upload even though the write itself would be permitted.
-- Scoped to the owner's own folder, same as INSERT.
drop policy if exists "Users read own verification doc"
  on storage.objects;
create policy "Users read own verification doc"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] in ('clients', 'coaches')
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

drop policy if exists "Users replace own verification doc"
  on storage.objects;
create policy "Users replace own verification doc"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] in ('clients', 'coaches')
    and (storage.foldername(name))[2] = (auth.uid())::text
  )
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] in ('clients', 'coaches')
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

-- Admins review verification documents for approval. Admin-only by design: a
-- user reading their own document is covered by the SELECT policy above, so this
-- adds no user-facing read access.
drop policy if exists "Admins read all verification docs"
  on storage.objects;
create policy "Admins read all verification docs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and public.is_admin()
  );