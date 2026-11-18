-- =============================================================================
-- 39 — Realtime publication: add system_settings ONLY
-- =============================================================================
-- Run manually in the Supabase SQL Editor. Idempotent.
--
-- WHAT THIS ADDS
--   public.system_settings to the supabase_realtime publication, so the
--   <PlatformThemeSync /> subscription (which re-applies the admin-chosen
--   theme/accent when they change) actually fires. The component subscribes
--   on mount and already holds a fetched snapshot; this only makes its
--   "live" path work instead of silently never receiving an event.
--
-- WHAT THIS DELIBERATELY DOES NOT ADD
--   public.notifications. The notification bell
--   (components/shared/NotificationDropdown.tsx) subscribes to INSERT events on
--   notifications filtered to the viewer, but a `postgres_changes` channel
--   carries the FULL row to every subscribed socket, and the row filter is
--   applied client-side — it is not a security boundary. Adding notifications
--   to the publication would broadcast every notification (bookings, contract
--   updates, support replies) to any authenticated subscriber who removes the
--   filter. Row Level Security does not protect realtime payloads.
--   The bell therefore stays on its mount-time fetch + manual refreshes, which
--   is the correct posture until Supabase realtime enforces per-row
--   authorization for this table (or a server-side fan-out is built).
--
-- WHAT THIS DOES NOT TOUCH
--   No table is rewritten, no policy is changed, no data is modified.
--   appointments, agreements, booking_events, messages and profiles remain
--   published exactly as before.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'system_settings'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
  END IF;
END
$$;
