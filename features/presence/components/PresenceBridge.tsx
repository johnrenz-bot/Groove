'use client';

import { PresenceRealtime } from '../hooks/usePresence';
import { useSession } from '@/components/header/SessionProvider';

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
 * WHY IT READS THE SESSION CONTEXT
 *   The root layout is a server component and cannot await the session — but
 *   <SessionProvider> is already mounted above this bridge and already owns the
 *   one authoritative answer to "who is this?". Reading it here keeps presence
 *   in step with every sign-in/sign-out event (it is driven by the provider's
 *   own onAuthStateChange) at zero extra network cost, where previously this
 *   bridge fired its own getUser() plus its own auth subscription on every
 *   cold load. `null` is passed until the id is known, which
 *   PresenceRealtime treats as "no channel" rather than subscribing anonymously.
 *
 * Renders nothing.
 */
export function PresenceBridge() {
  const { status, profile } = useSession();
  const userId = status === 'authenticated' ? profile?.id ?? null : null;

  return <PresenceRealtime userId={userId} />;
}

export default PresenceBridge;
