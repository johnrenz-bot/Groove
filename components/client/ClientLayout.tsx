'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { CLIENT_NAV, CLIENT_PORTAL_LABEL } from './navigation';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

/**
 * Client portal shell. Supplies only its own menu — five inline links and one
 * Account dropdown; the header, its responsive behaviour, and every visual rule
 * come from the shared <AppTopNav>.
 *
 * ThemeProvider is scoped to dashboard layouts only (client, coach, admin).
 * Public pages (landing, auth) use the (public) layout with
 * `data-public-theme="dark"` and do NOT have access to ThemeProvider — they
 * never read/write theme to localStorage and never show a theme toggle.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardLayout
        role="client"
        navItems={CLIENT_NAV.primary}
        groups={CLIENT_NAV.groups}
        portalLabel={CLIENT_PORTAL_LABEL}
        homeHref="/client/home"
        showWelcomeModal
      >
        {children}
      </DashboardLayout>
    </ThemeProvider>
  );
}

export default ClientLayout;