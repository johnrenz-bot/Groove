'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Google registration for /register/client and /register/coach.
 *
 * WHY THIS FILE EXISTS SEPARATELY
 * Both registration pages are long, multi-step, form-heavy client components.
 * The Google path shares almost nothing with them except the final profile
 * write, so it lives here once rather than being copied into both pages.
 *
 * HOW THE ROLE SURVIVES THE ROUND TRIP
 * `supabase.auth.signInWithOAuth` accepts only redirectTo / scopes / queryParams
 * / skipBrowserRedirect — there is NO `data` option, so there is no supported way
 * to put `role` into raw_user_meta_data from the browser. That matters, because
 * public.handle_new_user() reads the role from user metadata when the auth user
 * is created and would therefore always stamp role = 'client'.
 *
 * So the role is carried in the redirect URL instead: /register/client redirects
 * to /auth/callback?next=/register/complete&role=client. The callback already
 * forwards `next`; it now also forwards a validated `role`. This is why the
 * completion page is a separate route rather than inline code on the register
 * page -- Google returns to a fresh navigation, and state in React memory is
 * gone by then.
 *
 * DUPLICATE PREVENTION
 * public.profiles.id is the auth user's own UUID and is the primary key, so
 * handle_new_user() can only ever make one row per Google account. There is no
 * second place to create a duplicate. On top of that this module refuses to
 * write anything when the role's sub-profile row already exists, and reports
 * `existing` so the caller routes to the dashboard instead of re-onboarding.
 *
 * RLS SHAPE THIS DEPENDS ON (verified against the live policy set)
 *   profiles        INSERT: admin only  -> we must NOT insert here
 *                    UPDATE: auth.uid() = id -> this is how the row is completed
 *   client_profiles INSERT: auth.uid() = id -> allowed
 *   coach_profiles  INSERT: auth.uid() = id -> allowed
 * Writing `role` from the browser is acceptable because public.is_admin() also
 * requires lower(email) = 'admin@gmail.com', so a user cannot promote themselves
 * to admin by writing this column.
 *
 * DOCUMENTS
 * Coach and client email/password registration upload a government ID during
 * signup. Google OAuth supplies none, and valid_id_path is nullable on both
 * sub-profile tables, so the row is created without it. The account is
 * unverified and the coach must upload documents from their profile before
 * they are bookable -- that is the existing verification workflow, not a new one.
 */

export type GoogleRole = 'client' | 'coach';

export const GOOGLE_ROLE_LABEL: Record<GoogleRole, string> = {
  client: 'Client',
  coach: 'Coach',
};

export const GOOGLE_ROLE_DASHBOARD: Record<GoogleRole, string> = {
  client: '/client/home',
  coach: '/coach/home',
};

export function isGoogleRole(value: unknown): value is GoogleRole {
  return value === 'client' || value === 'coach';
}

/** Route for the role after a successful Google sign-in. */
export function googleCompletionPath(role: GoogleRole): string {
  return `/register/complete?role=${role}`;
}

/**
 * Start the Google OAuth handshake.
 *
 * Goes through /auth/callback rather than straight to /register/complete
 * because that is the redirect URI configured for the project's Supabase
 * project, and it is the existing code path for exchanging the PKCE code for a
 * session. It is the only place a session cookie can be set.
 */
export async function startGoogleRegistration(role: GoogleRole): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        googleCompletionPath(role)
      )}&role=${role}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // signInWithOAuth returns the authorize URL and, unless skipBrowserRedirect is
  // set, also navigates there itself. Guard anyway: if the URL is returned but
  // the browser did not follow, navigate manually so the button is never a
  // silent no-op.
  if (data?.url && window.location.pathname !== '/auth/callback') {
    window.location.assign(data.url);
  }
}

export type GoogleCompletionOutcome =
  | { status: 'created'; role: GoogleRole }
  | { status: 'existing'; role: GoogleRole }
  | { status: 'signed-out' }
  | { status: 'wrong-role'; actualRole: GoogleRole; attempted: GoogleRole };

