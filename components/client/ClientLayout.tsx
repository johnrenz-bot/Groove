'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { CLIENT_NAV, CLIENT_PORTAL_LABEL } from './navigation';

/**
 * Client portal shell. Supplies only its own menu — five inline links and one
 * Account dropdown; the header, its responsive behaviour, and every visual rule
 * come from the shared <AppTopNav>.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}

export default ClientLayout;