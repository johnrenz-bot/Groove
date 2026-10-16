'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

/**
 * Client portal shell.
 *
 * It no longer supplies a menu. The role used to be handed a `navItems` array,
 * a `groups` array and a `portalLabel` string which only `AppTopNav` ever
 * consumed, which meant the client's menu lived in two places — here and in
 * `navConfig.ts` — and the two could disagree. The role alone is now enough:
 * `<SiteHeader>` reads the session, looks the role's sections up in
 * `components/header/navConfig.ts`, and renders them.
 *
 * ThemeProvider is scoped to dashboard layouts only (client, coach, admin).
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardLayout role="client" homeHref="/client/home" showWelcomeModal>
        {children}
      </DashboardLayout>
    </ThemeProvider>
  );
}

export default ClientLayout;