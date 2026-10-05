-- ═══════════════════════════════════════════════════════════════════════════
-- 09 — Profile follows
--
-- Run ONCE in the Supabase SQL Editor. You run this manually. Idempotent:
-- re-running is safe. `CREATE POLICY` has no IF NOT EXISTS in Postgres, so each
-- policy is preceded by DROP POLICY IF EXISTS.
--
-- WHY A NEW TABLE
-- Inspected the full schema (supabase/schema.sql + every file in
-- supabase/migrations/). There is NO existing follow, follower, following,
-- connections or user_follows table, and no follower/following counter columns
-- on public.profiles. So the relationship genuinely does not exist yet and one
-- table is required.
--
-- WHAT THIS ADDS — exactly one table, one index, three policies. Nothing else.
-- WHAT THIS DOES NOT TOUCH
--   - public.profiles is NOT altered. No column, no constraint, no policy.
--     Follower identities live ONLY in this table, never in profiles.
--   - No existing table, policy, trigger or function is modified or dropped.
--   - No enum is changed.
--   - RLS is not weakened: it is enabled here, and the policies below are
--     strictly narrower than a permissive default.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── The relationship ───────────────────────────────────────────────────────
-- A directed edge: follower_id follows following_id.
CREATE TABLE IF NOT EXISTS public.profile_follows (
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One edge per ordered pair. This is what makes a follow idempotent
  -- (ON CONFLICT DO NOTHING) rather than accumulating duplicate rows.
  CONSTRAINT profile_follows_pkey PRIMARY KEY (follower_id, following_id),

  -- Self-follow protection. Enforced in the database, not just the UI, so it
  -- cannot be bypassed by calling PostgREST directly.
  CONSTRAINT profile_follows_no_self_follow CHECK (follower_id <> following_id)
);

-- Counts are always "how many follow THIS user", which filters on
-- following_id. Without this index that count is a sequential scan.
CREATE INDEX IF NOT EXISTS profile_follows_following_idx
  ON public.profile_follows (following_id);

-- The reverse direction ("who does this user follow") filters on follower_id,
-- which the composite PK already covers as its leading column. No extra index.

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

-- Read: the graph is visible inside the app.
-- This matches the existing posture on public.profiles, whose SELECT policy is
-- USING (true). It exposes only *which* ids follow which — no personal data.
DROP POLICY IF EXISTS "Profile follows are readable" ON public.profile_follows;
CREATE POLICY "Profile follows are readable"
  ON public.profile_follows
  FOR SELECT
  USING (true);

-- Insert: you may only create an edge that YOU are the follower of. The
-- CHECK constraint separately blocks self-follow.
DROP POLICY IF EXISTS "Users can follow" ON public.profile_follows;
CREATE POLICY "Users can follow"
  ON public.profile_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Delete: you may only remove an edge that YOU created. A user therefore can
-- never unfollow somebody else.
DROP POLICY IF EXISTS "Users can unfollow" ON public.profile_follows;
CREATE POLICY "Users can unfollow"
  ON public.profile_follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- There is deliberately NO UPDATE policy. A follow edge is immutable; changing
-- one means deleting it and creating a new one. Without an UPDATE policy the
-- operation is denied outright rather than relying on every future column being
-- covered by a WITH CHECK clause.

-- ── Counts ─────────────────────────────────────────────────────────────────
-- Derived from this table at read time via PostgREST `count: 'exact'`. No
-- denormalized follower_count column on profiles and no counter triggers, so
-- there is no cached value that can drift out of sync with the edges.

-- ── Verify after applying ──────────────────────────────────────────────────
-- Expect 3 rows for the three policies above.
--   SELECT policyname, cmd FROM pg_policies
--    WHERE tablename = 'profile_follows' ORDER BY policyname;
-- Expect 0 rows (the table is new and starts empty).
--   SELECT count(*) FROM public.profile_follows;
