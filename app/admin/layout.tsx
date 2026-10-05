import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getAdminIdentity } from '@/lib/admin/guard';
import { roleHome } from '@/lib/admin/access';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Admin Control Center — Groove',
  description: 'Platform administration: users, bookings, support, and system settings.',
};

/**
 * Gate for the entire admin area.
 *
 * This runs on the server for every /admin request and is the layer that makes
 * the section genuinely unreachable to non-admins. The middleware redirect is a
 * UX convenience; if it were bypassed, this check still refuses to render. Three
 * independent conditions must hold:
 *
 *   1. a valid Supabase session,
 *   2. a profiles row with role = 'admin',
 *   3. that row's email being the pinned admin address.
 *
 * On failure we redirect rather than render an error page, so a client or coach
 * who lands here sees their own portal and never learns the admin section
 * exists.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminIdentity();

  if (!admin) {
    // Work out who they actually are so they land in the right place. A failure
    // here is not itself informative, so we fall back to the client portal.
    let fallback = '/client/home';
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        fallback = roleHome(profile?.role);
      } else {
        fallback = '/login';
      }
    } catch {
      // Keep the safe default.
    }
    redirect(fallback);
  }

  return <AdminLayout admin={admin as Profile}>{children}</AdminLayout>;
}
