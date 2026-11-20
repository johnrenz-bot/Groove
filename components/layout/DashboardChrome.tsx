'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, PanelLeftClose } from 'lucide-react';
import { HeaderSearch } from '@/components/search/HeaderSearch';

import { signOutEverywhere } from '@/lib/auth/signOut';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { SidebarProfileMenu } from '@/components/shared/SidebarProfileMenu';
import { useSession } from '@/components/providers/SessionProvider';
import { ROLE_META, type DashboardRole } from '@/components/header/roleMeta';
import { LogIn, UserPlus } from 'lucide-react';
import {
  sectionsForRole,
  hrefFor,
  labelFor,
  type NavRole,
} from '@/components/header/navConfig';
import { headerConfigForRole } from '@/components/header/appHeaderConfig';
import { useHubBadge } from '@/features/hub/hooks/useHubBadge';

/**
 * THE ONE DASHBOARD SHELL — client, coach and admin.
 *
 * A fixed carbon sidebar (brand lockup, inline search field, grouped navigation
 * with an gold active indicator, collapse-to-icon-rail) plus a slim sticky
 * top bar (breadcrumbs, Cmd/Ctrl+K search field with inline results,
 * notifications, account menu). The role only chooses DATA: `sectionsForRole(role)`
 * from navConfig.ts, so all three portals are guaranteed to share geometry,
 * spacing, type and motion.
 *
 * PERSISTENCE
 *   The collapsed preference is stored in localStorage under
 *   `groove-sidebar-collapsed` ('1' = icon rail) and read through
 *   `useSyncExternalStore`, so SSR and the first client render always agree
 *   (expanded); the stored value is applied as soon as React subscribes.
 *
 * KEYBOARD
 *   Ctrl/⌘+K focuses the search field and selects its text (no modal opens).
 *   Escape closes the active overlay or clears the sidebar search. Route
 *   changes close every transient surface (drawer, menus, search) during
 *   render, mirroring the old header's behaviour.
 */
/**
 * THE ONE OVERLAY.
 *
 * On mobile the drawer and the top bar's dropdowns are mutually
 * exclusive — opening one must close the other, or they stack on top of the
 * same corner of the screen. One enum replaces independent booleans.
 */
type ActiveOverlay = 'drawer' | 'notifications' | 'search' | null;

