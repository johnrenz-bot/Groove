import { createClient } from '@/lib/supabase/client';

/**
 * THE canonical sign-out for every GroovePH surface — header menus, mobile
 * drawer, dashboard chrome, and the settings Danger Zone — so all of them
 * behave identically.
 *
 * What it does, in order:
 *   1. Marks the member offline (`profiles.status = 'offline'`). Presence is
 *      best-effort by design: a stale "online" flag must never strand a
 *      sign-out, so failures here are swallowed deliberately.
 *   2. Clears the one-time welcome-modal flag so the next sign-in always
 *      shows a fresh welcome tour.
 *   3. Ends the Supabase session (`auth.signOut()`). The session cookie is
 *      cleared client-side; the proxy treats the next request as anonymous.
 *
 * Navigation is the caller's job: callers usually follow with
 * `router.push('/login'); router.refresh()`. The Danger Zone already does
 * exactly that; the dashboard chrome and header do the same.
 *
 * Pass the user's id when it is already known to skip the extra
 * `auth.getUser()` round trip; otherwise the current user is resolved here.
 * Authorization boundaries are untouched: this only ends the caller's own
 * session.
 */
export async function signOutEverywhere(userId?: string | null): Promise<void> {
  const supabase = createClient();

  let id: string | null = userId ?? null;
  if (!id) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      id = user?.id ?? null;
    } catch {
      id = null;
    }
  }

  if (id) {
    try {
      await supabase.from('profiles').update({ status: 'offline' }).eq('id', id);
    } catch {
      // Best effort — never block sign-out on presence.
    }
  }

  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('groove_welcome_pending');
    }
  } catch {
    // Blocked storage — sign-out must not fail because of it.
  }

  await supabase.auth.signOut();
}
