-- ==============================================================================
-- GrooveSystem: Realtime presence
--
-- Apply AFTER schema.sql. Safe to re-run.
--
-- WHAT THIS DOES AND WHY IT IS NEEDED
--
--   Presence (profiles.status) is already stored and already writable by the
--   member who owns the row. The only thing missing for live presence is
--   delivery: `postgres_changes` subscriptions in the browser emit NOTHING for a
--   table that is not in a publication. There is no error and no failed request
--   in that case — the socket connects, the SUBSCRIBED message is sent, and no
--   event ever arrives. That is the single most common reason "realtime is
--   broken" when it is actually a missing publication entry.
--
--   So this file adds public.profiles to the existing supabase_realtime
--   publication. It creates no table, no column, and no policy: profiles.status
--   and its user_status enum already exist.
--
-- SCOPE, DELIBERATELY NARROW
--
--   UPDATE only. The frontend subscribes to `{ event: 'UPDATE' }`, and that is
--   what the publication is asked for here. An INSERT is a signup, which no
--   open page is waiting on, and a DELETE needs no presence update — so neither
--   is worth the traffic.
--
--   Note that Supabase honours RLS for postgres_changes by evaluating the
--   subscriber's policies per delivered row, so this widens delivery only to
--   rows that user could already SELECT. profiles already carries
--   "Public can view profiles" FOR SELECT USING (true), so no profile becomes
--   newly readable to anyone by being added here.
-- ==============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end
$$;

-- ------------------------------------------------------------------------------
-- VERIFY (read-only; run after applying)
--
--   select pubname, schemaname, tablename
--   from pg_publication_tables
--   where pubname = 'supabase_realtime'
--   order by tablename;
--   -- expect: messages, profiles
--
-- If `profiles` is absent, presence will not update live in the UI even though
-- the database write itself succeeds. That is the check to run first.