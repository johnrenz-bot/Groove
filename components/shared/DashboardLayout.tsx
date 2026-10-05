'use client';

import React from 'react';
import { AppTopNav, type DashboardRole } from '@/components/shared/AppTopNav';
import type { NavGroup, NavItem, RoleNav } from '@/components/shared/navTypes';
import { ADMIN_NAV, ADMIN_PORTAL_LABEL } from '@/components/admin/navigation';
import { CLIENT_NAV, CLIENT_PORTAL_LABEL } from '@/components/client/navigation';
import { COACH_NAV, COACH_PORTAL_LABEL } from '@/components/coach/navigation';
import { WelcomeModal } from '@/components/shared/WelcomeModal';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';

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
 * All three roles render the same <AppTopNav> with the same visual system; each
 * role supplies only its own menu. The admin console passes one inline link plus
 * three dropdown groups, the client and coach portals pass five inline links and
 * one Account dropdown — the header renders both shapes from the same tree.
 *
 * There is no sidebar. The header is the navigation for every role, at every
 * width: inline links and dropdowns from `lg` up, and one sheet below it.
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
  // Each role supplies its own menu and this shell passes it straight through.
  // The admin console used to be special-cased here with `isAdmin ? ADMIN_NAV…`,
  // which silently discarded whatever `primary`/`groups` the caller passed —
  // so the prop was decorative for that role and the two paths could drift.
  // The role's own nav data is still what renders, just resolved from one place
  // for all three portals; no route, label, or permission changes.
  const roleNav = navItems || groups ? { primary: navItems ?? [], groups: groups ?? [] } : ROLE_NAV[role];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <LoadingScreen minDuration={500} />

      <AppTopNav
        role={role}
        primary={roleNav.primary}
        groups={roleNav.groups}
        portalLabel={portalLabel ?? ROLE_PORTAL_LABEL[role]}
        homeHref={homeHref ?? ROLE_HOME[role]}
      />

      {showMaintenanceBanner && <MaintenanceBanner />}

      <main className="flex-1 px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto w-full max-w-[1240px]">{children}</div>
      </main>

      {showWelcomeModal && <WelcomeModal role={role} />}
    </div>
  );
}

export type { DashboardRole };
export default DashboardLayout;