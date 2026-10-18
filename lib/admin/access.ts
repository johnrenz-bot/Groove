import type { UserRole } from '@/lib/types';

/**
 * The single definition of "who may administer this platform".
 *
 * Two conditions, both required:
 *   1. the profiles row has role = 'admin'
 *   2. the account email is exactly ADMIN_EMAIL
 *
 * The email check is not redundant. `profiles.role` is writable through the
 * public signup path's metadata, so role alone is a self-grantable claim on any
 * deployment that has not locked the column down. Pinning it to one address
 * means an attacker who manages to flip a role still gets nothing.
 *
 * Every caller — middleware, the admin layout guard, RLS migration, the admin
 * client helper — reads this module rather than re-typing either value.
 *
 * WHY THIS IS AN ENV VAR AND NOT A LITERAL
 *
 *   It used to be the literal `'admin@gmail.com'`, while `.env.local` configured
 *   `ADMIN_EMAIL=admin@groove.com`. `isAdminIdentity` therefore answered `false`
 *   for the real administrator: `/admin` bounced to `/client/home`, and
 *   `app/admin/layout.tsx` redirected every console URL away. Nobody could log
 *   in to the admin area at all, and the cause was invisible — the symptom is
 *   "my account is treated like a normal user", not "a constant is stale".
 *
 *   The same address is mirrored in `supabase/admin_hardening.sql` (`is_admin()`
 *   and `guard_role_assignment`), so changing it here ALSO requires a migration.
 *   That duplication is unavoidable — SQL cannot read `process.env` — and the
 *   comment below is the reminder. `.env.example` documents the variable.
 */
const CONFIGURED_ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export const ADMIN_EMAIL =
  CONFIGURED_ADMIN_EMAIL && CONFIGURED_ADMIN_EMAIL.length > 0
    ? CONFIGURED_ADMIN_EMAIL.toLowerCase()
    : 'admin@gmail.com';

/** Minimal shape needed to make an authorization decision. */
export interface AdminIdentity {
  role?: UserRole | string | null;
  email?: string | null;
}

/**
 * True only for a full admin identity. Email comparison is case-insensitive and
 * whitespace-tolerant because Supabase lowercases emails on insert but a
 * hand-seeded profiles row may not have gone through signup.
 */
export function isAdminIdentity(identity: AdminIdentity | null | undefined): boolean {
  if (!identity) return false;
  if (identity.role !== 'admin') return false;
  const email = (identity.email || '').trim().toLowerCase();
  return email === ADMIN_EMAIL;
}

/** Where an unauthorized visitor should be sent, given whatever role we know. */
export function roleHome(role?: UserRole | string | null): string {
  if (role === 'coach') return '/coach/home';
  if (role === 'admin') return '/admin/dashboard';
  return '/client/home';
}