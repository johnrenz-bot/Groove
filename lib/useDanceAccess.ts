'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseGenres } from '@/lib/utils';

/**
 * Client-side mirror of the /api/dance-events access rule, used ONLY to decide
 * whether to show the nav entry.
 *
 * THIS IS NOT A SECURITY CONTROL
 * The real boundary is server-side: lib/danceAccess.ts gates the API (which runs
 * before any upstream fetch and returns 401/403) and gates the page. If this
 * hook were wrong or bypassed, a denied user would see a link that leads to a
 * denied page and an empty 403 — not to event data.
 *
 * Its only job is not showing people a door they cannot open.
 *
 * Cached in sessionStorage because the header renders on every navigation: the
 * answer cannot change without a sign-out, and re-querying profiles and the
 * sub-profile table on every route change would be wasteful.
 */

const CACHE_KEY = 'groove-dance-access';
const DANCE = /^dance$/i;

export function useDanceAccess(): { ready: boolean; allowed: boolean } {
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem(CACHE_KEY) : null;
    if (cached === '1') {
      setAllowed(true);
      setReady(true);
      return;
    }
    if (cached === '0') {
      setReady(true);
      return;
    }

    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      let ok = false;
      if (profile?.role === 'admin') {
        ok = true;
      } else if (profile?.role === 'coach') {
        const { data: cp } = await supabase
          .from('coach_profiles')
          .select('talents')
          .eq('id', user.id)
          .maybeSingle();
        ok = parseGenres(cp?.talents).some((t) => DANCE.test(t.trim()));
      } else {
        const { data: cl } = await supabase
          .from('client_profiles')
          .select('talent')
          .eq('id', user.id)
          .maybeSingle();
        ok = DANCE.test((cl?.talent ?? '').trim());
      }

      if (cancelled) return;
      window.sessionStorage.setItem(CACHE_KEY, ok ? '1' : '0');
      setAllowed(ok);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, allowed };
}

export default useDanceAccess;
