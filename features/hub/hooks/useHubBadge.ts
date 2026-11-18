'use client';

/**
 * useHubBadge — the "Messages & Bookings" sidebar count.
 *
 * What it counts, from existing data only:
 *   1. Your-turn cases — CLIENT: bookings in `agreement_required`;
 *      COACH: non-terminal bookings where `availableActions` is non-empty
 *      (mirrors the hub inbox's own filter exactly).
 *   2. Unread messages addressed to the viewer — via the `read_at`-aware
 *      head-count query; the column may not exist yet (messenger.sql), so the
 *      count degrades to zero instead of breaking.
 *
 * No new realtime channel — the chrome refreshes this on mount and on route
 * change. The hub also nudges it via the `hub:badge` window event so acting
 * in the hub updates the rail without a page load.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { availableActions } from '@/features/appointments/services/bookingStatus';
import { useSession } from '@/components/header/SessionProvider';
import type { HubRole } from '../types';

export function useHubBadge(role: HubRole | null): number {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  // The dashboard chrome re-renders on every route change; resolving the user
  // from the shared session context avoids an extra auth round trip per
  // navigation (the provider already owns that lookup).
  const { status, profile } = useSession();
  const userId = status === 'authenticated' ? profile?.id ?? null : null;

  useEffect(() => {
    if (!role || !userId) return;
    let cancelled = false;

    const compute = async (): Promise<number> => {
      try {
        const supabase = createClient();

        const col = role === 'client' ? 'client_id' : 'coach_id';
        const { data: appts, error: apptsError } = await supabase
          .from('appointments')
          .select('status')
          .eq(col, userId)
          .in('status', ['pending', 'accepted', 'agreement_required', 'confirmed', 'in_progress']);
        if (apptsError) return 0;
        let turn = 0;
        for (const row of (appts ?? []) as { status: string | null }[]) {
          if (role === 'client') {
            if (row.status === 'agreement_required') turn += 1;
          } else {
            if (availableActions({ status: row.status, role: 'coach', coachVerified: true }).length > 0) {
              turn += 1;
            }
          }
        }

        let unread = 0;
        const withRead = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', userId)
          .is('read_at', null);
        if (!withRead.error) unread = withRead.count ?? 0;

        return turn + unread;
      } catch {
        return 0;
      }
    };

    void compute().then((n) => {
      if (!cancelled) setCount(n);
    });

    // The hub nudges fresh counts after every snapshot refresh.
    const onNudge = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (typeof detail === 'number' && !cancelled) setCount(detail);
    };
    window.addEventListener('hub:badge', onNudge as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('hub:badge', onNudge as EventListener);
    };
  }, [role, pathname, userId]);

  return count;
}
