import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminIdentity, roleHome } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';
import LandingPage from '@/app/landing-page';

/**
 * Public root route — authentication-aware.
 *
 * Logged-out users see the public landing page (wrapped by the (public) layout
 * which forces the dark theme via `data-public-theme="dark"`). Authenticated
 * users are redirected to their role-specific dashboard (Coach, Client, or Admin)
 * using server-side session validation.
 */
export default async function PublicHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-out: show the landing page
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated: resolve role from the profiles table (authoritative)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole | undefined) ?? 'client';

  // Admin requires both role and email pin
  if (isAdminIdentity({ role, email: profile?.email })) {
    redirect(roleHome('admin'));
  }

  redirect(roleHome(role));
}