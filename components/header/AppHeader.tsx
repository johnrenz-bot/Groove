'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, Search, UserPlus } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { AnimatedLogo } from '@/components/header/AnimatedLogo';
import { NavDropdown } from '@/components/header/NavDropdown';
import { UserMenu } from '@/components/header/UserMenu';
import { MobileDrawer } from '@/components/header/MobileDrawer';
import { CommandPalette } from '@/components/header/CommandPalette';
import { useSlidingIndicator } from '@/components/header/useSlidingIndicator';
import { useHeaderScroll } from '@/components/header/useHeaderScroll';
import { useSession } from '@/components/header/SessionProvider';
import { dashboardLanguage, translateIn, useLanguage } from '@/lib/i18n/LanguageProvider';
import { translateSectionLabel } from '@/components/header/headerText';
import {
  headerConfigForRole,
  isHeaderNavActive,
  navItemsForPath,
  type HeaderNavItem,
} from '@/components/header/appHeaderConfig';
import type { NavRole } from '@/components/header/navConfig';

export interface AppHeaderProps {
  /** Optional override, kept for the standalone pages that mount the bar. */
  homeHref?: string;
}

type MenuId = string | null;

function navRoleFor(role: 'coach' | 'client' | 'admin' | 'none' | 'guest'): NavRole {
  return role === 'coach' || role === 'client' || role === 'admin' ? role : 'guest';
}

/**
 * THE ONE HEADER.
 *
 * Coach, client and admin all mount this component. The role only chooses a
 * configuration object (`appHeaderConfig.ts`); every destination, menu item and
 * quick link comes from that object and nowhere else.
 *
 * SCROLL: transparent at the top, translucent black + blur after 8px, hidden
 * after 120px of downward travel and revealed on the first meaningful upward
 * move. The progress bar is a 2px scaleX transform, not a width, so tracking it
 * never reflows the page.
 */
