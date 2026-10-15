-- Migration 17: Dance Crews, Members, and Results schema
-- Provides typed persistent storage with source_url for dance crew dossiers

CREATE TABLE IF NOT EXISTS crews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  flag TEXT NOT NULL,
  division TEXT NOT NULL,
  founded INTEGER NOT NULL,
  founder TEXT NOT NULL,
  roster_status TEXT NOT NULL DEFAULT 'Verification pending',
  bio TEXT NOT NULL,
  source_url TEXT NOT NULL,
  image_url TEXT,
  image_alt TEXT,
  image_credit TEXT,
  image_source_url TEXT,
  image_license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_results (
  id TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  stage TEXT NOT NULL,
  date TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('WIN', 'CHAMPION', 'FINALIST', 'PODIUM')),
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  score TEXT,
  opponent TEXT,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Public read access
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crews' AND policyname = 'Public read crews'
  ) THEN
    CREATE POLICY "Public read crews" ON crews FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crew_members' AND policyname = 'Public read crew_members'
  ) THEN
    CREATE POLICY "Public read crew_members" ON crew_members FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crew_results' AND policyname = 'Public read crew_results'
  ) THEN
    CREATE POLICY "Public read crew_results" ON crew_results FOR SELECT USING (true);
  END IF;
END $$;
