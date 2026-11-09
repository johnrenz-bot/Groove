'use client';

import React from 'react';
import { AppHeader } from '@/components/header/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { type DashboardRole } from '@/components/header/roleMeta';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';

import { ChatProvider, useOptionalChat, GrooveyFloatingAssistant } from '@/features/groovey';
import { MusicPlayerProvider } from '@/features/music';

/**
 * The dashboard shell.
 *
 * Every role — client, coach AND admin — renders the same `<AppHeader>`. It
 * used to be a fork: the member portals got one header and the admin console
 * got a second, 1,100-line one with its own design tokens. Two headers is what
 * produced the mismatched heights, the language toggle that existed on one
 * route and not another, and the nav that shifted sideways between pages. The
 * role now only chooses DATA — nav items and the wordmark's role line — and the
 * header itself is a single component.
 *
 * There is no sidebar. The header is the navigation for every role, at every
 * width: inline links and dropdowns from `lg` up, and one drawer below it. The
 * content column is governed by AppShell's 1240px container, which mirrors the
 * header's own measure.
 */
export function DashboardLayout({
  children,
  role,
  homeHref,
  showMaintenanceBanner = false,
}: {
  children: React.ReactNode;
  role: DashboardRole;
  /** Overrides the brand destination. Defaults to the role's own home. */
  homeHref?: string;
  showMaintenanceBanner?: boolean;
}) {
  const existingChat = useOptionalChat();

  const content = (
    <div className="relative isolate min-h-screen bg-background font-sans text-foreground">
      <LoadingScreen minDuration={500} />
      <AppShell
        header={
          <>
            <AppHeader homeHref={homeHref} />
            {showMaintenanceBanner && <MaintenanceBanner />}
          </>
        }
      >
        {children}
      </AppShell>
      <GrooveyFloatingAssistant role={role === 'client' ? 'client' : 'coach'} />
    </div>
  );

  const wrappedWithChat = existingChat ? content : <ChatProvider>{content}</ChatProvider>;

  return <MusicPlayerProvider>{wrappedWithChat}</MusicPlayerProvider>;
}

export type { DashboardRole };
export default DashboardLayout;
