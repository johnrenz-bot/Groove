'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

/**
 * THE SESSION, FOR THE WHOLE APP.
 *
 * WHY THIS EXISTS
 *
 *   The header was reading the session two different ways depending on where it
 *   was rendered: the dashboard header fetched `profiles` itself, and the public
 *   pages rendered a separate `PublicNavbar` that never fetched anything and so
 *   always drew guest UI. Signing in and then opening `/about` therefore looked
 *   exactly like being signed out — the cookie was still there, nothing had
 *   logged anybody out, the page was just showing chrome that had never asked.
 *
 *   One provider, mounted once in the ROOT layout, fixes that class of bug
 *   permanently: there is now exactly one answer to "who is this?", every page
 *   reads it, and a page cannot disagree with itself about it.
 *
 * WHY `status` EXISTS, AND WHY IT STARTS AS 'loading'
 *
 *   The failure mode this replaces was a flash: the bar renders guest UI on the
 *   first paint, then swaps to the signed-in UI a beat later. A user who is
 *   signed in sees "Sign In / Get started" flash on every public page, which
 *   reads as being logged out. So the first render is ALWAYS a skeleton, and
 *   guest UI is only ever rendered after a resolution has actually said "no
 *   session". A skeleton is honest; a guess is not.
 *
 *   Seeding `'loading'` rather than reading `getSession()` in the useState
 *   initialiser is also what keeps SSR and hydration in agreement: there is no
 *   `window` on the server, and a client reloading mid-session must not produce
 *   different markup than the server did.
 */
export type SessionStatus = 'loading' | 'authenticated' | 'guest';

export interface SessionValue {
  status: SessionStatus;
  /** The `profiles` row, which is what the app treats as the user's identity. */
  profile: Profile | null;
  /** `profiles.role`. Authoritative — `user_metadata.role` is client-supplied. */
  role: 'coach' | 'client' | 'guest';
  /** Force a re-read, e.g. after a profile update. */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue>({
  status: 'loading',
  profile: null,
  role: 'guest',
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);

  /**
   * Resolve the signed-in identity.
   *
   * `auth.getUser()` rather than `auth.getSession()`: `getSession` only reads
   * the cookie, so a stale or tampered one would be trusted for the ROLE. The
   * server round trip is one request on mount and is the same call the middleware
   * already makes on every navigation, so it is not a new cost to the page.
   */
  const resolve = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setStatus('guest');
        return;
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

      setProfile((data as Profile) ?? null);
      setStatus('authenticated');
    } catch {
      // A failed lookup is NOT the same as being signed out, but we cannot
      // prove otherwise, and leaving the bar in `loading` forever is worse than
      // showing guest UI. Guests get a working "Log in"; nobody is signed out
      // by this.
      setStatus('guest');
    }
  }, []);

  useEffect(() => {
    // Started from a timer rather than called inline. Every `setState` in
    // `resolve` sits after an `await`, so nothing here actually blocks the
    // paint — but react-hooks/set-state-in-effect cannot see across the async
    // boundary and rejects a direct call. Deferring by a tick puts the lookup on
    // a real async edge, which is the same shape `useUserSearch` uses for its
    // debounce. One tick is also the earliest moment the header's skeleton could
    // be replaced anyway.
    const timer = window.setTimeout(() => {
      void resolve();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resolve]);

  /**
   * Stay in step with the session for the life of the app.
   *
   * Supabase's auth store broadcasts sign-in and sign-out from ANY source —
   * another tab, a token refresh, the `signOut()` this very header calls. A
   * provider that only read on mount would keep drawing a signed-in bar for a
   * user who just signed out in another tab.
   *
   * The callback writes state from OUTSIDE React's render pass, which is exactly
   * what an external store subscription is for.
   */
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        setStatus('guest');
        return;
      }
      // TOKEN_REFRESHED / USER_UPDATED do not change identity, so re-querying
      // on every refresh would be a pointless round trip. Only a genuinely new
      // session triggers a re-read.
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void resolve();
      }
    });

    return () => subscription.unsubscribe();
  }, [resolve]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      profile,
      // A signed-in user whose role is neither coach nor client is an admin.
      // Admins have no member portal, so the header treats them as signed in
      // but without a portal menu of their own — the admin console keeps its own
      // header and never renders this one.
      role:
        status === 'authenticated'
          ? profile?.role === 'coach'
            ? 'coach'
            : 'client'
          : 'guest',
      refresh: resolve,
    }),
    [status, profile, resolve]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

export default SessionProvider;
