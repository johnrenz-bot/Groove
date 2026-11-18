/**
 * Which routes music is allowed to play on.
 *
 * HISTORY
 *   The Groove Rehearsal Mix originally played only on the Community Showcase
 *   routes; leaving those pages stopped and released the YouTube resource,
 *   because a player following the member everywhere felt like a surprise.
 *
 *   The product direction changed: the docked player now lives in the
 *   dashboard shell and follows the member everywhere — discovery, messaging,
 *   booking, admin — the same way desktop Spotify does. Autoplay stays
 *   scoped to the showcase routes (only those pages mount the autoplay
 *   effect), so no route starts audio uninvited.
 *
 * THE RULE
 *   Music is allowed to play on every route. This predicate gates the global
 *   player resource (the YouTube embed): outside the gate, playTrack is a
 *   no-op and off-route playback is paused and released. Because the rule is
 *   now "everywhere", this always returns true — it exists so call sites
 *   keep a single, testable predicate instead of inline pathname checks.
 */
export const MUSIC_ALLOWED_ROUTES: readonly string[] = ['*'] as const;

/**
 * True when the current route is allowed to play music.
 */
export function isMusicRoute(_pathname: string | null | undefined): boolean {
  void _pathname;
  return true;
}
