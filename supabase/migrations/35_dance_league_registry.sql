-- Migration 35: Dance league registry
--
-- Promotes the dormant `dance_orgs` table into the staged league registry
-- (scope / disciplines / socials / provenance / moderation status) and tags
-- `dance_updates` with `league_slug` so league filtering can happen in the
-- database instead of by free-text organization matching.
--
-- Runtime note (2026-11-16): the marquee still reads the static registry
-- (features/dance/data/leagues.ts), which is zod-validated on read. This
-- migration and supabase/seed_dance_leagues.sql stage the same data for the
-- DB-backed ingest/admin flow to come online without re-doing DDL.

ALTER TABLE dance_orgs
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'international',
  ADD COLUMN IF NOT EXISTS disciplines TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS socials JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dance_orgs_scope_ck') THEN
    ALTER TABLE dance_orgs ADD CONSTRAINT dance_orgs_scope_ck
      CHECK (scope IN ('international', 'philippines'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dance_orgs_status_ck') THEN
    ALTER TABLE dance_orgs ADD CONSTRAINT dance_orgs_status_ck
      CHECK (status IN ('pending', 'approved', 'needs-info', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dance_orgs_scope_idx ON dance_orgs (scope);
CREATE INDEX IF NOT EXISTS dance_orgs_status_idx ON dance_orgs (status);

-- Link dispatches/events to the league registry without touching existing rows.
ALTER TABLE dance_updates ADD COLUMN IF NOT EXISTS league_slug TEXT;
CREATE INDEX IF NOT EXISTS dance_updates_league_slug_idx
  ON dance_updates (league_slug) WHERE league_slug IS NOT NULL;

-- Two entries that do not belong on a "Leagues & Federations" marquee are
-- hidden from the approved-only public read path. They are kept (not deleted)
-- for auditability; the Philippines DYS row is renamed to its registry slug.
UPDATE dance_orgs SET status = 'needs-info' WHERE slug = 'the-royal-family';
UPDATE dance_orgs SET status = 'needs-info' WHERE slug = 'battle-of-the-year';

-- The pre-existing red-bull-dance-your-style row pointed at the Philippine
-- page. Rename it to the Philippines registry slug so the international DYS
-- registry entry can take the base slug in the seed.
UPDATE dance_orgs
  SET slug = 'red-bull-dance-your-style-philippines'
  WHERE slug = 'red-bull-dance-your-style'
    AND website_url LIKE '%/ph-en/%';
