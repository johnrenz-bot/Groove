'use client';

/**
 * THE ONE PUBLIC HEADER.
 *
 * Transparent and borderless: brand icon, drawer toggle, a quiet breadcrumb,
 * and one control cluster on the right. The desktop link row and the second
 * search input in the old mobile drawer are gone - navigation now lives in
 * the same on-demand overlay used by the authenticated shell, and search is
 * the single shared command palette.
 *
 * Auth pages do not mount this component; they keep their own AuthLayout.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, LogIn, Menu, UserPlus } from 'lucide-react';

import { signOutEverywhere } from '@/lib/auth/signOut';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { HeaderSearch } from '@/components/search/HeaderSearch';
import { HeaderAccount } from '@/components/header/HeaderAccount';
import { NavigationDrawer } from '@/components/navigation/NavigationDrawer';
import { useSession } from '@/components/providers/SessionProvider';
import { dashboardLanguage, translateIn, useLanguage } from '@/lib/i18n/LanguageProvider';
import { headerConfigForRole } from '@/components/header/appHeaderConfig';
import {
  activeNavKey,
  LANDING_ANCHORS,
  navCrumbsFor,
  sectionsForRole,
  type NavRole,
} from '@/components/header/navConfig';

type ActiveOverlay = 'drawer' | 'search' | 'notifications' | 'account' | null;

export function AppHeader({ homeHref }: { homeHref?: string } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, profile, role: sessionRole } = useSession();
  const { language } = useLanguage();
  const role: NavRole =
    sessionRole === 'coach' || sessionRole === 'client' || sessionRole === 'admin'
      ? sessionRole
      : 'guest';
  const config = headerConfigForRole(role);
  const user = profile;
  const resolving = status === 'loading';
  const lang = dashboardLanguage(role, language);
  const t = (key: string, fallback: string) => translateIn(lang, key, fallback);

  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const drawerOpen = activeOverlay === 'drawer';
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const previousDrawerOpenRef = useRef(drawerOpen);
  const cleanPath = pathname.split('#')[0].split('?')[0] || '/';
  const isLanding = cleanPath === '/';

  // On the landing page the anchors are ADDED to the nav model; the route
  // destinations stay reachable from the drawer as well, so nothing that was
  // in the old header is lost.
  const sections = sectionsForRole(role);
  const activeKey = activeNavKey(cleanPath, sections, role);
  const breadcrumbs = isLanding ? ['Discover'] : navCrumbsFor(cleanPath, sections, role);
  const brandHref = homeHref ?? config.homeHref;

  const closeOverlay = useCallback(() => setActiveOverlay(null), []);
  const toggleDrawer = useCallback(
    () => setActiveOverlay((current) => (current === 'drawer' ? null : 'drawer')),
    []
  );

  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setActiveOverlay(null);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveOverlay(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const wasOpen = previousDrawerOpenRef.current;
    previousDrawerOpenRef.current = drawerOpen;
    if (wasOpen && !drawerOpen) {
      const drawer = document.getElementById('global-navigation-drawer');
      const active = document.activeElement;
      if (drawer && active instanceof Node && drawer.contains(active)) toggleRef.current?.focus();
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const root = document.documentElement;
    root.classList.add('dash-drawer-open');
    return () => root.classList.remove('dash-drawer-open');
  }, [drawerOpen]);

  const handleLogout = useCallback(async () => {
    await signOutEverywhere(user?.id ?? null);
    router.push('/login');
    router.refresh();
  }, [user, router]);

  return (
    <>
      <header className="nav-header nav-header--public" data-cursor="native">
        <div className="nav-header-left">
          <Link href={brandHref} className="nav-brand-mark" aria-label="GroovePH home" onClick={closeOverlay}>
            <Image
              src="/image/Logo/GroovePH-Logo.png"
              alt=""
              width={30}
              height={30}
              className="nav-brand-logo"
              preload
            />
          </Link>

          <button
            ref={toggleRef}
            type="button"
            className="nav-toggle"
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawerOpen}
            aria-controls="global-navigation-drawer"
            onClick={toggleDrawer}
          >
            <Menu aria-hidden="true" />
          </button>

          <nav className="nav-crumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index, all) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <ChevronRight className="nav-crumb-sep" aria-hidden="true" /> : null}
                <span className={index === all.length - 1 ? 'nav-crumb-current' : 'nav-crumb-label'}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="nav-header-spacer" />

        <div className="nav-header-actions">
          <HeaderSearch
            config={config}
            role={role}
            variant="header"
            open={activeOverlay === 'search'}
            suspended={activeOverlay !== null && activeOverlay !== 'search'}
            onOpenChange={(next) => setActiveOverlay(next ? 'search' : null)}
          />

          {resolving ? (
            <span className="nav-skeleton" aria-hidden="true" />
          ) : user ? (
            <NotificationDropdown
              userId={user.id}
              open={activeOverlay === 'notifications'}
              onOpenChange={(next) => setActiveOverlay(next ? 'notifications' : null)}
            />
          ) : null}

          <ThemeToggle />

          {user ? (
            <HeaderAccount
              role={role}
              user={user}
              config={config}
              open={activeOverlay === 'account'}
              onOpenChange={(next) => setActiveOverlay(next ? 'account' : null)}
              onLogout={handleLogout}
            />
          ) : (
            <>
              <Link href="/login" className="nav-auth-link">
                <LogIn aria-hidden="true" />
                <span>{t('header.signIn', 'Sign in')}</span>
              </Link>
              <Link href="/register/client" className="nav-auth-link nav-auth-link--primary">
                <UserPlus aria-hidden="true" />
                <span>{t('header.getStarted', 'Get started')}</span>
              </Link>
            </>
          )}
        </div>
      </header>

      <NavigationDrawer
        open={drawerOpen}
        onClose={closeOverlay}
        onToggle={toggleDrawer}
        sections={sections}
        role={role}
        activeKey={activeKey}
        mode="overlay"
        extraGroups={[
          ...(isLanding
            ? [
                {
                  label: 'On this page',
                  links: LANDING_ANCHORS.map((anchor) => ({
                    id: anchor.id,
                    label: anchor.label,
                    href: `#${anchor.id}`,
                    icon: anchor.icon,
                  })),
                },
              ]
            : []),
          {
            label: 'Groove',
            links: config.dropdownItems.about.map((item) => ({
              id: item.id,
              label: item.label,
              href: item.href,
              icon: item.icon,
            })),
          },
        ]}
      />
    </>
  );
}

export default AppHeader;
