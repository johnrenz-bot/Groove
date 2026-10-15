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

/** The three navigation roles. Mirrors `NavRole` without importing it. */
export type AccountRole = 'coach' | 'client' | 'guest';

/**
 * Does this role's account trigger show the name and role line beside the avatar?
 *
 *   coach  -> YES. They are running a business from this bar and may hold
 *            several accounts; the name says which one is signed in.
 *   client -> NO. The trigger is the avatar, its presence dot and the caret.
 *            The panel opens on the same click and still leads with the full
 *            name, email, role badge and greeting, so nothing is lost.
 *   guest  -> the pill does not render at all; `UserMenu` returns null before
 *            this is consulted. Answering `false` keeps the caller total.
 */
export function showsIdentityPill(role: AccountRole): boolean {
  return role === 'coach';
}

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