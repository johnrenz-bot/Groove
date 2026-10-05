import { createClient } from '@/lib/supabase/client';
import { parseGenres } from '@/lib/utils';

/**
 * Dance-role access control. SERVER SIDE ONLY.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * "Dance" IS NOT A ROLE
 * There is no Dance value in the public.user_role enum, which is exactly
 * ('client', 'coach', 'admin'). "Dance" is a DISCIPLINE and it lives in two
 * different places depending on the account type:
 *
 *   client -> public.client_profiles.talent  (VARCHAR; Dance | Singing |
 *             Acting | Theater | Musical Instruments)
 *   coach  -> public.coach_profiles.talents (a TEXT column holding JSON
 *             {"skill":"Dance","genres":[...]}, so it MUST be read through
 *             parseGenres() — matching the raw text would miss a coach whose
 *             value is valid JSON rather than a bare "Dance")
 *
 * Creating a Dance role, or a new table to track one, was explicitly out of
 * scope, and neither is needed: both facts are already in existing tables that
 * the caller can read under their own RLS.
 *
 * THE RULE
 *   Dance client  -> ALLOW
 *   Dance coach   -> ALLOW
 *   Admin         -> ALLOW (QA / support; the role is real and gated by
 *                    is_admin(), which also requires email admin@gmail.com)
 *   non-Dance client -> DENY
 *   non-Dance coach  -> DENY
 *   signed out     -> DENY
 *
 * WHY THIS IS NOT A UI HIDE
 * The route calls this before it touches any upstream source, so a denied caller
 * never causes a third-party request and never receives a byte of event data.
 * Hiding the nav entry is a convenience on top of this, not the control.
 */

export type DanceAccess =
  | { allowed: true; reason: 'dance-client' | 'dance-coach' | 'admin' }
  | { allowed: false; status: 401 | 403; reason: string };

/** Matches the canonical dance discipline label case-insensitively. */
const DANCE = /^dance$/i;

export async function checkDanceAccess(): Promise<DanceAccess> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      allowed: false,
      status: 401,
      reason: 'Sign in to view Dance events.',
    };
  }

  // Only the columns needed for the decision. Nothing sensitive is read.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    // Fail closed. An unreadable profile must never widen access.
    return {
      allowed: false,
      status: 403,
      reason: 'Could not verify your access to Dance events.',
    };
  }

  if (!profile) {
    return {
      allowed: false,
      status: 403,
      reason: 'No profile is associated with this account.',
    };
  }

  // Admin first: is_admin() also requires the admin email, so this cannot be
  // reached by a user who merely set role = 'admin' on their own row.
  if (profile.role === 'admin') {
    return { allowed: true, reason: 'admin' };
  }

  if (profile.role === 'coach') {
    const { data: coachProfile, error: coachError } = await supabase
      .from('coach_profiles')
      .select('talents')
      .eq('id', user.id)
      .maybeSingle();

    if (coachError) {
      return {
        allowed: false,
        status: 403,
        reason: 'Could not verify your discipline.',
      };
    }

    // parseGenres unwraps the JSON blob, a bare CSV, a legacy string, or a real
    // array. The stored value is a TEXT column, so this is the only correct read.
    const isDance = parseGenres(coachProfile?.talents).some((t) => DANCE.test(t.trim()));

    if (isDance) return { allowed: true, reason: 'dance-coach' };

    return {
      allowed: false,
      status: 403,
      reason: 'Dance events are available to Dance coaches.',
    };
  }

  // Client (the default role).
  const { data: clientProfile, error: clientError } = await supabase
    .from('client_profiles')
    .select('talent')
    .eq('id', user.id)
    .maybeSingle();

  if (clientError) {
    return {
      allowed: false,
      status: 403,
      reason: 'Could not verify your discipline.',
    };
  }

  const talent = (clientProfile?.talent ?? '').trim();
  if (DANCE.test(talent)) return { allowed: true, reason: 'dance-client' };

  return {
    allowed: false,
    status: 403,
    reason: 'Dance events are available to Dance performers.',
  };
}