/** `custom_id` is VARCHAR(10) UNIQUE and the trigger leaves it NULL for OAuth. */
function randomCustomId(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Split a Google display name into first/last.
 *
 * Google guarantees only a display name, so a single-word name yields a
 * firstname and no lastname -- but profiles.lastname is NOT NULL, so an empty
 * string is used rather than null, matching what handle_new_user() does.
 */
function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: 'User', lastname: '' };
  if (parts.length === 1) return { firstname: parts[0], lastname: '' };
  return { firstname: parts[0], lastname: parts[parts.length - 1] };
}

function subProfileTable(role: GoogleRole): 'client_profiles' | 'coach_profiles' {
  return role === 'coach' ? 'coach_profiles' : 'client_profiles';
}

/**
 * Finish registration for an already-authenticated Google user.
 *
 * Idempotent by design: calling it twice, or calling it for someone who already
 * registered with email/password, does not create a second account and does not
 * throw.
 */
export async function completeGoogleRegistration(
  role: GoogleRole
): Promise<GoogleCompletionOutcome> {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  // A missing or expired session is the expected outcome if the user abandoned
  // the Google consent screen, so it is reported as its own state rather than as
  // a failure to save a profile. getUser() rejects in that case, and surfacing
  // its raw "Auth session missing!" text under a "could not be completed"
  // heading would misdescribe what happened.
  if (authError || !user) {
    return { status: 'signed-out' };
  }

  const userId = user.id;
  const email = (user.email ?? '').trim();
  if (!email) {
    throw new Error('Your Google account did not share an email address.');
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const googleName =
    typeof meta.full_name === 'string' && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta.name === 'string' && meta.name.trim()
        ? meta.name.trim()
        : email.split('@')[0];

  const { firstname, lastname } = splitName(googleName);

  // The trigger has already inserted the profiles row. Read it to learn whether
  // this person is new, and to avoid clobbering a name they set by hand.
  const { data: existingProfile, error: readErr } = await supabase
    .from('profiles')
    .select('id, firstname, lastname, custom_id, role')
    .eq('id', userId)
    .maybeSingle();

  if (readErr) {
    throw new Error(`Could not read your profile: ${readErr.message}`);
  }

  if (!existingProfile) {
    // handle_new_user() should always have created this row. If it genuinely did
    // not, we cannot insert it: profiles has no self-INSERT policy. Fail loudly
    // rather than pretending registration worked.
    throw new Error(
      'Your Google account was verified, but its profile record was not created. Please contact support.'
    );
  }

  // Someone who already fully registered under the other role is not a new
  // registration. Creating a second role for them would silently rewrite who
  // they are, so stop and let them know instead.
  const table = subProfileTable(role);
  const { data: existingSubProfile, error: subReadErr } = await supabase
    .from(table)
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (subReadErr) {
    throw new Error(`Could not check your ${GOOGLE_ROLE_LABEL[role].toLowerCase()} profile: ${subReadErr.message}`);
  }

  const profileRole = (existingProfile.role ?? 'client') as string;
  if (existingSubProfile && profileRole !== role) {
    return {
      status: 'wrong-role',
      actualRole: profileRole === 'coach' ? 'coach' : 'client',
      attempted: role,
    };
  }

  if (existingSubProfile) {
    // Already set up under this role. Refresh only what Google is authoritative
    // about (verified email) and leave everything else alone.
    const { error: refreshErr } = await supabase
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', userId);
    if (refreshErr) {
      throw new Error(`Could not update your profile: ${refreshErr.message}`);
    }
    return { status: 'existing', role };
  }

  /* -- New Google account: complete the row the trigger started --------- */

  // Only fill names that are still empty, so a name typed during a previous
  // partial attempt is not overwritten by Google's display name.
  const patch: Record<string, unknown> = {
    email,
    // Google has verified the address; the trigger's default is not correct here.
    email_verified: true,
    role,
    status: 'offline',
  };
  if (!existingProfile.firstname || existingProfile.firstname === 'User') patch.firstname = firstname;
  if (!existingProfile.lastname) patch.lastname = lastname;
  if (!existingProfile.custom_id) patch.custom_id = randomCustomId();

  const { error: profileErr } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (profileErr) {
    // A UNIQUE collision here is almost always `username`: the trigger derives
    // it from the email local part, so two different Google accounts such as
    // ana@gmail.com and ana@yahoo.com collide. That is a real, explainable
    // failure, so say so rather than showing a raw Postgres message.
    if (/duplicate key|unique|already exists/i.test(profileErr.message)) {
      throw new Error(
        'That Google email conflicts with an existing account username. Please sign in with your email and password, or use a different Google account.'
      );
    }
    throw new Error(`Your profile could not be saved: ${profileErr.message}`);
  }

  // The sub-profile row. Documents are intentionally omitted: valid_id_path is
  // nullable and the account stays unverified until the user uploads an ID from
  // their profile.
  const subPatch: Record<string, unknown> = { id: userId };
  if (role === 'coach') {
    subPatch.talents = 'Dance';
  } else {
    subPatch.talent = 'Dance';
  }

  const { error: subErr } = await supabase.from(table).insert(subPatch);
  if (subErr) {
    // 23505 = unique violation, meaning a concurrent completion won the race.
    // Treat that as success rather than showing a failure for a finished signup.
    if (subErr.code === '23505') return { status: 'existing', role };
    throw new Error(
      `Your ${GOOGLE_ROLE_LABEL[role].toLowerCase()} profile could not be saved: ${subErr.message}`
    );
  }

  return { status: 'created', role };
}

/**
 * Start Google sign-in from the LOGIN page.
 *
 * Deliberately separate from startGoogleRegistration: at login time nobody has
 * told us whether they are a client or a coach, and guessing would either strand
 * a coach on the client dashboard or send a client to a page they cannot use.
 * So no role is carried, and /register/complete infers it from the profile the
 * handle_new_user() trigger already created.
 *
 * This is the same Supabase provider and the same /auth/callback exchange used
 * by registration -- no second OAuth provider, no new configuration.
 */
export async function startGoogleSignIn(next?: string): Promise<void> {
  const supabase = createClient();

  // Only an in-app path is forwarded. Anything absolute or protocol-relative
  // here would turn the OAuth return leg into an open redirect.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const target = safeNext ? `/register/complete?next=${encodeURIComponent(safeNext)}` : '/register/complete';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.url && window.location.pathname !== '/auth/callback') {
    window.location.assign(data.url);
  }
}

