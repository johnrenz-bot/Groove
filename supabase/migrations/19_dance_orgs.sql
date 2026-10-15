-- Migration 19: Dance Organizations
-- Stores the official dance organizations shown in the community logo carousel
-- (see features/dance/services/danceOrgsService.ts -> getDanceOrgs).
-- The carousel reads every org from this table, so new entries can be added
-- via the weekly sync script (FEAT-003) without changing the component.

CREATE TABLE IF NOT EXISTS dance_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website_url TEXT NOT NULL,
  logo_url TEXT,
  logo_source_url TEXT,
  logo_verified BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security: public read access only.
ALTER TABLE dance_orgs ENABLE ROW LEVEL SECURITY;

-- NOTE: No INSERT/UPDATE/DELETE policies are defined. The Postgres service
-- role bypasses RLS entirely, so only server-side operations that use the
-- service role key (the weekly logos:sync script, FEAT-003) may write rows.
-- Public anon-key reads are served by the SELECT policy below.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dance_orgs' AND policyname = 'Public read dance_orgs'
  ) THEN
    CREATE POLICY "Public read dance_orgs" ON dance_orgs FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dance_orgs_slug_idx ON dance_orgs (slug);
CREATE INDEX IF NOT EXISTS dance_orgs_sort_order_idx ON dance_orgs (sort_order);
