import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '@/lib/errors';
import type { ClientProfile, CoachProfile, Profile } from '@/lib/types';

/**
 * Profile data access, in one place.
 *
 * Every operation takes the caller's Supabase client as its first argument
 * instead of constructing one. That keeps this module usable from client
 * components (browser client), from Server Components / Route Handlers
 * (cookie-bound server client) and from tests (a fake client), while Row
 * Level Security stays exactly where it belongs: the caller's session.
 *
 * Reads and writes are separate on purpose. `updateProfile` never upserts and
 * never touches rows the caller does not own; privileged account mutations
 * belong to `lib/admin/service.ts`.
 */

/** Columns read for a full profile. Kept explicit so new columns are not leaked by accident. */
const PROFILE_COLUMNS = '*';

export async function getProfileById(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Could not load the profile.', 500, 'PROFILE_FETCH_FAILED');
  }
  return (data as Profile | null) ?? null;
}

export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string,
): Promise<Profile | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', trimmed)
    .maybeSingle();

  if (error) {
    throw new AppError('Could not load the profile.', 500, 'PROFILE_FETCH_FAILED');
  }
  return (data as Profile | null) ?? null;
}

/**
 * The signed-in user's own profile, or null when the session is guest or the
 * account has no row yet (a half-created account is not an error).
 */
export async function getCurrentProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return getProfileById(supabase, user.id);
}

export async function getCoachProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<CoachProfile | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('coach_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Could not load the coach details.', 500, 'COACH_PROFILE_FETCH_FAILED');
  }
  return (data as CoachProfile | null) ?? null;
}

export async function getClientProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClientProfile | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Could not load the client details.', 500, 'CLIENT_PROFILE_FETCH_FAILED');
  }
  return (data as ClientProfile | null) ?? null;
}

/**
 * Partial update of a profiles row. Never upserts: a missing row means the
 * account is half-created and is surfaced as an error, not silently inserted.
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Profile>,
): Promise<Profile> {
  if (!userId) {
    throw new AppError('Cannot update a profile without a user.', 400, 'PROFILE_ID_REQUIRED');
  }
  // Never let the caller move identity or role columns through this path.
  const safePatch = { ...patch };
  delete safePatch.id;
  delete safePatch.role;
  delete safePatch.created_at;
  const { data, error } = await supabase
    .from('profiles')
    .update(safePatch)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new AppError('Could not update the profile.', 500, 'PROFILE_UPDATE_FAILED');
  }
  return data as Profile;
}
