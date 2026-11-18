'use client';

import React from 'react';
import { DashboardChrome } from '@/components/layout/DashboardChrome';
import { type DashboardRole } from '@/components/header/roleMeta';

import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';

import { ChatProvider, useOptionalChat, GrooveyFloatingAssistant } from '@/features/groovey';
/**
 * The dashboard shell.
 *
 * Every role — client, coach AND admin — renders the same <DashboardChrome>:
 * a fixed carbon sidebar (brand, ⌘K search, grouped nav with an orange active
 * indicator + collapse-to-icon rail) and a slim sticky top bar (breadcrumbs,
 * palette trigger, notifications, account menu). The role only chooses DATA —
 * nav items and the footer badge come from navConfig.ts / roleMeta.ts.
 *
 * Shared informational routes (/community/*, and the auth-aware pages) pass
 * 'guest' to get the signed-out chrome instead of a member's sidebar.
 *
 * One shell, one geometry: anything that should feel like "the app" — spacing,
 * surfaces, borders, type — is defined once, in globals.css (.dash-*).
 */
export function DashboardLayout({
  children,
  role,
  homeHref,
  showMaintenanceBanner = false,
}: {
  children: React.ReactNode;
  /** 'guest' renders the signed-out chrome for public informational routes. */
  role: DashboardRole | 'guest';
  /** Overrides the brand destination. Defaults to the role's own home. */
  homeHref?: string;
  showMaintenanceBanner?: boolean;
}) {
  const existingChat = useOptionalChat();

  const content = (
    <div className="relative isolate min-h-screen bg-background font-sans text-foreground">
      <DashboardChrome role={role} homeHref={homeHref}>
        {showMaintenanceBanner && <MaintenanceBanner />}
        {children}
      </DashboardChrome>
      <GrooveyFloatingAssistant role={role === 'client' ? 'client' : 'coach'} />
    </div>
  );

  const wrappedWithChat = existingChat ? content : <ChatProvider>{content}</ChatProvider>;

  return <>{wrappedWithChat}</>;
}

export type { DashboardRole };
export default DashboardLayout;

