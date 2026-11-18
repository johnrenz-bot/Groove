/**
 * The one source of truth for which routes the music player is allowed to
 * appear on. Everything else — visibility, route gating, sidebar behaviour,
 * Groovey FAB positioning — keys off this table.
 *
 * Routes listed here show the GroovePH mini-player (Find Coaches, Showcase).
 * All other routes (home, messages, appointments, calendar, bookings,
 * profile, settings, about, Groovey AI, auth, admin, public) MUST NOT render
 * the player.
 */

/**
 * A match on the `pathname` only, optionally narrowed by hash.
 *
 * `hash: '#directory'` means the player is visible on Find Coaches but not on
 * Showcase — and vice versa — when both tabs live at the same path.
 */
export interface PlayerRouteRule {
  /** Exact pathname match, or a prefix when `prefix: true`. */
  pathname: string;
  /** Restrict to this hash (e.g. '#directory'). When omitted, all hashes match. */
  hash?: string;
  /** Role that should see this rule. Omit for everyone. */
  role?: 'client' | 'coach' | 'admin' | 'guest';
}

/**
 * Allowlist — verified against `components/header/navConfig.ts`:
 *   Client  → "Find Coaches"  → /client/talent  + #directory
 *   Client  → "Showcase"      → /client/talent  + #showcase
 *   Coach   → "Showcase"      → /coach/talents  (same page as /coach/talent)
 *
 * `/coach/talent` is a one-line re-export of `/coach/talents`.
 */
export const PLAYER_ROUTES: readonly PlayerRouteRule[] = [
  { pathname: '/client/talent', hash: '#directory', role: 'client' },
  { pathname: '/client/talent', hash: '#showcase',  role: 'client' },
  { pathname: '/coach/talent',  hash: '#directory', role: 'coach' },
  { pathname: '/coach/talents', role: 'coach' },
] as const;
