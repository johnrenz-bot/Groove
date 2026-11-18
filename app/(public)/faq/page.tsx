import React from 'react';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { FaqContent } from '@/components/faq/FaqContent';
import { SupportCta } from '@/components/faq/SupportCta';
import { resolveChromeRole } from '@/lib/auth/resolveChromeRole';

/**
 * /faq — one page, two chromes.
 *
 * Guests get the public shell (header + footer). A signed-in visitor keeps
 * their role-based dashboard workspace: account questions are part of the
 * member experience, and the sidebar must not vanish when a member opens the
 * FAQ from the portal. The answers are static; only the shell branches.
 */
export default async function FaqPage() {
  const role = await resolveChromeRole();

  if (role === 'guest') {
    return (
      <PublicLayout>
        <FaqContent />
        <SupportCta />
      </PublicLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <FaqContent />
      <SupportCta />
    </DashboardLayout>
  );
}

