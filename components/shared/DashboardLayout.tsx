'use client';

import React from 'react';
import { AppHeader } from '@/components/header/AppHeader';
import { type DashboardRole } from '@/components/header/roleMeta';

import { WelcomeModal } from '@/components/shared/WelcomeModal';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';

import { ChatProvider, useOptionalChat, GrooveyFloatingAssistant } from '@/features/groovey';
import { MusicPlayerProvider } from '@/features/music';

/**
 * The dashboard shell.
 *
 * Every role — client, coach AND admin — renders the same `<SiteHeader>`. It
 * used to be a fork: the member portals got one header and the admin console
 * got a second, 1,100-line one with its own design tokens. Two headers is what
 * produced the mismatched heights, the language toggle that existed on one
 * route and not another, and the nav that shifted sideways between pages. The
 * role now only chooses DATA — nav items and the wordmark's role line — and the
 * header itself is a single component.
 *
 * There is no sidebar. The header is the navigation for every role, at every
 * width: inline links and dropdowns from `lg` up, and one drawer below it.
 *
 * The layout is a plain column — header, optional banner, content. Page width
 * is governed by the content wrapper, which is 1240px to match the header's own
 * container.
 */
export function DashboardLayout({
  children,
  role,
  homeHref,
  showWelcomeModal = false,
  showMaintenanceBanner = false,
}: {
  children: React.ReactNode;
  role: DashboardRole;
  /** Overrides the brand destination. Defaults to the role's own home. */
  homeHref?: string;
  showWelcomeModal?: boolean;
  showMaintenanceBanner?: boolean;
}) {
  const existingChat = useOptionalChat();

  const content = (
    <div className="relative isolate min-h-screen font-sans text-foreground">
      {/* No `bg-background` here by design: the page colour lives only on
          <body>, so the fixed <PagePatterns /> layer (z-0, mounted once in the
          root layout) stays visible through this transparent shell. The old
          per-shell <PatternBackdrop /> was removed so it cannot double-render.
          Cards, modals and panels keep their own opaque surfaces. */}
      <LoadingScreen minDuration={500} />

      <AppHeader homeHref={homeHref} />

      {showMaintenanceBanner && <MaintenanceBanner />}

      <main id="main-content" tabIndex={-1} className="relative z-10 flex-1 px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto w-full max-w-[1240px]">{children}</div>
      </main>

      {showWelcomeModal && <WelcomeModal role={role} />}

      {/* Persistent Floating GrooveyAI Assistant — the ONE floating widget in
          the app. Role-aware label: "Ask AI coach" for clients, "Ask AI
          assistant" for coach/admin. Pages must NOT render their own copy
          (the legacy GrooveyAIFab was removed for exactly this reason). */}
      <GrooveyFloatingAssistant role={role === 'client' ? 'client' : 'coach'} />

      {/* The floating music dock was removed. Music now lives entirely inside the
          Community Showcase hub bar, and `MusicPlayerProvider` gates itself to the
          Showcase routes via the pathname — so there is no second player UI and
          nothing to render here. */}
    </div>
  );

  const wrappedWithChat = existingChat ? content : <ChatProvider>{content}</ChatProvider>;

  return <MusicPlayerProvider>{wrappedWithChat}</MusicPlayerProvider>;
}

export type { DashboardRole };
export default DashboardLayout;