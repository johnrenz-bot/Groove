'use client';

import { useEffect, useState } from 'react';
import { PresenceRealtime } from '../hooks/usePresence';
import { createClient } from '@/lib/supabase/client';

/**
 * Starts the app-wide presence subscription, once, from the root layout.
 *
 * WHY IT LIVES HERE AND NOT IN A PAGE
 *   Presence has to be live on every route — the header, /messages, a coach card,
 *   a profile — and those surfaces are rendered by three different shells
 *   (DashboardLayout, the public AppHeader, and the standalone pages). Mounting
 *   the subscription in any one of them would leave it dead on the others. The
 *   root layout is the only ancestor of all of them.
 *
 * WHY IT RESOLVES THE SESSION ITSELF
 *   The root layout is a server component and cannot await the session. This
 *   bridge asks Supabase for the signed-in id on the client and passes it down,
 *   so the subscription is keyed to a real user and is torn down on sign-out.
 *   `null` is passed until the id is known, which PresenceRealtime treats as
 *   "no channel" rather than subscribing anonymously.
 *
 * Renders nothing.
 */
export function PresenceBridge() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.user?.id ?? null);
    });

    // A sign-out elsewhere in the app must stop the channel, or the previous
    // user's presence would keep streaming to whoever signs in next.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <PresenceRealtime userId={userId} />;
}

export default PresenceBridge;