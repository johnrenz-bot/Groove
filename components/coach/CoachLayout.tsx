'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { COACH_NAV, COACH_PORTAL_LABEL } from './navigation';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

/**
 * Coach portal shell. Supplies only its own menu — five inline links and one
 * Account dropdown; the header, its responsive behaviour, and every visual rule
 * come from the shared <AppTopNav>.
 *
 * ThemeProvider is scoped to dashboard layouts only (client, coach, admin).
 * Public pages (landing, auth) use the (public) layout with
 * `data-public-theme="dark"` and do NOT have access to ThemeProvider — they
 * never read/write theme to localStorage and never show a theme toggle.
 */
export function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default CoachLayout;