-- Migration 18: Dance Updates Image Verification and Credit Columns
-- Adds image_credit and image_verified columns to dance_updates.
-- Purges any unverified stock photos (Unsplash, Pexels, Shutterstock) and ensures safe constraints.

-- 1. Ensure table structure exists with all required fields
CREATE TABLE IF NOT EXISTS dance_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  summary_tl TEXT,
  category TEXT NOT NULL CHECK (category IN ('competition', 'event', 'workshop', 'results', 'general')),
  organization TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('philippines', 'international')),
  location TEXT,
  event_date TIMESTAMPTZ,
  source_url TEXT NOT NULL UNIQUE,
  image_url TEXT,
  image_credit TEXT,
  image_verified BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add columns if dance_updates already existed previously without them
ALTER TABLE dance_updates ADD COLUMN IF NOT EXISTS image_credit TEXT;
ALTER TABLE dance_updates ADD COLUMN IF NOT EXISTS image_verified BOOLEAN NOT NULL DEFAULT false;

-- 3. Data cleanup: purge all stock photo URLs and mark unverified
UPDATE dance_updates
SET
  image_url = NULL,
  image_verified = false,
  image_credit = NULL
WHERE
  image_url ILIKE '%unsplash.com%'
  OR image_url ILIKE '%pexels.com%'
  OR image_url ILIKE '%shutterstock.com%'
  OR image_url ILIKE '%pixabay.com%'
  OR image_url ILIKE '%stock%';

-- 4. Set image_verified = true ONLY for verified local/official assets
UPDATE dance_updates
SET image_verified = true,
    image_credit = COALESCE(image_credit, 'Official Organization Press')
WHERE image_url IS NOT NULL
  AND (
    image_url LIKE '/crews/%'
    OR image_url LIKE '%i.ytimg.com/%'
    OR image_url LIKE '%img.youtube.com/%'
  );

-- 5. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_dance_updates_published_at ON dance_updates (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_dance_updates_status ON dance_updates (status);
CREATE INDEX IF NOT EXISTS idx_dance_updates_image_verified ON dance_updates (image_verified);

-- 6. Row Level Security: Public read access for published updates
ALTER TABLE dance_updates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dance_updates' AND policyname = 'Public read published dance updates'
  ) THEN
    CREATE POLICY "Public read published dance updates" ON dance_updates
      FOR SELECT USING (status = 'published');
  END IF;
END $$;
