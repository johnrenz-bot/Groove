/**
 * Account-cluster rules — pure, import-free, loadable from plain Node.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY NOT INSIDE `UserMenu.tsx`
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `scripts/verify-header-contract.ts` asserts these rules, and it runs under
 * `node --experimental-strip-types`, which cannot resolve a `.tsx` module and
 * cannot resolve the `@/` alias. A helper buried in the component is therefore
 * untestable without a browser, a database and a live session — and these are
 * exactly the rules a guest cannot see, because a guest never gets an account
 * pill at all.
 *
 * This is the same constraint that put the Dance vocabularies in
 * `lib/dance/constants.ts`, and the same fix: the shared, import-free decision
 * lives here, and `UserMenu.tsx` imports it.
 *
 * `UserMenu` re-exports both names, so `MobileDrawer` and any other existing
 * consumer keep importing them from where they always have.
 */

/**
 * The roles this module knows about.
 *
 * Mirrors `NavRole` without importing it — see the header of this file for why.
 */
export type AccountRole = 'coach' | 'client' | 'admin' | 'guest';

/**
 * Time-of-day greeting.
 *
 * A coach is addressed as "Coach {name}" because that is the role they are
 * performing in this session; a client is greeted as a returning visitor,
 * because for them this is a place they visit rather than a job they log into.
 *
 * Rendered from a ticking hour rather than read once, so a session left open
 * across lunchtime updates itself instead of saying "Good evening" at 11am.
 */
export function greetingFor(
  role: AccountRole,
  firstname: string,
  hour: number
): string {
  if (role === 'coach') {
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, Coach ${firstname}`;
  }
  return `Welcome back, ${firstname}`;
}