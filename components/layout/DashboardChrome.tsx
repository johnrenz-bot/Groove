'use client';

/**
 * THE ONE DASHBOARD SHELL — client, coach, admin and guest surfaces.
 *
 * The navigation is now an ON-DEMAND OVERLAY. The sidebar is not part of the
 * layout at all: the page uses the full viewport width, and a floating drawer
 * is mounted only while it is open. The header is a transparent row of
 * controls with no background, border or shadow.
 *
 * ONE OVERLAY ENUM owns the drawer, search, notifications and account menu, so
 * two of them can never be open at once. All four surfaces are unmounted on
 * navigation and on Escape. Role data comes from `navConfig.ts`; this file
 * makes no per-role decisions beyond which data lookup to call.
 */

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight,
  LogIn,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
} from 'lucide-react';

import { HeaderSearch } from '@/components/search/HeaderSearch';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { HeaderAccount } from '@/components/header/HeaderAccount';
import { NavigationDrawer } from '@/components/navigation/NavigationDrawer';
import { signOutEverywhere } from '@/lib/auth/signOut';
import { useSession } from '@/components/providers/SessionProvider';
import { ROLE_META, type DashboardRole } from '@/components/header/roleMeta';
import {
  activeNavKey,
  navCrumbsFor,
  sectionsForRole,
  type NavRole,
} from '@/components/header/navConfig';
import { headerConfigForRole } from '@/components/header/appHeaderConfig';
import { useHubBadge } from '@/features/hub/hooks/useHubBadge';

type ActiveOverlay = 'drawer' | 'search' | 'notifications' | 'account' | null;

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia('(min-width: 1024px)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// The messages hub publishes the counterpart's name so the breadcrumb can say
// who the conversation is with. The listener lives here, not in the hub, so a
// hub that unmounts cannot leave a stale crumb behind.
function useHubCounterpartCrumb(
  pathname: string,
  setCrumb: (name: string | null) => void
) {
  useEffect(() => {
    if (!pathname.startsWith('/client/messages') && !pathname.startsWith('/coach/messages')) {
      setCrumb(null);
      return;
    }
    const onCrumb = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail;
      setCrumb(typeof detail === 'string' && detail.trim() ? detail : null);
    };
    window.addEventListener('hub:crumb', onCrumb as EventListener);
    return () => {
      window.removeEventListener('hub:crumb', onCrumb as EventListener);
      setCrumb(null);
    };
  }, [pathname, setCrumb]);
}

