-- Migration 20: image provenance and documented fallbacks for dance_updates
--
-- Adds the two columns that let a card say where its picture came from, and why
-- it does not have one. Both are nullable so the migration is safe against a
-- live table that already has rows; backfill is deliberately NOT done here
-- because inventing a provenance value for an existing row would be worse than
-- leaving it unknown.
--
-- 1. image_source_url   — the first-party asset a vendored image came from
-- 2. image_fallback_reason — why this row has no image (mutually exclusive
--                         with image_url; see lib/dance/schema.ts superRefine)

ALTER TABLE dance_updates ADD COLUMN IF NOT EXISTS image_source_url TEXT;
ALTER TABLE dance_updates ADD COLUMN IF NOT EXISTS image_fallback_reason TEXT;

-- Rows that were written before this migration can carry a stale reason while
-- still holding an image. Clear it rather than let the card contradict itself.
UPDATE dance_updates
SET image_fallback_reason = NULL
WHERE image_url IS NOT NULL AND image_fallback_reason IS NOT NULL;

-- Images vendored by scripts/sync-dance-update-images.ts are first-party
-- assets that passed HTTPS + content-type + magic-byte + dimension + host
-- provenance checks and were visually confirmed before being committed.
UPDATE dance_updates
SET image_verified = true
WHERE image_url LIKE '/dance-updates/%';

CREATE INDEX IF NOT EXISTS idx_dance_updates_image_source ON dance_updates (image_source_url);