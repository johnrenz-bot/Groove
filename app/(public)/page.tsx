import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminIdentity, roleHome } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';
import LandingSections from '@/components/landing/LandingSections';

/**
 * `/` — THE ONE ROUTE FOR THE ROOT PATH.
 *
 * There used to be two `page.tsx` files resolving to `/`: this one and
 * `app/page.tsx`. Turbopack preferred the root-level one, so this file — and
 * with it the whole `(public)` group's layout, its dark shell and its
 * authentication check — never executed. That is the root cause of the reported
 * bug: a signed-in Client opened `/`, was shown the marketing page, and the
 * header on it drew "Client Account", Profile, Settings and Sign Out over a
 * sales pitch. Two files for one URL means the winner is a bundler detail, not
 * a decision anybody made; `app/page.tsx` has been deleted and this is now the
 * only page that can serve `/`.
 *
 * INTENDED BEHAVIOUR
 *
 *   guest                 -> the public landing page, exactly as before.
 *   client / coach / admin -> redirected to their own portal
 *                             (`/client/home`, `/coach/home`, `/admin/dashboard`).
 *
 * This redirect is deliberately narrow. It applies to the ROOT ROUTE and
 * nothing else: `/about`, `/faq`, `/users`, `/community/*`,
 * `/performing-arts-philippines`, `/terms` and `/privacy` stay public, and an
 * authenticated visitor on one of them keeps the signed-in header the
 * `SessionProvider` gives them. Only `/` is treated as "the front door", and a
 * member has a better front door — their dashboard.
 *
 * The role comes from the `profiles` row, which is authoritative:
 * `user_metadata.role` is supplied by the client at signup and is not an
 * authorization claim. A signed-in user with no `profiles` row has no portal at
 * all and is sent to `/login` with an explicit reason rather than being handed
 * the client tree by a `?? 'client'` fallback. The same rule is enforced for
 * `/client/*` and `/coach/*` in `lib/supabase/middleware.ts`.
 */
export default async function PublicHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-out: show the landing page.
  if (!user) {
    return <LandingSections />;
  }

  // Authenticated: resolve role from the profiles table (authoritative).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  // A session with no profiles row is not a client until something says so.
  // Defaulting it to `client` is how a half-created account ends up with a
  // dashboard full of other people's data shapes; refuse it explicitly instead.
  if (!profile?.role) {
    redirect('/login?error=account_not_ready');
  }

  const role = profile.role as UserRole;

  // Admin requires both the role and the pinned admin email.
  if (isAdminIdentity({ role, email: profile.email })) {
    redirect(roleHome('admin'));
  }

  redirect(roleHome(role));
}