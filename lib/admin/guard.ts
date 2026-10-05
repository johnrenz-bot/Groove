import { createClient } from '@/lib/supabase/server';
import { isAdminIdentity, type AdminIdentity } from './access';
import type { Profile } from '@/lib/types';

/**
 * Server-side admin authorization for React Server Components and Route
 * Handlers.
 *
 * Two layers are enforced on purpose:
 *
 *  1. `supabase.auth.getUser()` proves the cookie belongs to a real session.
 *  2. The `profiles` row for that uid is read through the request's own
 *     session client, so Row Level Security applies to this read exactly as it
 *     does for any other signed-in visitor. A tampered role claim in
 *     user_metadata cannot inflate the result, because the row is the source of
 *     truth here, not the JWT.
 *
 * The third check — the email pin — happens in `isAdminIdentity`, which
 * middleware also calls. Both layers must pass for admin access.
 */
export async function getAdminIdentity(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) return null;

  const identity: AdminIdentity = { role: profile.role, email: profile.email };
  return isAdminIdentity(identity) ? (profile as Profile) : null;
}

/**
 * Throws when the caller is not the platform admin. Use at the top of any
 * Route Handler that returns admin-only data or performs an admin-only write.
 *
 * @param message surfaced to the caller; keep it generic so a probe cannot use
 *   the response to distinguish "no session" from "wrong account".
 */
export async function requireAdmin(message = 'Not authorized'): Promise<Profile> {
  const admin = await getAdminIdentity();
  if (!admin) {
    const error = new Error(message) as Error & { status?: number };
    error.status = 403;
    throw error;
  }
  return admin;
}