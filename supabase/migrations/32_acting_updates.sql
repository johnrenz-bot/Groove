-- Migration 32: Acting Updates
CREATE TABLE IF NOT EXISTS acting_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  summary_tl TEXT,
  category TEXT NOT NULL CHECK (category IN ('competition', 'event', 'workshop', 'results', 'general')),
  organization TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('philippines', 'international', 'metro-manila', 'asia')),
  location TEXT,
  event_date TIMESTAMPTZ,
  source_url TEXT NOT NULL,
  image_url TEXT,
  image_credit TEXT,
  image_verified BOOLEAN NOT NULL DEFAULT false,
  image_source_url TEXT,
  image_alt TEXT,
  image_fallback_reason TEXT,
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review', 'archived', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acting_updates_source_url_key') THEN
    ALTER TABLE acting_updates ADD CONSTRAINT acting_updates_source_url_key UNIQUE (source_url);
  END IF;
END $$;

ALTER TABLE acting_updates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acting_updates' AND policyname='Public read published acting updates') THEN
    CREATE POLICY "Public read published acting updates" ON acting_updates FOR SELECT USING (status = 'published');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_acting_updates_published_at ON acting_updates (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_acting_updates_status ON acting_updates (status);
