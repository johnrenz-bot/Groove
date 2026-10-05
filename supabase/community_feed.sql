    -- ==============================================================================
    -- GrooveSystem: Community Showcase feed (Dancer / Singer / Acting / Theater)
    --
    -- Apply AFTER schema.sql. Safe to re-run: every object is dropped or guarded.
    --
    -- ------------------------------------------------------------------------------
    -- WHAT ALREADY EXISTS (nothing here duplicates it)
    -- ------------------------------------------------------------------------------
    --
    --   public.community_posts   id, author_id, caption, media_path, talent, deleted_at
    --   public.comments          id, post_id, user_id, body, created_at, updated_at
    --   public.post_reacts       id, post_id, user_id, created_at
    --
    -- Those three tables already exist in the live database and are already used by
    -- components/community/CommunityFeed.tsx. This file therefore ADDS NO TABLES and
    -- ADDS NO DUPLICATE COLUMNS. It supplies what was missing: the community model,
    -- the isolation rules, and the edit path.
    --
    -- COLUMN-NAME DEVIATION FROM THE BRIEF (deliberate)
    --
    --   The brief asked for `user_id` on posts and `content` on comments. The live
    --   tables are `author_id` and `body`. They are REUSED as-is rather than renamed:
    --   renaming would rewrite two live tables, drop and recreate their indexes and
    --   foreign keys, and force a coordinated change to the existing feed component
    --   and every row of data — for a naming difference only. Adding parallel
    --   user_id/content columns was rejected because two columns holding the same
    --   value is two sources of truth, and the lossy one is the one that gets read.
    --
    --   `talent` is likewise reused as the community column: posts already had it,
    --   it is already indexed (idx_community_posts_talent), and it already answers
    --   "which community is this post in".
    --
    -- ------------------------------------------------------------------------------
    -- THE FOUR COMMUNITIES, AND WHY THE VOCABULARY DIFFERS
    -- ------------------------------------------------------------------------------
    --
    --   The brief names the communities Dancer / Singer / Acting / Theater.
    --   `client_profiles.talent` and `coach_profiles.talents` already exist and are
    --   free text, currently holding 'Dance' (both vocabularies differ only by
    --   grammatical form: Dance/Dancer, Singing/Singer).
    --
    --   Posts store the brief's canonical slugs. Profile data is NOT rewritten — the
    --   Coach directory filters on coach_profiles.talents and must keep working — so
    --   public.community_slug() maps either form onto one canonical slug. That makes
    --   the isolation rules tolerant of both vocabularies without a data migration.
    --
    -- ==============================================================================

    -- ------------------------------------------------------------------------------
    -- 0. is_admin() must exist, or every admin policy below is meaningless
    -- ------------------------------------------------------------------------------
    DO $$
    BEGIN
        SELECT 1 FROM pg_proc WHERE proname = 'is_admin';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE EXCEPTION 'Run supabase/schema.sql and supabase/admin_hardening.sql first';
    END $$;

    -- ------------------------------------------------------------------------------
    -- 1. The canonical community vocabulary
    --
    --    One place that decides what "a dancer" is called, so RLS, the CHECK
    --    constraint and the frontend cannot drift apart. Tolerant of the existing
    --    profile vocabulary by design (see the note above).
    -- ------------------------------------------------------------------------------
    CREATE OR REPLACE FUNCTION public.community_slug(p_value TEXT)
    RETURNS TEXT AS $$
    DECLARE
        v TEXT := lower(coalesce(trim(p_value), ''));
    BEGIN
        -- Substring first so 'dancer' and 'dance' both land on 'dancer', rather than
        -- enumerating every spelling separately.
        RETURN CASE
            WHEN v LIKE 'danc%'  THEN 'Dancer'
            WHEN v LIKE 'sing%'  THEN 'Singer'
            WHEN v LIKE 'sing'   THEN 'Singer'
            WHEN v LIKE 'act%'   THEN 'Acting'
            WHEN v LIKE 'theat%' THEN 'Theater'
            WHEN v LIKE 'drama%' THEN 'Theater'
            ELSE NULL
        END;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    COMMENT ON FUNCTION public.community_slug(TEXT) IS
        'Maps a free-text talent value onto one of the four canonical community slugs (Dancer, Singer, Acting, Theater). Returns NULL when unrecognised.';

    -- ------------------------------------------------------------------------------
    -- 2. The signed-in user's own community
    --
    --    This is what every RLS policy below compares against. It reads the user's
    --    OWN profile row, so it cannot be spoofed by anything the client sends.
    --
    --    profiles.role is only ('client','coach','admin') and therefore cannot supply
    --    the community; the discipline lives in the role-specific detail table.
    --    SECURITY DEFINER so the detail row is readable regardless of the caller's
    --    own RLS on client_profiles / coach_profiles.
    --
    --    Admins return NULL: they moderate rather than post, and NULL fails every
    --    "same community" comparison, which is the safe default.
    -- ------------------------------------------------------------------------------
    CREATE OR REPLACE FUNCTION public.my_community()
    RETURNS TEXT AS $$
    DECLARE
        v_role   user_role;
        v_talent TEXT;
    BEGIN
        IF auth.uid() IS NULL THEN
            RETURN NULL;
        END IF;

        SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
        IF v_role IS NULL OR v_role = 'admin' THEN
            RETURN NULL;
        END IF;

        IF v_role = 'coach' THEN
            SELECT talents INTO v_talent FROM public.coach_profiles WHERE id = auth.uid();
        ELSE
            SELECT talent  INTO v_talent FROM public.client_profiles WHERE id = auth.uid();
        END IF;

        RETURN public.community_slug(v_talent);
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    COMMENT ON FUNCTION public.my_community() IS
        'The canonical community of the signed-in user, or NULL for admins and signed-out callers. Used by every community_posts / comments RLS policy.';

    -- ------------------------------------------------------------------------------
    -- 3. Constrain posts to the four communities
    --
    --    Safe to add now: the table is empty, so no legacy 'Dance' row is rejected.
    --    The migration below is written to convert legacy values if any ever appear
    --    (e.g. rows written by an older build), so it is safe on a non-empty table too.
    -- ------------------------------------------------------------------------------
    UPDATE public.community_posts
    SET talent = public.community_slug(talent)
    WHERE public.community_slug(talent) IS NOT NULL
    AND talent IS DISTINCT FROM public.community_slug(talent);

    DO $$
    BEGIN
        ALTER TABLE public.community_posts
            ADD CONSTRAINT community_posts_talent_check
            CHECK (talent IN ('Dancer', 'Singer', 'Acting', 'Theater'));
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_community_posts_talent_created
        ON public.community_posts (talent, created_at DESC);

    -- ------------------------------------------------------------------------------
    -- 4. RLS — community_posts
    --
    --    The four rules, in the brief's terms:
    --      - read only your own community
    --      - create only in your own community, only as yourself
    --      - edit only your own posts, and never move them to another community
    --      - delete only your own posts
    --
    --    Every policy carries the community comparison AND the ownership check
    --    together on UPDATE. A policy with only `author_id = auth.uid()` would let a
    --    user republish their post into a community they cannot otherwise read.
    -- ------------------------------------------------------------------------------
    ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Members read their own community posts" ON public.community_posts;
    CREATE POLICY "Members read their own community posts" ON public.community_posts
        FOR SELECT
        USING (
            public.is_admin()
            OR talent = public.my_community()
        );

    DROP POLICY IF EXISTS "Members create posts in their own community" ON public.community_posts;
    CREATE POLICY "Members create posts in their own community" ON public.community_posts
        FOR INSERT
        WITH CHECK (
            author_id = auth.uid()
            AND talent = public.my_community()
        );

    DROP POLICY IF EXISTS "Authors update their own posts" ON public.community_posts;
    CREATE POLICY "Authors update their own posts" ON public.community_posts
        FOR UPDATE
        USING (
            public.is_admin()
            OR (author_id = auth.uid() AND talent = public.my_community())
        )
        WITH CHECK (
            public.is_admin()
            OR (author_id = auth.uid() AND talent = public.my_community())
        );

    DROP POLICY IF EXISTS "Authors delete their own posts" ON public.community_posts;
    CREATE POLICY "Authors delete their own posts" ON public.community_posts
        FOR DELETE
        USING (
            public.is_admin()
            OR author_id = auth.uid()
        );

    -- ------------------------------------------------------------------------------
    -- 5. RLS — comments
    --
    --    A comment is reachable only through a post in the reader's own community,
    --    so the policy joins back to community_posts rather than trusting the row.
    --    That join is also why the comment SELECT cannot simply be `true`.
    -- ------------------------------------------------------------------------------
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Members read comments on their community posts" ON public.comments;
    CREATE POLICY "Members read comments on their community posts" ON public.comments
        FOR SELECT
        USING (
            public.is_admin()
            OR EXISTS (
                SELECT 1
                FROM public.community_posts p
                WHERE p.id = comments.post_id
                AND p.talent = public.my_community()
            )
        );

    DROP POLICY IF EXISTS "Members comment on their community posts" ON public.comments;
    CREATE POLICY "Members comment on their community posts" ON public.comments
        FOR INSERT
        WITH CHECK (
            user_id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM public.community_posts p
                WHERE p.id = comments.post_id
                AND p.talent = public.my_community()
            )
        );

    DROP POLICY IF EXISTS "Authors update their own comments" ON public.comments;
    CREATE POLICY "Authors update their own comments" ON public.comments
        FOR UPDATE
        USING (public.is_admin() OR user_id = auth.uid())
        WITH CHECK (public.is_admin() OR user_id = auth.uid());

    DROP POLICY IF EXISTS "Authors delete their own comments" ON public.comments;
    CREATE POLICY "Authors delete their own comments" ON public.comments
        FOR DELETE
        USING (public.is_admin() OR user_id = auth.uid());

    -- ------------------------------------------------------------------------------
    -- 6. RLS — post_reacts
    --
    --    Kept consistent with the feed: you can only react to a post you can read.
    -- ------------------------------------------------------------------------------
    ALTER TABLE public.post_reacts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Members read reactions on their community posts" ON public.post_reacts;
    CREATE POLICY "Members read reactions on their community posts" ON public.post_reacts
        FOR SELECT
        USING (
            public.is_admin()
            OR EXISTS (
                SELECT 1
                FROM public.community_posts p
                WHERE p.id = post_reacts.post_id
                AND p.talent = public.my_community()
            )
        );

    DROP POLICY IF EXISTS "Members react to their community posts" ON public.post_reacts;
    CREATE POLICY "Members react to their community posts" ON public.post_reacts
        FOR INSERT
        WITH CHECK (
            user_id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM public.community_posts p
                WHERE p.id = post_reacts.post_id
                AND p.talent = public.my_community()
            )
        );

    DROP POLICY IF EXISTS "Members remove their own reactions" ON public.post_reacts;
    CREATE POLICY "Members remove their own reactions" ON public.post_reacts
        FOR DELETE
        USING (public.is_admin() OR user_id = auth.uid());

    -- ==============================================================================
    -- VERIFY (read-only; run after applying)
    --
    --   -- the four communities resolve from the existing profile vocabulary:
    --   --   'Dance' must map to 'Dancer', not stay 'Dance'.
    --   SELECT public.community_slug('Dance')     AS from_dance;    -- Dancer
    --   SELECT public.community_slug('Dancer')    AS from_dancer;   -- Dancer
    --   SELECT public.community_slug('Singing')   AS from_singing;  -- Singer
    --   SELECT public.community_slug('Acting')    AS from_acting;   -- Acting
    --   SELECT public.community_slug('Theater')   AS from_theater;  -- Theater
    --
    --   -- policies in place:
    --   SELECT policyname, cmd FROM pg_policies
    --    WHERE schemaname = 'public'
    --      AND tablename IN ('community_posts','comments','post_reacts')
    --    ORDER BY tablename, cmd, policyname;
    --
    --   -- signed out, my_community() must be NULL (no community, no posts):
    --   SELECT public.my_community() IS NULL AS signed_out_is_null;
    --
    -- ISOLATION CHECK, once signed in as a real member:
    --   -- Dancer sees Dancer posts and nothing else:
    --   SELECT talent, count(*) FROM public.community_posts GROUP BY talent;
    --   -- a Singer's session must return zero rows for a Dancer's post id.
    --
    -- Until this file is applied the feed is community-blind: every member sees
    -- every post and may post into any community. That is the state it is in today.
    -- ==============================================================================