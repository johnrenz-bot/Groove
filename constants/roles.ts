/**
 * Role definitions, in one place.
 *
 * `UserRole` lives in `@/lib/types` (it mirrors the `user_role` enum in the
 * database). This module is the presentation-side counterpart: labels and
 * where each role lands by default. Authorization itself — who may enter a
 * route or call an admin endpoint — is decided in `@/lib/supabase/middleware`,
 * `@/lib/admin/access` and `@/lib/permissions`, never here.
 */
import type { UserRole } from '@/lib/types';

export const ROLES = ['client', 'coach', 'admin'] as const satisfies readonly UserRole[];

export type Role = UserRole;

export const ROLE_LABEL: Record<Role, string> = {
  client: 'Client',
  coach: 'Coach',
  admin: 'Admin',
};

/** Where a role's authenticated home lives. Mirrors `isAdminIdentity` checks elsewhere. */
export const ROLE_HOME: Record<Role, string> = {
  client: '/client/home',
  coach: '/coach/home',
  admin: '/admin/dashboard',
};

export function isRole(value: unknown): value is Role {
  return value === 'client' || value === 'coach' || value === 'admin';
}
