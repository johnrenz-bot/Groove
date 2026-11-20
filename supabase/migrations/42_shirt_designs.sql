-- ==============================================================================
-- 42_shirt_designs.sql
-- Saved T-shirt customizer designs.
--
-- The design document is stored as JSONB so the customizer can evolve its
-- schema without a column per option. Imported artwork is embedded as data
-- URLs inside that JSON, which keeps exports and share links self-contained.
--
-- Privacy model:
--   * owners can read/write their own rows through RLS;
--   * the table is NOT readable by anon;
--   * a single SECURITY DEFINER function returns one design for an unguessable
--     share id, and only while `is_public` is true.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.shirt_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled tee',
  design JSONB NOT NULL CHECK (jsonb_typeof(design) = 'object'),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  share_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shirt_designs_user_updated_idx
  ON public.shirt_designs (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS shirt_designs_share_idx
  ON public.shirt_designs (share_id)
  WHERE is_public = TRUE;

-- Keep updated_at authoritative even if a client forgets to send it.
CREATE OR REPLACE FUNCTION public.touch_shirt_designs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shirt_designs_touch_updated_at ON public.shirt_designs;
CREATE TRIGGER shirt_designs_touch_updated_at
  BEFORE UPDATE ON public.shirt_designs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_shirt_designs_updated_at();

ALTER TABLE public.shirt_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shirt_designs owner select" ON public.shirt_designs;
CREATE POLICY "shirt_designs owner select"
  ON public.shirt_designs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shirt_designs owner insert" ON public.shirt_designs;
CREATE POLICY "shirt_designs owner insert"
  ON public.shirt_designs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shirt_designs owner update" ON public.shirt_designs;
CREATE POLICY "shirt_designs owner update"
  ON public.shirt_designs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shirt_designs owner delete" ON public.shirt_designs;
CREATE POLICY "shirt_designs owner delete"
  ON public.shirt_designs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- The share page calls this with a UUID from the URL. It never exposes the
-- owner, title, timestamps or the rest of the table.
CREATE OR REPLACE FUNCTION public.get_shared_shirt_design(p_share_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT design - 'userId' AS design
  FROM public.shirt_designs
  WHERE share_id = p_share_id
    AND is_public = TRUE
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_shirt_design(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_shirt_design(UUID) TO anon, authenticated;

-- Explicit grants: the table is owner-only, so anon gets nothing directly.
REVOKE ALL ON public.shirt_designs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shirt_designs TO authenticated;

COMMENT ON TABLE public.shirt_designs IS
  'Saved Groove PH tee customizer designs. One JSONB document per design; imported images are embedded data URLs.';
COMMENT ON FUNCTION public.get_shared_shirt_design(UUID) IS
  'Returns one public shirt design by unguessable share id for the read-only share page.';
