import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminIdentity, roleHome } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';
import { LandingPage } from '@/components/landing/LandingPage';

/**
 * `/` — THE ONE ROUTE FOR THE ROOT PATH.
 *
 * This is the landing page for guest users. Authenticated users are redirected
 * to their respective portals based on their role from the `profiles` table.
 *
 * INTENDED BEHAVIOUR:
 *   guest                 -> the public landing page
 *   client / coach / admin -> redirected to their own portal
 *                            (`/client/home`, `/coach/home`, `/admin/dashboard`).
 *
 * The role comes from the `profiles` row, which is authoritative:
 * `user_metadata.role` is supplied by the client at signup and is not an
 * authorization claim.
 */
export default async function PublicHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-out: show the landing page.
  if (!user) {
    return <LandingPage />;
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
    return <LandingPage />;
  }

  const role = profile.role as UserRole;

  // Admin requires both the role and the pinned admin email.
  if (isAdminIdentity({ role, email: profile.email })) {
    redirect('/admin/dashboard');
  }

  // A `role: 'admin'` account that is not the pinned admin identity has no
  // console to enter. Send it to the member portal rather than to a URL the
  // middleware would bounce straight back, which is what caused the
  // ERR_TOO_MANY_REDIRECTS loop on /admin/dashboard.
  if (role === 'admin') {
    redirect('/client/home');
  }

  redirect(roleHome(role));
}