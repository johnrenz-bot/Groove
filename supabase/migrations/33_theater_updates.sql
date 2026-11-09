-- Migration 33: Theater Updates
CREATE TABLE IF NOT EXISTS theater_updates (
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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'theater_updates_source_url_key') THEN
    ALTER TABLE theater_updates ADD CONSTRAINT theater_updates_source_url_key UNIQUE (source_url);
  END IF;
END $$;

ALTER TABLE theater_updates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='theater_updates' AND policyname='Public read published theater updates') THEN
    CREATE POLICY "Public read published theater updates" ON theater_updates FOR SELECT USING (status = 'published');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_theater_updates_published_at ON theater_updates (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_theater_updates_status ON theater_updates (status);
