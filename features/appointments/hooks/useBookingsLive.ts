'use client';

/**
 * Keep an open appointments screen in step with the database.
 *
 * WHY BOTH REALTIME AND POLLING
 *   Migration 02 adds `appointments` and `agreements` to the `supabase_realtime`
 *   publication, so a status change or a signature should arrive over the
 *   websocket. But realtime is explicitly described in that migration as a
 *   convenience, not a correctness requirement — a dropped socket, a paused tab
 *   or a project without the publication must not leave a stale page. Polling
 *   every 60s is the fallback, and it only runs while the tab is visible.
 *
 * CONNECTION STATE, SAID TRUTHFULLY
 *   mode is 'live' only while the channel is actually SUBSCRIBED. After an
 *   error the badge shows 'reconnecting' (the poll keeps the page fresh); once
 *   two consecutive drops have happened without a subscribe in between, it
 *   reports 'offline'. The attempt counter resets on SUBSCRIBED.
 *
 * WHAT CHANGED
 *   `changes` is a monotonically increasing counter bumped on every realtime
 *   event (debounced with the refresh), for UIs that want to flash a changed
 *   card. It is NOT derived from React state — it is a snapshot number bump.
 *
 * The callback is held in a ref so an inline `onRefresh` from the page does not
 * tear the channel down on every render.
 */
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type LiveSyncMode = 'connecting' | 'live' | 'reconnecting' | 'offline';

export function useBookingsLive(args: {
  enabled: boolean;
  viewerId: string | null;
  role: 'client' | 'coach';
  /** Called after a realtime change (debounced) and on each visible poll. */
  onRefresh: () => void;
}): { mode: LiveSyncMode; changes: number } {
  const { enabled, viewerId, role, onRefresh } = args;
  const [mode, setMode] = useState<LiveSyncMode>('connecting');
  const [changes, setChanges] = useState(0);

  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || !viewerId) return;

    const supabase = createClient();
    const column = role === 'client' ? 'client_id' : 'coach_id';
    let debounce: number | undefined;
    let cancelled = false;
    let failures = 0;

    const schedule = () => {
      if (cancelled) return;
      if (debounce) window.clearTimeout(debounce);
      // One reload per burst: a status move writes the appointment AND its
      // audit row, and a signature writes the agreement AND the appointment.
      debounce = window.setTimeout(() => {
        refreshRef.current();
        setChanges((c) => c + 1);
      }, 650);
    };

    const channel = supabase
      .channel(`booking-live:${role}:${viewerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `${column}=eq.${viewerId}`,
        },
        schedule
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agreements',
          filter: `${column}=eq.${viewerId}`,
        },
        schedule
      )
      .subscribe((status: any) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          failures = 0;
          setMode('live');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          failures += 1;
          setMode(failures >= 2 ? 'offline' : 'reconnecting');
        }
      });

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshRef.current();
    }, 60_000);

    return () => {
      cancelled = true;
      if (debounce) window.clearTimeout(debounce);
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [enabled, viewerId, role]);

  return { mode, changes };
}

export default useBookingsLive;
