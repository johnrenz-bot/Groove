'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { COACH_NAV, COACH_PORTAL_LABEL } from './navigation';

/**
 * Coach portal shell. Supplies only its own menu — five inline links and one
 * Account dropdown; the header, its responsive behaviour, and every visual rule
 * come from the shared <AppTopNav>.
 */
export function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      role="coach"
      navItems={COACH_NAV.primary}
      groups={COACH_NAV.groups}
      portalLabel={COACH_PORTAL_LABEL}
      homeHref="/coach/home"
      showWelcomeModal
    >
      {children}
    </DashboardLayout>
  );
}

export default CoachLayout;