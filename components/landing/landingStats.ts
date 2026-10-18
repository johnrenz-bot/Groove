/**
 * Landing-page statistics — THE CLIENT-SAFE HALF.
 *
 * This module deliberately imports NOTHING.
 *
 * It used to hold `getLandingStats()` as well, which meant a `'use client'`
 * component (`HeroStats.tsx`) imported a module that built a Supabase client.
 * Two consequences, both of which had to be fixed rather than worked around:
 *
 *   - with the BROWSER client, a SERVER component called it. `createBrowserClient`
 *     reads cookies out of `document.cookie`, which does not exist on the
 *     server, so every count came back `0` and the hero's stats strip silently
 *     rendered nothing.
 *   - with the SERVER client, the `'use client'` import pulled `next/headers`
 *     into the browser bundle and the whole route failed to compile
 *     ("You're importing a module that depends on next/headers … Pages Router").
 *
 * The fix is the split: the query lives in `landingStats.server.ts` and only the
 * shape and the formatting live here, so the client bundle has no Supabase and
 * no `next/headers` in it, and the server component gets the real cookie jar.
 */

export interface LandingStats {
  coaches: number;
  studios: number;
  disciplines: number;
}

/**
 * Helper to format a number for display (add + suffix for rounded counts)
 */
export function formatStatValue(count: number, _label: string): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k`;
  }
  return String(count);
}