export function AppHeader({ homeHref }: AppHeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, profile, role: sessionRole } = useSession();
  const { language } = useLanguage();

  const role = navRoleFor(sessionRole);
  const config = headerConfigForRole(role);
  const isLandingPage = pathname === '/';
  const navItems = navItemsForPath(config, pathname);
  const user = profile;
  const resolving = status === 'loading';
  // Guest surfaces stay English even when a Tagalog preference is stored from an
  // earlier session; `dashboardLanguage` is the one rule for that.
  const lang = dashboardLanguage(role, language);
  const tr = (key: string, fallback: string) => translateIn(lang, key, fallback);

  const barRef = useRef<HTMLDivElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { scrolled, hidden } = useHeaderScroll(progressRef);

  const activeItem: HeaderNavItem | undefined = navItems.find((item) =>
    isHeaderNavActive(item, pathname)
  );
  const { containerRef, pillRef, measure, hover } = useSlidingIndicator(activeItem?.id ?? null);

  const closeMenus = useCallback(() => setOpenMenu(null), []);
  const openMenuId = useCallback((id: Exclude<MenuId, null>) => setOpenMenu(id), []);

  const openPalette = useCallback(() => {
    setDrawerOpen(false);
    setOpenMenu(null);
    setPaletteOpen(true);
  }, [setDrawerOpen, setOpenMenu, setPaletteOpen]);

  const openDrawer = useCallback(() => {
    setPaletteOpen(false);
    setOpenMenu(null);
    setDrawerOpen(true);
  }, [setPaletteOpen, setOpenMenu, setDrawerOpen]);

  // Outside-click is measured against the whole bar, so a click on a nav trigger
  // is never mistaken for a click outside the account menu.
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu, closeMenus]);

  // Render-time reset on navigation: never leave a menu hovering over the page
  // the user just asked for, and never wait an effect to dismiss it.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPaletteOpen(false);
    setDrawerOpen(false);
    setOpenMenu(null);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Next keeps recently visited layouts in the document with their parent
      // hidden. A cached header must not answer ⌘K and open a second palette.
      if (!barRef.current || barRef.current.offsetParent === null) return;

      const isPaletteKey =
        (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!isPaletteKey && !isSlash) return;

      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      event.preventDefault();
      openPalette();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openPalette]);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    if (user) {
      try {
        await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
      } catch {
        // Best effort: presence must never strand a session.
      }
    }
    // Clear the welcome-modal flag so the next login always shows a fresh
    // welcome, and a stale flag from an unvisited /home never leaks into the
    // following session.
    try { sessionStorage.removeItem('groove_welcome_pending'); } catch { /* blocked storage */ }
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [user, router]);

  const brandHref = homeHref ?? config.homeHref;
  const hideHeader = hidden && !openMenu && !drawerOpen && !paletteOpen;

  return (
    <>
      <header
        className="hx-header"
        data-variant={isLandingPage ? 'landing' : 'app'}
        data-scrolled={scrolled || undefined}
        data-hidden={hideHeader || undefined}
        data-resolving={resolving || undefined}
      >
        <div ref={barRef} className="hx-header-inner">
          <div className="hx-header-brand">
            <AnimatedLogo
              href={brandHref}
              variant="lockup"
              subtitle="Performing Arts"
              onNavigate={closeMenus}
              className={isLandingPage ? 'hx-logo--landing' : 'hx-logo--header'}
            />
          </div>

          <nav
            ref={containerRef}
            className="hx-header-nav"
            aria-label={tr('drawer.mainNav', 'Main')}
            data-resolving={resolving || undefined}
            onMouseLeave={measure}
          >
            <span aria-hidden="true" ref={pillRef} className="hx-pill" />

            {!resolving &&
              navItems.map((item) =>
                item.dropdown ? (
                  <NavDropdown
                    key={item.id}
                    item={item}
                    items={config.dropdownItems[item.dropdown] ?? []}
                    role={role}
                    pathname={pathname}
                    active={activeItem?.id === item.id}
                    open={openMenu === item.id}
                    onOpen={() => openMenuId(item.id)}
                    onClose={closeMenus}
                    onNavigate={closeMenus}
                    onHover={() => hover(item.id)}
                  />
                ) : (
                  <Link
                    key={item.id}
                    href={item.href ?? '#'}
                    data-nav-id={item.id}
                    data-active={activeItem?.id === item.id || undefined}
                    aria-current={activeItem?.id === item.id ? 'page' : undefined}
                    className={
                      item.href?.startsWith('#') ? 'hx-link hx-link--anchor' : 'hx-link'
                    }
                    onMouseEnter={() => hover(item.id)}
                    onClick={closeMenus}
                  >
                    <item.icon className="hx-link-icon" aria-hidden="true" />
                    {translateSectionLabel(role, language, item.id, item.label)}
                  </Link>
                )
              )}
          </nav>

          <div className="hx-header-actions">
            {resolving ? (
              <HeaderSkeleton />
            ) : user ? (
              <>
                <HeaderSearch
                  onClick={openPalette}
                  open={paletteOpen}
                  label={tr('header.searchLabel', 'Search pages and people')}
                  text={tr('header.search', 'Search')}
                />

                <NotificationDropdown
                  userId={user.id}
                  open={openMenu === 'notifications'}
                  onOpenChange={(next) => (next ? openMenuId('notifications') : closeMenus())}
                />

                <UserMenu
                  role={role}
                  user={user}
                  config={config}
                  pathname={pathname}
                  open={openMenu === 'profile'}
                  onOpen={() => openMenuId('profile')}
                  onClose={closeMenus}
                  onLogout={handleLogout}
                  onNavigate={closeMenus}
                />
              </>
            ) : (
              <div className="hx-auth">
                <Link href="/login" className="hx-auth-link">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>{tr('header.signIn', 'Sign In')}</span>
                </Link>
                <Link href="/register/client" className="hx-auth-link hx-auth-link--primary">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{tr('header.getStarted', 'Get Started')}</span>
                </Link>
              </div>
            )}

            <button
              ref={burgerRef}
              type="button"
              onClick={() => (drawerOpen ? setDrawerOpen(false) : openDrawer())}
              className="hx-burger"
              aria-label={drawerOpen ? tr('header.closeNav', 'Close navigation') : tr('header.openNav', 'Open navigation')}
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              aria-controls="hx-mobile-navigation"
            >
              <span className="hx-burger-box" aria-hidden="true">
                <span className="hx-burger-line" />
                <span className="hx-burger-line" />
                <span className="hx-burger-line" />
              </span>
            </button>
          </div>
        </div>

        <span ref={progressRef} className="hx-progress" aria-hidden="true" />
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        config={config}
        role={role}
        user={user}
        pathname={pathname}
        onLogout={handleLogout}
      />
      <CommandPalette
        open={paletteOpen}
        role={role}
        config={config}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}

function subscribePlatform() {
  return () => {};
}

function isApplePlatform() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function isApplePlatformOnServer() {
  return false;
}

/**
 * Platform-aware shortcut hint.
 *
 * The handler accepts both Ctrl+K and ⌘K, so showing the Mac glyph on Windows
 * was not a broken shortcut — it was a label that did not match the keyboard in
 * front of the user. `useSyncExternalStore` with a server snapshot keeps the
 * first paint 'Ctrl K' (the SSR value) and swaps after hydration without a
 * mismatch warning.
 */
function useIsApplePlatform() {
  return useSyncExternalStore(subscribePlatform, isApplePlatform, isApplePlatformOnServer);
}

function HeaderSearch({
  onClick,
  open,
  label,
  text,
}: {
  onClick: () => void;
  open: boolean;
  label: string;
  text: string;
}) {
  const apple = useIsApplePlatform();
  return (
    <button
      type="button"
      onClick={onClick}
      className="hx-search-btn"
      aria-label={label}
      title={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts={apple ? 'Meta+K' : 'Control+K'}
    >
      <Search className="h-[18px] w-[18px]" aria-hidden="true" />
      <span className="hx-search-text">{text}</span>
      <kbd className="hx-search-kbd" aria-hidden="true">
        {apple ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

function HeaderSkeleton() {
  return (
    <div className="hx-skeleton-actions" aria-hidden="true">
      <span className="hx-skeleton hx-skeleton--icon" />
      <span className="hx-skeleton hx-skeleton--bell" />
      <span className="hx-skeleton hx-skeleton--pill" />
    </div>
  );
}

export default AppHeader;
