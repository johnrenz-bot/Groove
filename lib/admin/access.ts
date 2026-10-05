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
 */
export const ADMIN_EMAIL = 'admin@gmail.com';

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