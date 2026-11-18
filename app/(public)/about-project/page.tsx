import type { Metadata } from 'next';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { AboutProjectContent } from '@/components/about/AboutProjectContent';
import { resolveChromeRole } from '@/lib/auth/resolveChromeRole';

export const metadata: Metadata = {
  title: 'About the Capstone Project — GroovePH',
  description:
    'The academic background, problem, objectives, development purpose, and project team behind GroovePH, a BS Information Technology capstone project at STI College San Jose Del Monte, Bulacan.',
  alternates: { canonical: '/about-project' },
};

/**
 * /about-project — one page, two chromes.
 *
 * Guests get the public shell (header + footer). A signed-in visitor keeps
 * their role-based dashboard workspace: the capstone write-up is linked from
 * the member-facing About page, and the sidebar must not vanish when a member
 * follows that link. The content is identical either way — only the shell
 * around it branches.
 */
export default async function AboutProjectPage() {
  const role = await resolveChromeRole();

  if (role === 'guest') {
    return (
      <PublicLayout>
        <AboutProjectContent />
      </PublicLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <AboutProjectContent />
    </DashboardLayout>
  );
}

