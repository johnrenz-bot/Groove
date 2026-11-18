import { createClient } from '@/lib/supabase/server';
import { isAdminIdentity } from '@/lib/admin/access';
import type { DashboardRole } from '@/components/header/roleMeta';

export type ChromeRole = DashboardRole | 'guest';

/**
 * Server-side resolver for the chrome a visitor should get.
 *
 * The dark SaaS shell is role-specific: a signed-in coach stays inside the
 * coach workspace, an admin inside the admin console, everyone else the
 * client portal, and guests get the signed-out shell (Community + About,
 * sign-in actions in the top bar).
 *
 * Resolution mirrors the middleware in `lib/supabase/middleware.ts` — the
 * profiles row is authoritative, and only a full admin identity (role
 * 'admin' + the pinned admin email) receives the admin console. Anything
 * unexpected (no session, no profiles row, read failure) degrades to the
 * guest chrome rather than a redirect: these routes are intentionally
 * public, and a half-created account is middleware's job to redirect.
 */
export async function resolveChromeRole(): Promise<ChromeRole> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'guest';

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.role) return 'guest';
    if (isAdminIdentity({ role: profile.role, email: profile.email })) return 'admin';
    return profile.role === 'coach' ? 'coach' : 'client';
  } catch {
    return 'guest';
  }
}
