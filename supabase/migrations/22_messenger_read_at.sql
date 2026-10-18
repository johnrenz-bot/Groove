-- Migration 22: Messenger read receipts
--
-- Promotes the content of supabase/messenger.sql into the numbered migration
-- sequence. The app code (lib/messenger/queries.ts) already degrades gracefully
-- if this column is absent -- it retries the query without read_at and caches
-- the result so no further 400s occur that session -- but running this migration
-- eliminates the initial 400 on every fresh tab/session load.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS and CREATE INDEX IF NOT EXISTS are
-- both idempotent; DROP POLICY IF EXISTS before CREATE POLICY is the standard
-- Supabase pattern for idempotent policies.

-- -----------------------------------------------------------------------------
-- 1. Read receipts column
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

COMMENT ON COLUMN public.messages.read_at IS
  'When the recipient marked this message as read. NULL = unread. Only ever set by the receiver_id user, enforced by the receiver_mark_messages_read policy below.';

-- Index the unread lookup that the badge runs on every load.
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON public.messages (receiver_id, read_at)
  WHERE read_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Read-receipt write policy (recipients only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.messages;
CREATE POLICY "Recipients can mark messages read"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id AND sender_id <> auth.uid())
  WITH CHECK (auth.uid() = receiver_id AND sender_id <> auth.uid());

-- -----------------------------------------------------------------------------
-- 3. Realtime publication
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;
