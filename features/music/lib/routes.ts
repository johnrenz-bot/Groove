/**
 * Which routes music is allowed to play on.
 *
 * WHY THIS IS ITS OWN MODULE
 *   It is a pure predicate with no React and no JSX, so it can be exercised
 *   directly by `scripts/verify-music-routes.mjs`. Keeping it out of
 *   `MusicPlayerContext.tsx` is what makes the rule testable at all — importing
 *   the context would drag in React and the whole component tree.
 *
 * THE RULE
 *   Community Showcase music plays on exactly two pages. Everywhere else the
 *   player is stopped and its YouTube resource released, because background
 *   audio that follows a member around the rest of the app is a surprise, not a
 *   feature.
 */

/**
 * `/coach/talent` is a one-line re-export of `/coach/talents`, so it is the same
 * page under a second URL. Both must be allowed, otherwise moving between the
 * two coach URLs would cut playback off mid-track.
 */
export const MUSIC_ALLOWED_ROUTES: readonly string[] = [
  '/client/talent',
  '/coach/talents',
  '/coach/talent',
];

/**
 * True when `pathname` is one of the Showcase routes.
 *
 * Matches the route exactly or any path nested beneath it, so a future
 * `/client/talent/123` detail page keeps playing. Anything else — including
 * `null`, which `usePathname()` can return before hydration — is not allowed.
 */
export function isMusicRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MUSIC_ALLOWED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}