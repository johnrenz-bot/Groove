import type { Metadata } from 'next';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { AboutGroove } from '@/components/about/AboutGroove';
import { resolveChromeRole } from '@/lib/auth/resolveChromeRole';

export const metadata: Metadata = {
  title: 'About Groove — Performing Arts Platform',
  description:
    'Learn how GroovePH connects performers, verified coaches, rehearsal spaces, and the performing arts community of San Jose del Monte, Bulacan.',
  alternates: { canonical: '/about' },
};

/**
 * /about — one page, two chromes.
 *
 * Guests get the public shell (header + footer). A signed-in visitor stays
 * inside their role-based dashboard workspace: the About page is a shared
 * informational surface, and sidebars/headers must not vanish when a member
 * navigates to it from the portal. The markup is identical either way —
 * only the shell around it branches.
 */
export default async function AboutPage() {
  const role = await resolveChromeRole();

  if (role === 'guest') {
    return (
      <PublicLayout>
        <AboutGroove />
      </PublicLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <AboutGroove />
    </DashboardLayout>
  );
}

