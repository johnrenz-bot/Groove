'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, Menu, Search, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { ROLE_META } from '@/components/shared/AppTopNav';
import { AnimatedLogo } from '@/components/header/AnimatedLogo';
import { NavDropdown, isRouteActive } from '@/components/header/NavDropdown';
import { UserMenu } from '@/components/header/UserMenu';
import { MobileDrawer } from '@/components/header/MobileDrawer';
import { CommandPalette } from '@/components/header/CommandPalette';
import { useSlidingIndicator } from '@/components/header/useSlidingIndicator';
import { useSession } from '@/components/header/SessionProvider';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { LANDING_ANCHORS, sectionsForRole } from '@/components/header/navConfig';

type MenuId = 'dashboard' | 'community' | 'about' | 'profile' | 'notifications';

export interface AppHeaderProps {
  role: 'client' | 'coach';
  homeHref?: string;
}

export function AppHeader({ role, homeHref }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, profile, role: sessionRole } = useSession();
  const { t } = useLanguage();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const scrolled = useScrolled();
  const barRef = useRef<HTMLDivElement | null>(null);

  const closeMenus = useCallback(() => setOpenMenu(null), []);
  const openMenuId = useCallback((id: MenuId) => setOpenMenu(id), []);

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) closeMenus();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [openMenu, closeMenus]);

  const user = profile;

  const resolving = status === 'loading';

  const isLanding = pathname === '/';

  const sections = useMemo(
    () => sectionsForRole(role, { hideOnLanding: isLanding }),
    [role, isLanding]
  );

  const activeSectionId = useMemo(
    () =>
      sections.find((section) =>
        section.items
          ? section.items.some((leaf) => isRouteActive(leaf.hrefByRole?.[role] ?? leaf.href, pathname))
          : isRouteActive(section.href ?? '', pathname)
      )?.id ?? null,
    [sections, pathname, role]
  );

  const { containerRef, pillRef } = useSlidingIndicator(activeSectionId);

  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPaletteOpen(false);
    setDrawerOpen(false);
    setOpenMenu(null);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteKey =
        (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!isPaletteKey && !isSlash) return;

      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      event.preventDefault();
      setDrawerOpen(false);
      closeMenus();
      setPaletteOpen(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeMenus]);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    if (user) {
      try {
        await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
      } catch {
        // Ignored deliberately
      }
    }
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [user, router]);

  const brandHref = isLanding
    ? '/'
    : (homeHref ?? ROLE_META[role].homeHref);
  const meta = ROLE_META[role];

  const showAnchors = isLanding && !user && !resolving;

  return (
    <>
      <header className="hx-header" data-scrolled={scrolled || undefined}>
        <div ref={barRef} className="hx-header-inner">
          {/* ---- brand ---- */}
          <div className="hx-header-brand">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="hx-burger"
              aria-label={t('header.openNav', 'Open navigation')}
              aria-expanded={drawerOpen}
            >
              <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            <AnimatedLogo
              href={brandHref}
              subtitle={resolving ? undefined : user ? meta.label : 'Performing Arts'}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>

          {/* ---- navigation ---- */}
          <nav
            ref={containerRef}
            className="hx-header-nav"
            aria-label="Main"
            data-resolving={resolving || undefined}
          >
            <span aria-hidden="true" ref={pillRef} className="hx-pill" />

            {sections.map((section) => (
              <NavDropdown
                key={section.id}
                section={section}
                role={role}
                pathname={pathname}
                active={section.id === activeSectionId}
                open={openMenu === section.id}
                onOpen={() => openMenuId(section.id as MenuId)}
                onClose={closeMenus}
                onNavigate={() => setDrawerOpen(false)}
              />
            ))}

            {showAnchors &&
              LANDING_ANCHORS.map((anchor) => (
                <a key={anchor.id} href={`#${anchor.id}`} className="hx-link hx-link--anchor">
                  {anchor.label}
                </a>
              ))}
          </nav>

          {/* ---- actions ---- */}
          <div className="hx-header-actions">
            {resolving ? (
              <HeaderSkeleton />
            ) : user ? (
              <>
                {/* Search (⌘K) - LANGUAGE SWITCHER REMOVED FROM HERE */}
                <button
                  type="button"
                  onClick={() => {
                    closeMenus();
                    setPaletteOpen(true);
                  }}
                  className="hx-search-btn"
                  aria-label={t('header.searchLabel', 'Search pages and people')}
                  aria-haspopup="dialog"
                  aria-expanded={paletteOpen}
                >
                  <Search className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="hx-search-text">{t('header.search', 'Search')}</span>
                  <kbd className="hx-search-kbd">⌘K</kbd>
                </button>

                <NotificationDropdown
                  userId={user.id}
                  open={openMenu === 'notifications'}
                  onOpenChange={(next) => setOpenMenu(next ? 'notifications' : null)}
                />

                <UserMenu
                  role={role}
                  user={user}
                  open={openMenu === 'profile'}
                  onOpen={() => openMenuId('profile')}
                  onClose={closeMenus}
                  onLogout={handleLogout}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </>
            ) : (
              <div className="hx-auth">
                <Link href="/login" className="hx-auth-link">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>Sign In</span>
                </Link>
                <Link href="/register/client" className="hx-auth-link hx-auth-link--primary">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>Get started</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sections={sections}
        role={role}
        user={user}
        pathname={pathname}
        onLogout={handleLogout}
      />
      <CommandPalette open={paletteOpen} role={role} onClose={() => setPaletteOpen(false)} />
    </>
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

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}

export default AppHeader;