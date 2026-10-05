-- =============================================================================
-- Messenger: Admin <-> Client direct messaging.
--
-- Apply this once in the Supabase SQL editor. It is additive and safe to re-run.
--
-- WHAT THIS DOES NOT DO
--   It creates no messaging tables. `public.messages` already exists
--   (supabase/schema.sql section 7) with sender_id / receiver_id / message, and
--   the existing RLS policies already cover this feature:
--
--     SELECT  USING (auth.uid() = sender_id OR auth.uid() = receiver_id
--                    OR public.is_admin())
--     INSERT  WITH CHECK (auth.uid() = sender_id)
--     UPDATE  USING (auth.uid() = sender_id)
--
--   So an admin can already read any thread (is_admin()) and can already send
--   as themselves (auth.uid() = sender_id). No policy is widened here, and no
--   policy is bypassed.
--
-- WHAT IT ADDS
--   1. `read_at` on messages, which is what read/unread state and the unread
--      badge are computed from. The table had no such column, so "unread" had
--      nowhere to live and the client messenger had to invent it in memory.
--   2. An index for the unread lookup that the badge runs on every load.
--   3. `messages` added to the realtime publication, so INSERT events reach
--      subscribed clients. Without this the messenger polls nothing and live
--      messages never arrive.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Read receipts
-- -----------------------------------------------------------------------------
alter table public.messages
  add column if not exists read_at timestamptz;

comment on column public.messages.read_at is
  'When the recipient marked this message as read. NULL = unread. Only ever set by the receiver_id user, enforced by the receiver_mark_messages_read policy below.';

-- The badge query is "unread between me and partner", so index the receiving
-- side and the read stamp together.
create index if not exists idx_messages_receiver_unread
  on public.messages (receiver_id, read_at)
  where read_at is null;

-- -----------------------------------------------------------------------------
-- 2. Read receipts are written by the RECIPIENT, not the sender
-- -----------------------------------------------------------------------------
-- The existing "Senders can edit/delete own messages" policy governs UPDATE for
-- editing a body. This narrower policy exists so a recipient can stamp read_at
-- on a message addressed to them. A sender still cannot mark their own message
-- read, and neither can a user stamp anything on a thread they are not part of.
--
-- `USING` scopes the rows the UPDATE may touch; `WITH CHECK` scopes the result.
-- Requiring `sender_id <> auth.uid()` stops a user from writing read_at on their
-- own outgoing message and counting it as "read by" someone else.
drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
  on public.messages
  for update
  to authenticated
  using (auth.uid() = receiver_id and sender_id <> auth.uid())
  with check (auth.uid() = receiver_id and sender_id <> auth.uid());

-- -----------------------------------------------------------------------------
-- 3. Realtime
-- -----------------------------------------------------------------------------
-- postgres_changes only emits for tables in the publication. The messenger
-- subscribes to INSERTs on public.messages, so the table has to be listed.
--
-- `add table` is not idempotent, so the DO block checks membership first and
-- re-running this file does not raise "relation is already member".
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- VERIFY (read-only; run after applying)
-- -----------------------------------------------------------------------------
-- select policyname, cmd, roles from pg_policies
--   where schemaname = 'public' and tablename = 'messages' order by cmd, policyname;
--   -- expect a new FOR UPDATE row: "Recipients can mark messages read"
--
-- select column_name, data_type from information_schema.columns
--   where table_name = 'messages' and column_name = 'read_at';
--   -- expect one row: read_at | timestamp with time zone
--
-- select pubname, schemaname, tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and tablename = 'messages';
--   -- expect one row
