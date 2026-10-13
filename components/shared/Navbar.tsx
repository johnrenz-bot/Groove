'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Profile } from '@/lib/types';
import { ROLE_META, type DashboardRole } from '@/components/shared/AppTopNav';

/**
 * The standalone header.
 *
 * Three pages render outside the role dashboards — the contract viewer, a public
 * profile, and messages — because their destination is not necessarily the
 * signed-in user's own dashboard. Those pages need a header, but not a role
 * menu, so this is deliberately a different shape from <AppTopNav>: brand and a
 * single "back to dashboard" action, with no navigation tree.
 *
 * It shares the `.g-header` classes, so it is visually the same product chrome —
 * a smaller one, not a different one.
 */
export function AppHeader({
  role = 'client',
  user,
  userProfile,
  userRole,
}: {
  role?: DashboardRole;
  user?: Profile | null;
  userProfile?: Profile | null;
  userRole?: DashboardRole;
}) {
  const meta = ROLE_META[role];
  const profile = user || userProfile || null;

  return (
    <header className="g-header">
      <div className="g-header-inner" style={{ gridTemplateColumns: 'auto 1fr' }}>
        <div className="g-header-brand">
          <Link href={meta.path} className="g-header-logo" aria-label="Groove dashboard">
            <span className="g-header-mark">
              <Image
                src="/image/Logo/GroovePH-Logo.png"
                alt=""
                width={22}
                height={22}
                className="h-[22px] w-auto object-contain"
              />
            </span>
            <span className="g-header-wordmark">
              <span className="g-header-name">Groove</span>
              <span className="g-header-role">{meta.label}</span>
            </span>
          </Link>
        </div>

        <div className="g-header-actions">
          {profile && <NotificationDropdown userId={profile.id} />}
          <ThemeToggle />
          {/* Routed through the shared <Button> so the "back to dashboard" action
              cannot drift from every other primary control in the app. It used to
              be a hand-rolled pill with its own height and padding. */}
          <Link href={meta.path} className="inline-flex">
            <Button size="sm">Dashboard</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;