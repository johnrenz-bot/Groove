'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/DashboardLayout';

/**
 * Coach portal shell.
 *
 * Structurally identical to the client portal, and now genuinely identical in
 * code too: it passes a role and nothing else, and `<SiteHeader>` supplies the
 * menu from `components/header/navConfig.ts`. It used to carry its own copy of
 * the coach menu, which is what let the coach bar drift away from the client
 * bar's geometry.
 *
 * It also no longer mounts a `<ThemeProvider>`: that lives in the root layout,
 * once, beside `<SessionProvider>`.
 */
export function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="coach" homeHref="/coach/home" showWelcomeModal>
      {children}
    </DashboardLayout>
  );
}

export default CoachLayout;