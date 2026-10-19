/**
 * Header contract checks.
 *
 * Run: node --experimental-strip-types --no-warnings scripts/verify-header-contract.ts
 *
 * WHY THIS IS A SCRIPT AND NOT A COMPONENT TEST
 *   There is no test runner in this project, and the rules asserted here are the
 *   ones that cannot be checked by looking at the public site: a guest never
 *   sees the account pill at all, so "does the Client trigger still show a name"
 *   is invisible unless someone holds a live session for each role. These rules
 *   are also the ones most likely to drift, because they are one boolean inside
 *   a JSX tree.
 *
 *   So the decision is exported as a function and asserted here, in plain Node,
 *   with no database, no browser and no credentials. What cannot be asserted
 *   without a session — the rendered pixel result — is stated as such in the
 *   report rather than claimed.
 */

import { greetingFor } from '../../lib/header/accountPill.ts';
import {
  NAV,
  leavesForRole,
  sectionsForRole,
  isDropdown,
  hrefFor,
  type NavRole,
} from '../../components/header/navConfig.ts';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── 1. /dance-events is gone from navigation, for every role ────────────────
console.log('-- removed route is unreachable from the nav --');
const allHrefs: string[] = [];
for (const role of ['guest', 'client', 'coach'] as NavRole[]) {
  for (const { leaf } of leavesForRole(role)) allHrefs.push(leaf.href);
  for (const section of sectionsForRole(role)) {
    if (section.href) allHrefs.push(section.href);
  }
}
check('no nav entry points at /dance-events', allHrefs.filter((h) => h.includes('dance-events')), []);
check(
  'navConfig no longer declares the dance gate',
  (NAV as unknown as Array<{ items?: Array<{ danceAccessOnly?: boolean; label?: string }> }>).flatMap((s) =>
    (s.items ?? [])
      .filter((i) => i.danceAccessOnly === true)
      .map((i) => i.label)
  ),
  []
);

// ── 2. Every dropdown section is a dropdown, with items ─────────────────────
console.log('\n-- nav structure --');
for (const role of ['guest', 'client', 'coach'] as NavRole[]) {
  const sections = sectionsForRole(role);
  check(`${role}: no empty dropdowns`, sections.filter((s) => isDropdown(s) && !s.items!.length), []);
  check(`${role}: every item has a role that includes it`, sections.every((s) => s.roles.includes(role)), true);
}

// ── 3. Role-specific navigation is still role-specific ─────────────────────
console.log('\n-- role differences preserved --');
const guestHrefs = leavesForRole('guest').map(({ leaf }) => hrefFor(leaf, 'guest'));
const clientHrefs = leavesForRole('client').map(({ leaf }) => hrefFor(leaf, 'client'));
const coachHrefs = leavesForRole('coach').map(({ leaf }) => hrefFor(leaf, 'coach'));

// FIXED: these three read `leaf.href` — the FALLBACK value — rather than
// `hrefFor(leaf, role)`, which is what the header actually renders. One leaf
// ("Bookings") carries `href: '/client/appointments'` plus
// `hrefByRole: { coach: '/coach/appointments' }`, so the coach assertion below
// was reading the client's fallback and failing against correct config. The
// per-role override is the whole point of the `hrefByRole` field, so the check
// has to resolve it.

check('guests see no Dashboard destinations', guestHrefs.filter((h) => h.startsWith('/client/') || h.startsWith('/coach/')), []);
check('guests do see Community', guestHrefs.some((h) => h.startsWith('/community/')), true);
check('clients get the client appointments route', clientHrefs.includes('/client/appointments'), true);
check('coaches get the coach appointments route', coachHrefs.includes('/coach/appointments'), true);
check('clients and coaches do not share the appointments route', clientHrefs.includes('/coach/appointments'), false);
check('Groovey stays client-only', coachHrefs.includes('/client/groovey'), false);
check('Find Coaches stays client-only', coachHrefs.includes('/client/talent#directory'), false);

// ── 4. The greeting is still role-aware ────────────────────────────────────
console.log('\n-- greeting --');
check('coach is addressed as Coach', greetingFor('coach', 'Ria', 9), 'Good morning, Coach Ria');
check('coach afternoon', greetingFor('coach', 'Ria', 14), 'Good afternoon, Coach Ria');
check('coach evening', greetingFor('coach', 'Ria', 20), 'Good evening, Coach Ria');
check('client is welcomed back', greetingFor('client', 'Ria', 9), 'Welcome back, Ria');

// ── 6. Landing-page filtering is untouched ─────────────────────────────────
console.log('\n-- landing page filtering --');
const landing = sectionsForRole('guest', { hideOnLanding: true }).map((s) => s.id);
const elsewhere = sectionsForRole('guest').map((s) => s.id);
check('Community is hidden on /', landing.includes('community'), false);
check('About Groove is hidden on /', landing.includes('about'), false);
check('Community is present elsewhere', elsewhere.includes('community'), true);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);