// Listener lives here (not on the hub) so the breadcrumb stays honest even if
// the hub unmounts without cleaning up first.
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
  /** 'guest' renders the signed-out chrome: Community + About navigation and
   *  sign-in / get-started actions instead of the account cluster. */
  role: DashboardRole | 'guest';
  homeHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, profile } = useSession();
  const user = profile;
  const resolving = status === 'loading';

  // Restore the collapsed preference from localStorage. `useSyncExternalStore`
  // keeps SSR and first client render consistent (server snapshot: expanded),
  // and re-reads whenever the stored value changes — from this tab via a
  // custom event, from other tabs via `storage`.
  const collapsed = useSyncExternalStore(
    (onChange) => {
      const handler = () => onChange();
      window.addEventListener('groove-sidebar-collapse', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('groove-sidebar-collapse', handler);
        window.removeEventListener('storage', handler);
      };
    },
    () => {
      try {
        return window.localStorage.getItem('groove-sidebar-collapsed') === '1';
      } catch {
        return false;
      }
    },
    () => false
  );
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const drawerOpen = activeOverlay === 'drawer';

  // The header toggle owns focus management for the drawer: when the drawer
  // closes from a swipe or the scrim (or Toggle), focus returns to it instead
  // of being lost to <body>.
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const previousDrawerOpenRef = useRef(drawerOpen);

  useEffect(() => {
    const wasOpen = previousDrawerOpenRef.current;
    previousDrawerOpenRef.current = drawerOpen;
    if (wasOpen && !drawerOpen) {
      const aside = document.getElementById('dash-mobile-nav');
      const active = document.activeElement;
      // Only steal focus back when it is still inside the drawer.
      if (aside && active instanceof Node && aside.contains(active)) {
        burgerRef.current?.focus();
      }
    }
  }, [drawerOpen]);

  // Swipe-left closes the mobile drawer. Touch only — pointerType keeps a
  // desktop mouse drag from ever closing it.
  const handleDrawerPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return;
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };
  const handleDrawerPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start || event.pointerType !== 'touch') return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) && dx < 0) {
      setActiveOverlay(null);
    }
  };

  const isGuest = role === 'guest';
  const config = headerConfigForRole(role as NavRole);
  const roleMeta = isGuest ? null : ROLE_META[role as DashboardRole];
  const brandHref = homeHref ?? roleMeta?.homeHref ?? '/';

  const toggleCollapsed = useCallback(() => {
    try {
      const next = window.localStorage.getItem('groove-sidebar-collapsed') === '1' ? '0' : '1';
      window.localStorage.setItem('groove-sidebar-collapsed', next);
    } catch {
      /* storage blocked — keep the toggle in-memory only */
    }
    window.dispatchEvent(new Event('groove-sidebar-collapse'));
  }, []);

  // Render-time reset on navigation: never leave an overlay floating over the
  // page the user just asked for. ('search' is inside the enum, so it closes
  // together with the drawer and the menus.)
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setActiveOverlay(null);
  }

  // Escape closes the active overlay (search is part of the enum, so it
  // closes too). Ctrl/Cmd+K is owned by the header search itself.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveOverlay(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Outside-click closes the two anchored dropdowns. Measured against the
  // topbar so clicks inside it never read as "outside".
  const topbarRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activeOverlay === null || activeOverlay === 'drawer') return;
    const onPointerDown = (event: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) {
        setActiveOverlay(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [activeOverlay]);

  // Body scroll lock while the drawer is open. Implemented with a class on
  // <html> instead of `body.style.overflow` so it never clobbers an inline
  // lock some modal/dialog has set — and is always removed on close or
  // unmount.
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

  /* ── Navigation model ──────────────────────────────────────────────────
     Sections render in NAV order. A section with leaves becomes a labelled
     group; a section without leaves renders as a single direct link. */
  const navRole = role as NavRole;
  const sections = sectionsForRole(navRole);

  const cleanPath = pathname.split('#')[0].split('?')[0] || '/';
  const isHubRoute =
    cleanPath.startsWith('/client/messages') || cleanPath.startsWith('/coach/messages');
  // The tee customizer owns its own top bar, rail, inspector and canvas, so the
  // dashboard chrome steps aside and the editor runs edge to edge.
  const isFocusRoute = cleanPath === '/builder' || cleanPath.startsWith('/builder/');
  const hubBadge = useHubBadge(role === 'client' ? 'client' : role === 'coach' ? 'coach' : null);
  const [counterpartCrumb, setCounterpartCrumb] = useState<string | null>(null);
  useHubCounterpartCrumb(cleanPath, setCounterpartCrumb);
  const matchesPath = (href: string) => {
    const target = href.split('#')[0].split('?')[0] || '/';
    if (target === cleanPath) return true;
    return target !== '/' && cleanPath.startsWith(`${target}/`);
  };

  let activeKey: string | null = null;
  for (const section of sections) {
    if (section.items) {
      for (const leaf of section.items) {
        if (
          matchesPath(hrefFor(leaf, navRole)) ||
          (leaf.id === 'bookings' &&
            (cleanPath === '/client/appointments' || cleanPath === '/coach/appointments'))
        ) {
          activeKey = `leaf:${leaf.id}`;
          break;
        }
      }
    } else if (section.href && matchesPath(section.href)) {
      activeKey = `section:${section.id}`;
    }
    if (activeKey) break;
  }

  let crumbs: string[];
  const crumbMatch = (() => {
    for (const section of sections) {
      if (section.items) {
        for (const leaf of section.items) {
          if (matchesPath(hrefFor(leaf, navRole))) {
            return [section.label, labelFor(leaf, navRole)];
          }
        }
      } else if (section.href && matchesPath(section.href)) {
        return [section.label];
      }
    }
    return null;
  })();
  if (crumbMatch) {
    crumbs = crumbMatch;
  } else {
    const last = cleanPath.split('/').filter(Boolean).pop();
    crumbs = last
      ? [last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())]
      : ['Home'];
  }
  // Hub deep-links may carry the counterpart's name (published by the hub).
  if (counterpartCrumb) {
    crumbs = [...crumbs, counterpartCrumb];
  }

  return (
    <div className="dash-shell" data-collapsed={collapsed || undefined} data-focus={isFocusRoute || undefined}>
      {drawerOpen && (
        <button
          type="button"
          className="dash-scrim"
          aria-label="Close sidebar"
          onClick={() => setActiveOverlay(null)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        id="dash-mobile-nav"
        className="dash-sidebar"
        data-open={drawerOpen || undefined}
        aria-label="Primary navigation"
        data-cursor="native"
        onPointerDown={handleDrawerPointerDown}
        onPointerUp={handleDrawerPointerUp}
      >
        {/* Top row — same height and bottom border as the main header. */}
        <div className="dash-top">
          <Link href={brandHref} className="dash-brand" aria-label="GroovePH home" onClick={() => setActiveOverlay(null)}>
            <Image
              src="/image/Logo/GroovePH-Logo.png"
              alt=""
              width={36}
              height={36}
              preload
              className="h-9 w-9 object-contain"
            />
            <span className="dash-brand-text">
              <span className="dash-brand-name">GroovePH</span>
              <span className="dash-brand-sub">Performing Arts</span>
            </span>
          </Link>

          <button
            type="button"
            className="dash-rail-toggle"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeftClose className="dash-rail-toggle-icon" aria-hidden="true" />
          </button>
        </div>

        <div className="dash-sidebar-search">
          <button
            type="button"
            className="dash-sidebar-search-btn"
            onClick={() => setActiveOverlay('search')}
            aria-label="Search"
          >
            <span className="dash-sidebar-search-placeholder">Search…</span>
            <span className="dash-keycap">Ctrl K</span>
          </button>
        </div>

        <nav className="dash-nav" aria-label="Dashboard navigation">
          {sections.map((section) => {
            if (!section.items) {
              const SectionIcon = section.icon;
              const active = activeKey === `section:${section.id}`;
              return (
                <div key={section.id} className="dash-nav-group">
                  <Link
                    href={section.href ?? '#'}
                    className="dash-nav-item"
                    data-active={active || undefined}
                    aria-current={active ? 'page' : undefined}
                    data-label={section.label}
                    title={section.label}
                    onClick={() => setActiveOverlay(null)}
                  >
                    <SectionIcon aria-hidden="true" />
                    <span className="dash-nav-text">{section.label}</span>
                  </Link>
                </div>
              );
            }
            return (
              <div key={section.id} className="dash-nav-group">
                <div className="dash-nav-label">{section.label}</div>
                {section.items.map((leaf) => {
                  const href = hrefFor(leaf, navRole);
                  const label = labelFor(leaf, navRole);
                  const active = activeKey === `leaf:${leaf.id}`;
                  const LeafIcon = leaf.icon;
                  return (
                    <Link
                      key={leaf.id}
                      href={href}
                      className="dash-nav-item"
                      data-active={active || undefined}
                      aria-current={active ? 'page' : undefined}
                      data-label={label}
                      title={label}
                      onClick={() => setActiveOverlay(null)}
                    >
                      <LeafIcon aria-hidden="true" />
                      <span className="dash-nav-text">{label}</span>
                      {leaf.id === 'bookings' && hubBadge > 0 && (
                        <>
                          <span className="dash-nav-badge" aria-label={`${hubBadge} need your attention`}>
                            {hubBadge > 99 ? '99+' : hubBadge}
                          </span>
                          <span className="dash-nav-dot" aria-hidden="true" />
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="dash-sidebar-foot">
          {!isGuest && user ? (
            <SidebarProfileMenu
              role={role as NavRole}
              user={user}
              config={config}
              collapsed={collapsed}
              onLogout={handleLogout}
              onNavigate={() => setActiveOverlay(null)}
              pathname={pathname}
            />
          ) : (
            <div className="dash-profile dash-profile--guest" aria-hidden="true">
              <span className="dash-profile-avatar dash-profile-avatar--guest" aria-hidden="true">
                <span className="dash-profile-avatar-fallback">{role === 'guest' ? 'G' : '?'}</span>
              </span>
              <span className="dash-profile-copy">
                <span className="dash-profile-name">Guest session</span>
                <span className="dash-profile-role">Sign in for your workspace</span>
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="dash-main">
        <div ref={topbarRef}>
          <header className="dash-topbar" data-cursor="native">
            <button
              ref={burgerRef}
              type="button"
              className="dash-burger"
              onClick={() => setActiveOverlay((v) => (v === 'drawer' ? null : 'drawer'))}
              aria-label={drawerOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={drawerOpen}
              aria-controls="dash-mobile-nav"
            >
              <PanelLeftClose className="dash-burger-icon" aria-hidden="true" />
            </button>

            <h1 className="dash-page-title">{crumbs[crumbs.length - 1] ?? 'Home'}</h1>

            <div className="dash-topbar-spacer" />

            <HeaderSearch
              config={config}
              role={navRole}
              variant="dash"
              open={activeOverlay === 'search'}
              suspended={activeOverlay !== null && activeOverlay !== 'search'}
              onOpenChange={(next) => setActiveOverlay(next ? 'search' : null)}
            />

            <ThemeToggle />

            {resolving ? (
              <span className="h-9 w-9 animate-pulse rounded-full bg-elevated" aria-hidden="true" />
            ) : user ? (
              <NotificationDropdown
                userId={user.id}
                open={activeOverlay === 'notifications'}
                onOpenChange={(next) =>
                  setActiveOverlay(next ? 'notifications' : null)
                }
              />
            ) : (
              <div className="hx-auth">
                <Link href="/login" className="hx-auth-link">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>Sign In</span>
                </Link>
                <Link href="/register/client" className="hx-auth-link hx-auth-link--primary">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </header>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className={
            isFocusRoute
              ? 'dash-content dash-content--focus'
              : isHubRoute
                ? 'dash-content dash-content--hub'
                : 'dash-content'
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardChrome;

