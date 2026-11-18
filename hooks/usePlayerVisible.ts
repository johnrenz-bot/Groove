'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PLAYER_ROUTES, type PlayerRouteRule } from '@/config/player-routes';
import { useSession } from '@/components/header/SessionProvider';

/** SSR-safe hash reader (no `window` access during render). */
function readHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash || '';
}

/**
 * True when the current route is allowed to render the mini-player.
 *
 * SSR-safe: starts with `false` on the server and first client render, then
 * re-reads pathname + hash after mount, and subscribes to `hashchange` and
 * `popstate` for back/forward + hash-only navigation. It never lets the
 * server and client disagree.
 *
 * `hash: '#directory'` means the player is visible on Find Coaches but not on
 * Showcase — and vice versa — even though both tabs share a path.
 */
export function usePlayerVisible(): boolean {
  const pathname = usePathname();
  const { role: sessionRole } = useSession();
  const role = (sessionRole === 'client' || sessionRole === 'coach' || sessionRole === 'admin')
    ? sessionRole
    : 'guest';

  const [hash, setHash] = useState<string>('');

  useEffect(() => {
    setHash(readHash());

    const update = () => setHash(readHash());
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  return useMemo(() => {
    if (!pathname) return false;

    const rules: readonly PlayerRouteRule[] = PLAYER_ROUTES;
    return rules.some((rule) => {
      if (rule.role && rule.role !== role) return false;
      // Match the route exactly or as a nested path (…/talent/123).
      const matchesPath = pathname === rule.pathname || pathname.startsWith(`${rule.pathname}/`);
      if (!matchesPath) return false;
      // Hash constraint: when the rule demands one, the current hash must match.
      if (rule.hash && rule.hash !== hash) return false;
      return true;
    });
  }, [pathname, hash, role]);
}
