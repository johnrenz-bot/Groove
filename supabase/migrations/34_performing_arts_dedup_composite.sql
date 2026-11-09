-- Migration 34: Composite deduplication for performing arts updates
-- Distinct events/announcements may share an official source URL (e.g. an
-- organization's events page). Dedup must key on (source_url, title), not
-- source_url alone, otherwise distinct listings collapse on upsert.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dance_updates','singing_updates','acting_updates','theater_updates'] LOOP
    -- Drop single-column unique constraint if present
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_source_url_key') THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', t, t || '_source_url_key');
    END IF;
    -- Drop any unique index on source_url alone
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = t || '_source_url_idx') THEN
      EXECUTE format('DROP INDEX IF EXISTS %I', t || '_source_url_idx');
    END IF;
    -- Add composite unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_source_url_title_key') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (source_url, title)', t, t || '_source_url_title_key');
    END IF;
  END LOOP;
END $$;
