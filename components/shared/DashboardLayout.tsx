'use client';

import React from 'react';
import { AppTopNav, type DashboardRole } from '@/components/shared/AppTopNav';
import { Header } from '@/components/header/Header';
import type { NavGroup, NavItem, RoleNav } from '@/components/shared/navTypes';
import { ADMIN_NAV, ADMIN_PORTAL_LABEL } from '@/components/admin/navigation';
import { CLIENT_NAV, CLIENT_PORTAL_LABEL } from '@/components/client/navigation';
import { COACH_NAV, COACH_PORTAL_LABEL } from '@/components/coach/navigation';
import { WelcomeModal } from '@/components/shared/WelcomeModal';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';

import { ChatProvider, useOptionalChat, GrooveyFloatingAssistant } from '@/features/groovey';
import { MusicPlayerProvider } from '@/features/music';

/**
 * Each portal's own menu, by role.
 *
 * The shell reads the role's data from here rather than from its props, so no
 * portal can inherit another's items: an admin page always renders
 * ADMIN_NAV, a coach page always renders COACH_NAV, and a client page always
 * renders CLIENT_NAV. Each file keeps its own routes and labels.
 */
const ROLE_NAV: Record<DashboardRole, RoleNav> = {
  admin: ADMIN_NAV,
  coach: COACH_NAV,
  client: CLIENT_NAV,
};

const ROLE_PORTAL_LABEL: Record<DashboardRole, string> = {
  admin: ADMIN_PORTAL_LABEL,
  coach: COACH_PORTAL_LABEL,
  client: CLIENT_PORTAL_LABEL,
};

const ROLE_HOME: Record<DashboardRole, string> = {
  admin: '/admin/dashboard',
  coach: '/coach/home',
  client: '/client/home',
};

/**
 * The dashboard shell.
 *
 * The member portals render the redesigned <Header> and admin renders the
 * original <AppTopNav> — see the comment at the switch below for why they are
 * not the same component.
 *
 * There is no sidebar. The header is the navigation for every role, at every
 * width: inline links and dropdowns from `lg` up, and one drawer below it.
 *
 * The layout is a plain column — header, optional banner, content — because
 * removing the rail removed the only reason this shell needed a two-column
 * flex. Page width is governed by the content wrapper, which widened from 1200
 * to 1240px to match the header's own container.
 */
export function DashboardLayout({
  children,
  role,
  navItems,
  groups,
  portalLabel,
  homeHref,
  showWelcomeModal = false,
  showMaintenanceBanner = false,
}: {
  children: React.ReactNode;
  role: DashboardRole;
  /** Client/coach inline menu. Admin supplies its own groups and ignores this. */
  navItems?: NavItem[];
  /** Grouped menu, rendered as header dropdown triggers. */
  groups?: NavGroup[];
  portalLabel?: string;
  homeHref?: string;
  showWelcomeModal?: boolean;
  showMaintenanceBanner?: boolean;
}) {
  const roleNav = navItems || groups ? { primary: navItems ?? [], groups: groups ?? [] } : ROLE_NAV[role];
  const existingChat = useOptionalChat();

  /**
   * WHICH HEADER, AND WHY THE SPLIT.
   *
   * The member portals (client, coach) render the redesigned <Header>. Admin
   * still renders <AppTopNav>. The admin console has the largest menu in the app
   * — one inline link and three dropdown groups covering verification,
   * maintenance, transactions and audit — and none of it was in the redesign
   * brief. Moving it would be a large, unrequested change to the one surface
   * where a mistake is worst, so the old header stays exactly where it is and
   * the two coexist.
   *
   * Both read the same design tokens and share `var(--nav-*)`, so they read as
   * one product — they differ in arrangement, not in palette.
   */
  const useNewHeader = role === 'client' || role === 'coach';

  const content = (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground relative">
      <LoadingScreen minDuration={500} />

      {useNewHeader ? (
        /* `role` is not passed: the header reads it from `<SessionProvider>`,
           which resolves `profiles.role` — the same authoritative column the
           Supabase middleware gates on. Passing the route group's role here
           would let the bar disagree with the router, and a coach handed
           "client" by a layout would see the wrong menu. `homeHref` stays as an
           override for the one case a portal needs a different landing route. */
        <Header homeHref={homeHref ?? ROLE_HOME[role]} />
      ) : (
        <AppTopNav
          role={role}
          primary={roleNav.primary}
          groups={roleNav.groups}
          portalLabel={portalLabel ?? ROLE_PORTAL_LABEL[role]}
          homeHref={homeHref ?? ROLE_HOME[role]}
          logoOnly={role !== 'admin'}
        />
      )}

      {showMaintenanceBanner && <MaintenanceBanner />}

      <main className="flex-1 px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto w-full max-w-[1240px]">{children}</div>
      </main>

      {showWelcomeModal && <WelcomeModal role={role} />}

      {/* Persistent Floating GrooveyAI Assistant */}
      <GrooveyFloatingAssistant />

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