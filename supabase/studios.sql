-- ==============================================================================
-- GrooveSystem: Rehearsal studios (Studio Locator)
--
-- Apply AFTER schema.sql. Safe to re-run: every object is dropped or guarded.
--
-- WHAT THIS IS FOR
--
--   The Studio Locator on the Coach and Client dashboards previously rendered a
--   hardcoded Google Maps *embed* iframe — a static, server-rendered tile image
--   of a pre-baked search for "dance studio". That has no API surface: it
--   cannot draw a radius circle, cannot hold markers, and cannot be filtered by
--   distance. Replacing it with Leaflet + OpenStreetMap required studio records
--   with real coordinates, and none existed.
--
--   This table is that source of truth. The locator reads it through the normal
--   browser client, exactly like every other table in the app.
--
--   NO ROWS ARE INSERTED HERE, ON PURPOSE.
--
--   Every studio in this table will be rendered to users as a bookable location.
--   Inventing plausible-looking names and coordinates would put fictional
--   addresses on a map for coaches and clients to plan trips to. The table is
--   created empty and stays empty until you enter real studios — see the
--   "ADDING REAL DATA" section at the bottom of this file.
--
-- WHY THESE COLUMNS
--
--   id            UUID PK. Same convention as every other table: references
--                 auth.users, so a studio can later be owned by a coach.
--   name          What the locator shows in the marker popup and list.
--   address       Human-readable street address. Nullable, because a coordinate
--                 is what the map needs; the address is for the person reading.
--   latitude      WGS84 decimal degrees. Constrained to the real range so a
--                 sign error cannot silently place a studio in the sea.
--   longitude     WGS84 decimal degrees, same constraint.
--   region_code   PSGC region code, matching the existing profiles.region_code
--                 convention so studios and members share one geography.
--   city_code     PSGC city/municipality code, same convention.
--
--   The lat/lng pair is additionally constrained to be non-null together, so a
--   row can never be half-located and appear on the map at (0, 0).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    address TEXT,

    latitude DOUBLE PRECISION NOT NULL
        CONSTRAINT studios_latitude_range CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL
        CONSTRAINT studios_longitude_range CHECK (longitude BETWEEN -180 AND 180),

    -- PSGC codes, same convention as public.profiles. Nullable: a studio may be
    -- entered before it has been matched to a region.
    region_code VARCHAR(20),
    city_code VARCHAR(20),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.studios IS
    'Rehearsal studios shown by the Studio Locator. Rows are entered by an administrator; the table ships empty.';

-- ------------------------------------------------------------------------------
-- 2. Keep updated_at honest
--
-- Mirrors the convention used elsewhere in this schema: the client writes
-- updated_at explicitly, and this trigger is the backstop for anything that
-- does not (a SQL insert, a psql session, a future admin API).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS studios_touch_updated_at ON public.studios;
CREATE TRIGGER studios_touch_updated_at
    BEFORE UPDATE ON public.studios
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Case-insensitive uniqueness
--
-- Two rows differing only by capitalisation would render as two identical
-- markers and double-count the "N studios nearby" figure. PostgreSQL's default
-- uniqueness is case-SENSITIVE, so it would not catch that.
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS studios_name_lower_key
    ON public.studios (lower(name));

-- ------------------------------------------------------------------------------
-- 4. Row Level Security
--
-- The locator is a public, read-only surface: an unauthenticated visitor on the
-- marketing site can browse studios just as they can read profiles. So:
--
--   SELECT  open to everyone, same as "Public can view profiles".
--   INSERT  admins only.
--   UPDATE  admins only.
--   DELETE  admins only.
--
-- There is deliberately no client-writable policy. Studios are shared reference
-- data, not user-generated content, so a member must never be able to invent or
-- move a studio marker.
-- ------------------------------------------------------------------------------
    ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can view studios" ON public.studios;
    CREATE POLICY "Public can view studios" ON public.studios
        FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admins can insert studios" ON public.studios;
    CREATE POLICY "Admins can insert studios" ON public.studios
        FOR INSERT WITH CHECK (public.is_admin());

    DROP POLICY IF EXISTS "Admins can update studios" ON public.studios;
    CREATE POLICY "Admins can update studios" ON public.studios
        FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

    DROP POLICY IF EXISTS "Admins can delete studios" ON public.studios;
    CREATE POLICY "Admins can delete studios" ON public.studios
        FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- VERIFY (read-only; run after applying)
--
--   -- table exists, RLS on, and no rows:
--   select count(*) as studios from public.studios;
--   -- expect 0 until you enter real data.
--
--   -- policies:
--   select policyname, cmd, roles from pg_policies
--   where schemaname = 'public' and tablename = 'studios' order by cmd, policyname;
--
--   -- must be `public` for SELECT or the locator will get a 42501:
--   select has_table_privilege('anon', 'public.studios', 'SELECT') as anon_can_read;
--
-- ==============================================================================
-- ADDING REAL STUDIO DATA
-- ==============================================================================
--
-- The table is empty until you do this. Three ways, best first.
--
-- -- 1. From the Supabase dashboard (no SQL, safest):
--       Table editor -> studios -> Insert rows. For each studio fill name,
--       address, latitude, longitude. Leave region_code / city_code blank if you
--       have not matched them to a PSGC code yet.
--
-- -- 2. From psql / the SQL editor, one at a time:
--
--       INSERT INTO public.studios (name, address, latitude, longitude)
--       VALUES ('<real studio name>', '<street address>', 14.7607, 120.9941);
--
--       Get exact coordinates by right-clicking the point in any map and copying
--       the latitude/longitude pair. Do not guess them.
--
-- -- 3. A bulk import from a spreadsheet you have already verified.
--       Put the file at supabase/studios_import.csv with the header row
--       `name,address,latitude,longitude,region_code,city_code`, then:
--
--       \copy public.studios (name, address, latitude, longitude, region_code, city_code) FROM 'supabase/studios_import.csv' WITH (FORMAT csv, HEADER true)
--
-- CHECKING WHAT WENT IN
--
--   SELECT name, address, latitude, longitude FROM public.studios ORDER BY name;
--
--   -- Sanity-check the coordinates are in the right country. San Jose del Monte
--   -- is roughly 14.7 N, 121.0 E; anything outside +/-2 degrees is a typo.
--   SELECT name FROM public.studios
--   WHERE latitude NOT BETWEEN 14.0 AND 15.5 OR longitude NOT BETWEEN 120.5 AND 121.5;
--
-- Until at least one row exists, the Studio Locator shows its empty state by
-- design — that is the component working correctly, not a bug.