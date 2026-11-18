/**
 * Admin + test-account exclusion, in one place.
 *
 * BUSINESS RULE (do not weaken): admin accounts never appear in any
 * client- or coach-facing surface of the hub — inbox lists, recommended
 * contacts, board cards, unread widgets, people pickers. Support contact is
 * available only at /support, which this module does not touch.
 *
 * The filter is applied in two places on purpose:
 *   1. In the query (where the partner list is assembled), so we never ship
 *      admin rows to the client at all.
 *   2. Again defensively at render time, in case a future caller forgets.
 *
 * Test/demo accounts (test|demo|fake|sample|mock|dummy name patterns) are
 * likewise excluded everywhere in member-facing lists. Admins are matched by
 * role, not by name — renaming a demo admin does not launder it into the inbox.
 */
import type { Profile } from '@/lib/types';

/** The only acceptable predicate for "not admin, not test/demo". */
export function isMemberFacingPartner(p: { role?: string | null } | null | undefined): boolean {
  if (!p) return false;
  return (p.role ?? '') !== 'admin' && (p.role ?? '') !== 'staff';
}

const TEST_NAME = /^(test|demo|fake|sample|mock|dummy)/i;

/** Test/demo accounts are excluded everywhere in member-facing lists. */
export function isTestNamed(p: {
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string | null;
}): boolean {
  const fields = [p.firstname, p.lastname, p.username, p.email];
  return fields.some((f) => typeof f === 'string' && TEST_NAME.test(f.trim()));
}

/** Exclude admins + test/demo names from a list of partners. */
export function memberFacingPartners<T extends { role?: string | null; firstname?: string | null; lastname?: string | null; username?: string | null } | null | undefined>(partners: readonly T[]): NonNullable<T>[] {
  return partners.filter((p): p is NonNullable<T> => {
    if (!p) return false;
    return isMemberFacingPartner(p) && !isTestNamed(p);
  });
}

/** True when this partner is the one married to an admin — render nothing. */
export function isAdminPartner(p: Profile | null | undefined): boolean {
  return (p?.role ?? '') === 'admin';
}

/** True when this partner looks like a synthetic/demo row to the eye. */
export function isTestPartner(p: Profile | null | undefined): boolean {
  if (!p) return false;
  return /^(test|demo|fake|sample|mock|dummy)/i.test(`${p.firstname ?? ''}${p.lastname ?? ''}`.trim());
}
