/**
 * Role predicates and cross-role authorization helpers.
 *
 * These are pure functions over the role a caller already authenticated — they
 * do NOT read the session. Session resolution and the admin email pin live in
 * `@/lib/admin/access` (`getAdminIdentity`, `requireAdmin`); RLS remains the
 * final authority for every database read and write.
 */
import { ROLE_HOME, type Role } from '@/constants/roles';

export function isAdminRole(role: Role | string | null | undefined): boolean {
  return role === 'admin';
}

export function isCoachRole(role: Role | string | null | undefined): boolean {
  return role === 'coach';
}

export function isClientRole(role: Role | string | null | undefined): boolean {
  return role === 'client';
}

/** True when `userRole` is one of `allowed`. */
export function canAccessRole(
  userRole: Role | string | null | undefined,
  allowed: Role | readonly Role[],
): boolean {
  if (!userRole) return false;
  const list = Array.isArray(allowed) ? allowed : [allowed as Role];
  return list.includes(userRole as Role);
}

/** Default landing route for a role. Unknown roles land on the client home, matching existing behavior. */
export function homeForRole(role: Role | string | null | undefined): string {
  if (role === 'coach') return ROLE_HOME.coach;
  if (role === 'admin') return ROLE_HOME.admin;
  return ROLE_HOME.client;
}