/**
 * Finish a Google SIGN-IN (from /login) for an already-authenticated user.
 *
 * Detects the role from the existing profile instead of being told it, creates
 * the matching sub-profile row if it is missing, and returns where to go. An
 * existing account is never re-onboarded and never duplicated.
 */
export async function completeGoogleSignIn(
  next?: string
): Promise<{ status: 'ok'; redirectTo: string }> {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;
  if (authError || !user) return { status: 'ok', redirectTo: '/login?error=auth_callback_failed' };

  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('id, role, firstname, lastname')
    .eq('id', user.id)
    .maybeSingle();

  if (readErr) {
    throw new Error(`Could not read your profile: ${readErr.message}`);
  }
  if (!profile) {
    // No profile at all means the trigger did not fire for this user. We cannot
    // insert one (profiles has no self-INSERT policy), so send them to sign in
    // normally rather than looping them back here.
    return { status: 'ok', redirectTo: '/login?error=profile_missing' };
  }

  const role: GoogleRole = profile.role === 'coach' ? 'coach' : 'client';

  // Create the role's sub-profile only if it is genuinely absent. reuses the
  // same table/column mapping as the registration path.
  const table = subProfileTable(role);
  const { data: existing, error: subErr } = await supabase
    .from(table)
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (subErr) {
    throw new Error(`Could not check your profile: ${subErr.message}`);
  }

  if (!existing) {
    const subPatch: Record<string, unknown> = { id: user.id };
    if (role === 'coach') subPatch.talents = 'Dance';
    else subPatch.talent = 'Dance';

    const { error: insertErr } = await supabase.from(table).insert(subPatch);
    if (insertErr && insertErr.code !== '23505') {
      throw new Error(`Your ${GOOGLE_ROLE_LABEL[role].toLowerCase()} profile could not be saved: ${insertErr.message}`);
    }
  }

  // An explicit ?next wins, but only as an in-app path.
  const redirectTo =
    next && next.startsWith('/') && !next.startsWith('//') ? next : GOOGLE_ROLE_DASHBOARD[role];

  return { status: 'ok', redirectTo };
}