export function DashboardChrome({
  role,
  homeHref,
  children,
}: {
  /** 'guest' renders signed-out chrome for community, directory and contracts. */
  role: DashboardRole | 'guest';
  homeHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, profile } = useSession();
  const user = profile;
  const resolving = status === 'loading';

  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const drawerOpen = activeOverlay === 'drawer';

  // Desktop uses a persistent collapsible rail; mobile uses the same markup as
  // an off-canvas overlay. The preference is stored so it survives navigation.
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => true
  );
  const [collapsed, setCollapsed] = useState(true);

  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const previousDrawerOpenRef = useRef(drawerOpen);

  // Read the saved preference AFTER hydration. useSyncExternalStore's server
  // snapshot is collapsed, and its subscription is not guaranteed to re-read
  // on mount, which previously left a stored "expanded" choice ignored.
  useEffect(() => {
    const readPreference = () => {
      try {
        setCollapsed(window.localStorage.getItem('groove-sidebar-collapsed') !== '0');
      } catch {
        setCollapsed(true);
      }
    };
    readPreference();
    window.addEventListener('groove-sidebar-collapse', readPreference);
    window.addEventListener('storage', readPreference);
    return () => {
      window.removeEventListener('groove-sidebar-collapse', readPreference);
      window.removeEventListener('storage', readPreference);
    };
  }, []);

  const isGuest = role === 'guest';
  const navRole = role as NavRole;
  const config = headerConfigForRole(navRole);
  const roleMeta = isGuest ? null : ROLE_META[role as DashboardRole];
  const brandHref = homeHref ?? roleMeta?.homeHref ?? '/';
  const cleanPath = pathname.split('#')[0].split('?')[0] || '/';

  // The tee customizer owns its own chrome; the shared shell steps aside.
  const isFocusRoute = cleanPath === '/builder' || cleanPath.startsWith('/builder/');
  const isHubRoute =
    cleanPath.startsWith('/client/messages') || cleanPath.startsWith('/coach/messages');

  // One navigation model, one active resolver, one set of breadcrumbs.
  const sections = sectionsForRole(navRole);
  const activeKey = activeNavKey(cleanPath, sections, navRole);
  const [counterpartCrumb, setCounterpartCrumb] = useState<string | null>(null);
  useHubCounterpartCrumb(cleanPath, setCounterpartCrumb);
  const crumbs = navCrumbsFor(cleanPath, sections, navRole);
  const breadcrumbs = counterpartCrumb ? [...crumbs, counterpartCrumb] : crumbs;

  const hubBadge = useHubBadge(role === 'client' ? 'client' : role === 'coach' ? 'coach' : null);

  const closeOverlay = useCallback(() => setActiveOverlay(null), []);
  const toggleDrawer = useCallback(
    () => setActiveOverlay((current) => (current === 'drawer' ? null : 'drawer')),
    []
  );

  const toggleSidebar = useCallback(() => {
    if (!isDesktop) {
      toggleDrawer();
      return;
    }
    try {
      const next = window.localStorage.getItem('groove-sidebar-collapsed') === '0' ? '1' : '0';
      window.localStorage.setItem('groove-sidebar-collapsed', next);
    } catch {
      /* private mode - keep the toggle in memory only */
    }
    window.dispatchEvent(new Event('groove-sidebar-collapse'));
  }, [isDesktop, toggleDrawer]);

  // Route changes dismiss every transient surface during render.
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

  // Return focus to the toggle when the drawer is dismissed from inside it.
  useEffect(() => {
    const wasOpen = previousDrawerOpenRef.current;
    previousDrawerOpenRef.current = drawerOpen;
    if (wasOpen && !drawerOpen) {
      const drawer = document.getElementById('global-navigation-drawer');
      const active = document.activeElement;
      if (drawer && active instanceof Node && drawer.contains(active)) {
        burgerRef.current?.focus();
      }
    }
  }, [drawerOpen]);

  // Touch swipe-left closes the drawer.
  const onDrawerPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return;
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };
  const onDrawerPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start || event.pointerType !== 'touch') return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) && dx < 0) closeOverlay();
  };

  // Scroll lock uses a class so it never fights a modal's own body lock.
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

  if (isFocusRoute) {
    return <div className="nav-shell" data-focus="true">{children}</div>;
  }

  return (
    <div
      className="nav-shell"
      data-drawer={drawerOpen ? 'true' : 'false'}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <NavigationDrawer
        open={drawerOpen}
        onClose={closeOverlay}
        onToggle={toggleSidebar}
        sections={sections}
        role={navRole}
        activeKey={activeKey}
        badges={{ bookings: hubBadge }}
        collapsed={collapsed}
        mode="shell"
        isDesktop={isDesktop}
      />

      <div className="nav-main">
        <header className="nav-header" data-cursor="native">
          <div className="nav-header-left">
            <Link
              href={brandHref}
              className="nav-brand-mark"
              aria-label="GroovePH home"
              onClick={closeOverlay}
            >
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
              ref={burgerRef}
              type="button"
              className="nav-toggle"
              onClick={toggleSidebar}
              aria-label={
                isDesktop
                  ? collapsed
                    ? 'Expand navigation'
                    : 'Collapse navigation'
                  : drawerOpen
                    ? 'Close navigation'
                    : 'Open navigation'
              }
              aria-expanded={isDesktop ? !collapsed : drawerOpen}
              aria-controls="global-navigation-drawer"
            >
              {isDesktop ? (
                collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </button>

            <nav className="nav-crumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index, all) => (
                <React.Fragment key={`${crumb}-${index}`}>
                  {index > 0 ? <ChevronRight className="nav-crumb-sep" aria-hidden="true" /> : null}
                  {index === all.length - 1 ? (
                    <span className="nav-crumb-current">{crumb}</span>
                  ) : (
                    <span className="nav-crumb-label">{crumb}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="nav-header-spacer" />

          <div className="nav-header-actions">
            <HeaderSearch
              config={config}
              role={navRole}
              variant="dash"
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
                role={navRole}
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
                  <span>Sign in</span>
                </Link>
                <Link href="/register/client" className="nav-auth-link nav-auth-link--primary">
                  <UserPlus aria-hidden="true" />
                  <span>Get started</span>
                </Link>
              </>
            )}
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          onPointerDown={onDrawerPointerDown}
          onPointerUp={onDrawerPointerUp}
          className={isHubRoute ? 'dash-content dash-content--hub nav-content' : 'dash-content nav-content'}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardChrome;
