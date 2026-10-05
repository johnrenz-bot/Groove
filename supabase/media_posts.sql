-- ==============================================================================
-- GrooveSystem: Community Showcase media bucket
--
-- Apply AFTER schema.sql and community_feed.sql. Safe to re-run.
--
-- ------------------------------------------------------------------------------
-- WHY THIS FILE EXISTS
-- ------------------------------------------------------------------------------
--
--   The Community Showcase upload has never worked. The frontend does:
--
--       supabase.storage.from('media-posts').upload(filename, file)
--       supabase.storage.from('media-posts').getPublicUrl(filename)
--
--   and the live project answers that upload with:
--
--       {"statusCode":"404","error":"Bucket not found","code":"NoSuchBucket"}
--
--   The bucket was never created. The old code then did
--   `if (!uploadErr && uploadData)` — so on failure it quietly set media_path to
--   NULL, created a text-only post, and reported success. The member's image was
--   simply gone, with no error anywhere.
--
--   Even with the bucket present, getPublicUrl() only resolves for PUBLIC
--   buckets. This project deliberately keeps media private and serves it with
--   short-lived signed URLs — that is how verification-documents already works
--   (see supabase/storage_policies.sql and lib/utils.ts SIGNED_URL_TTL_SECONDS).
--   So this bucket is created PRIVATE, and the frontend now stores the storage
--   path rather than a URL.
--
-- ------------------------------------------------------------------------------
-- PATH LAYOUT
-- ------------------------------------------------------------------------------
--
--   posts/<community>/<author uid>/<timestamp>_<random>.<ext>
--        ^^^^^^^^   ^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^
--        community  author        collision-resistant leaf
--
--   The community segment is what keeps community isolation intact at the STORAGE
--   layer, not just on the post row. Without it, any authenticated member could
--   request a signed URL for another community's image by guessing its path,
--   which would be a hole straight through the community_posts policy.
--
--   With it, the SELECT policy below compares the folder against
--   public.my_community() — the same function community_posts RLS uses. The two
--   cannot disagree, because they are the same function.
--
--   This REQUIRES supabase/community_feed.sql to be applied first: it creates
--   community_slug() and my_community(). This file fails loudly if they are
--   missing rather than creating a bucket with an unenforced policy.
--
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Preconditions — fail loudly, do not half-apply
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    SELECT 1 FROM pg_proc WHERE proname = 'my_community';
EXCEPTION
    WHEN undefined_table THEN
        RAISE EXCEPTION 'Run supabase/community_feed.sql before supabase/media_posts.sql';
END $$;

-- ------------------------------------------------------------------------------
-- 1. The bucket
--
--    public = false. See the header: this project serves private media with
--    signed URLs rather than public URLs.
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media-posts',
    'media-posts',
    false,
    -- 8 MB. Comfortably above a phone photo or a short rehearsal clip, and low
    -- enough that the bucket cannot be used as free file hosting.
    8388608,
    ARRAY[
        'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
        'video/mp4', 'video/webm', 'video/quicktime'
    ]
)
ON CONFLICT (id) DO UPDATE
    SET file_size_limit    = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
-- `public` is deliberately NOT in the DO UPDATE: flipping an existing bucket to
-- public would expose every object already in it.

COMMENT ON COLUMN storage.buckets.file_size_limit IS
    NULL on buckets with no limit; 8388608 (8 MB) for media-posts.';

-- ------------------------------------------------------------------------------
-- 2. Policies
--
--    storage.foldername(name) returns the path segments WITHOUT the filename, so
--    for 'posts/dancer/<uid>/file.jpg' it yields {posts, dancer, <uid>}. That
--    distinction is the whole basis of the folder checks below — indexing the
--    filename as a third folder segment is the classic mistake here.
-- ------------------------------------------------------------------------------

-- Upload: only into your OWN community folder, under your OWN uid.
DROP POLICY IF EXISTS "Members upload own community media" ON storage.objects;
CREATE POLICY "Members upload own community media" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'media-posts'
        AND (storage.foldername(name))[1] = 'posts'
        AND public.community_slug((storage.foldername(name))[2]) = public.my_community()
        AND (storage.foldername(name))[3] = (auth.uid())::text
    );

-- Read: your own community only. Same comparison as the INSERT check, so a
-- member cannot obtain a signed URL for another community's media even if they
-- learn the path.
DROP POLICY IF EXISTS "Members read own community media" ON storage.objects;
CREATE POLICY "Members read own community media" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'media-posts'
        AND (storage.foldername(name))[1] = 'posts'
        AND public.community_slug((storage.foldername(name))[2]) = public.my_community()
    );

-- Replace / remove: your own folder only.
DROP POLICY IF EXISTS "Members replace own community media" ON storage.objects;
CREATE POLICY "Members replace own community media" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'media-posts'
        AND (storage.foldername(name))[3] = (auth.uid())::text
    )
    WITH CHECK (
        bucket_id = 'media-posts'
        AND public.community_slug((storage.foldername(name))[2]) = public.my_community()
    );

DROP POLICY IF EXISTS "Members delete own community media" ON storage.objects;
CREATE POLICY "Members delete own community media" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'media-posts'
        AND (storage.foldername(name))[3] = (auth.uid())::text
    );

-- ==============================================================================
-- VERIFY (read-only; run after applying)
--
--   -- bucket exists and is private:
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'media-posts';
--   -- expect public = false
--
--   -- four policies:
--   SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--      AND policyname LIKE '%community media%'
--    ORDER BY cmd;
--
--   -- signed out, an upload must be refused (expect 400/401, not 200):
--   --   curl -X POST "$URL/storage/v1/object/media-posts/posts/dancer/x/y.jpg" ...
--
-- ==============================================================================
-- DELETING A POST
-- ------------------------------------------------------------------------------
-- The post row and its media are NOT linked by a database constraint: the media
-- object is created before the post row exists, so a foreign key is impossible
-- in that direction. Deleting a post therefore leaves its object in the bucket.
-- That is invisible (nothing references it, and the RLS policies are scoped by
-- author folder), but it does accumulate storage. A scheduled cleanup of objects
-- older than the retained window, or a Supabase Storage lifecycle rule on
-- media-posts, is the intended answer; it is deliberately not automated here.
-- ==============================================================================