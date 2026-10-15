'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, Menu, Search, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { ROLE_META } from '@/components/shared/AppTopNav';
import { AnimatedLogo } from './AnimatedLogo';
import { NavDropdown, isRouteActive } from './NavDropdown';
import { UserMenu } from './UserMenu';
import { MobileDrawer } from './MobileDrawer';
import { CommandPalette } from './CommandPalette';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useSlidingIndicator } from './useSlidingIndicator';
import { useSession } from './SessionProvider';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { LANDING_ANCHORS, sectionsForRole } from './navConfig';

/**
 * THE SHARED HEADER — one component for every page in the app.
 *
 * IDENTITY COMES FROM ONE PLACE
 *
 *   `<SessionProvider>` in the ROOT layout resolves the session once and every
 *   page reads it from there. This component used to run its own `profiles`
 *   query, which meant two pages could hold two different answers — and the
 *   public pages, which used a separate navbar that queried nothing at all,
 *   reliably answered "guest". Signing in and then opening `/about` looked
 *   exactly like being signed out, while the cookie sat there untouched.
 *
 *   There is now no code path in this component that can produce a guest header
 *   for a signed-in user: guest UI renders only after the provider has resolved
 *   and said there is no session. Before that, the bar shows a skeleton.
 *
 * `role` is NOT a prop. It used to be, passed down from the route group, which
 * meant the header's idea of the user could disagree with the session's. The
 * provider's `profiles.role` is authoritative — the same column the Supabase
 * middleware gates `/coach/*` and `/client/*` on — so the header and the router
 * can never route a user somewhere they are not allowed to be.
 *
 * NOTHING IS REMOVED
 *   Status, Appearance and Sound still live in the account menu AND the drawer;
 *   the Performing Arts PH hub is still linked from Community; the four
 *   discipline pages still appear under Community.
 */
/**
 * Every dismissable surface in the bar, by id.
 *
 * `'about'` is in the union because "About Groove" is a LINK, not a panel — but
 * it shares the identity space, and leaving it out would mean the type could not
 * describe the full set of things the bar can have open.
 */
type MenuId = 'dashboard' | 'community' | 'about' | 'profile' | 'notifications';

export function Header({ homeHref }: { homeHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, profile, role } = useSession();
  const { t } = useLanguage();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /**
   * THE ONE OPEN MENU.
   *
   * Each panel used to own its own `open` boolean. They had no knowledge of each
   * other, so the Community menu and the profile menu could both be open at the
   * same time and simply drew on top of one another — two overlapping panels,
   * with the user having to guess which one a click would land in.
   *
   * One value makes that unrepresentable: opening anything sets it, which closes
   * whatever was open. There is no sequence of clicks that produces two panels,
   * because there is only one field to set.
   */
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const scrolled = useScrolled();
  const barRef = useRef<HTMLDivElement | null>(null);

  const closeMenus = useCallback(() => setOpenMenu(null), []);
  /** Open this one and, by writing the same field, close any other. */
  const openMenuId = useCallback((id: MenuId) => setOpenMenu(id), []);

  /**
   * One outside-click handler for the whole bar, not one per panel.
   *
   * Each panel treating "outside" as "outside ME" meant a click on the profile
   * trigger counted as an outside click for the Community panel: the Community
   * menu would close on `mousedown` and the profile menu would then open on
   * `click`, with the two handlers racing over a single gesture. Anchoring the
   * check to the bar makes "outside" mean outside the bar, which is what a user
   * means by clicking away.
   */
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

  /**
   * THE LANDING PAGE IS A DIFFERENT HEADER, AND IT SAYS SO IN ONE PLACE.
   *
   *   `/` is a single scrolling document for people who have never heard of the
   * app. Community and About Groove are separate ROUTES with their own pages,
   * and dropping a six-item dropdown of them into the top of a one-pager made
   * the marketing page look like the product it is introducing.
   *
   *   The filter is applied to `sections` — the single value the desktop bar,
   * the mobile drawer and the command palette all read — so all three lose those
   * entries on `/` together. Nothing is hidden with CSS: the `NavDropdown` for
   * Community is never mounted, so there is no panel, no hover handler and no
   * open state to accidentally fire.
   *
   *   Everywhere else `isLanding` is false and this is a no-op.
   */
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

  /**
   * Any navigation closes every surface.
   *
   * Implemented as a render-time state reset rather than an effect: a dropdown
   * that survives a route change re-opens over the page the user just asked to
   * see, and doing this in an effect would produce exactly that for one frame.
   * React's documented "adjust state when a prop changes" pattern.
   */
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPaletteOpen(false);
    setDrawerOpen(false);
    setOpenMenu(null);
  }

  /**
   * Cmd/Ctrl+K opens the palette; "/" does too.
   *
   * "/" is kept because the previous header bound it to people search and that
   * shortcut is muscle memory for people who already use this app — the palette
   * includes people results, so the old action still does what it did, just
   * from a surface that also searches pages. Both shortcuts are skipped while
   * the user is typing in a field, otherwise "/" in a search box would reopen
   * the panel the user is standing in.
   */
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
    // Presence flip first: it is best-effort and must not be able to strand the
    // session, so a failure here must not block the sign-out below.
    if (user) {
      try {
        await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
      } catch {
        // Ignored deliberately — see above.
      }
    }
    await supabase.auth.signOut();
    // No token or cookie is cleared on NAVIGATION anywhere in this component —
    // only here, and only on an explicit sign-out.
    router.push('/login');
    router.refresh();
  }, [user, router]);

  // A signed-out visitor has no portal to go "home" to. On the landing page the
  // logo points at the landing page itself, so pressing it returns you to the
  // top of the document you are already reading.
  const brandHref = isLanding
    ? '/'
    : (homeHref ?? (role === 'guest' ? '/' : ROLE_META[role].homeHref));
  const meta = ROLE_META[role === 'guest' ? 'client' : role];

  /**
   * Anchor links, landing page, guests only.
   *
   * For a signed-in visitor on `/` the centre shows the Dashboard dropdown
   * instead — they have an app to get to, and in-page anchors for a marketing
   * page would be noise. So the two cases are mutually exclusive by role, not by
   * CSS, and only one of them ever mounts.
   */
  const showAnchors = isLanding && !user && !resolving;

  return (
    <>
      <header className="hx-header" data-scrolled={scrolled || undefined}>
        {/* The boundary for the single outside-click handler above. */}
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

          {/* ---- navigation ----
              Hidden entirely while resolving: rendering a guest menu and then
              swapping it for a member one is the flash this whole component is
              built to avoid. */}
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

            {/* Plain in-page anchors. Deliberately NOT dropdowns and NOT routed
                links: the landing page is one document, so these jump within it.
                `html { scroll-behavior: smooth }` in globals.css is what makes
                them glide — there is no scroll handler here. */}
            {showAnchors &&
              LANDING_ANCHORS.map((anchor) => (
                <a key={anchor.id} href={`#${anchor.id}`} className="hx-link hx-link--anchor">
                  {anchor.label}
                </a>
              ))}
          </nav>

          {/* ---- actions ----
              The skeleton occupies the SAME width the real cluster will, so
              nothing shifts when the session resolves. */}
          <div className="hx-header-actions">
            {resolving ? (
              <HeaderSkeleton />
            ) : user ? (
              <>
                {/* Dashboard-only language switcher. Guests (landing, public,
                    auth pages) never see it — those pages stay English-only. */}
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={() => {
                    // The palette is a dismissable surface too. Opening it from
                    // the bar while a menu is open must close that menu, or the
                    // menu stays visible over the palette's backdrop.
                    closeMenus();
                    setPaletteOpen(true);
                  }}
                  className="hx-search-btn"
                  aria-label={t('header.searchLabel', 'Search pages and people')}
                  aria-haspopup="dialog"
                  aria-expanded={paletteOpen}
                >                  <Search className="h-[18px] w-[18px]" aria-hidden="true" />
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
              /* Signed out: Community, About Groove and the two auth buttons.
                 No Dashboard — there is nothing in it a visitor can open. */
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

/**
 * The placeholder shown while the session resolves.
 *
 * Its job is to be WRONG-SHAPED in exactly the right way: the same heights and
 * gaps as the real controls, so when the session lands nothing jumps. An
 * indeterminate spinner would be a different width and would cause exactly the
 * layout shift this avoids.
 *
 * `aria-hidden` because it conveys nothing — the bar as a whole is not
 * announced, and a screen-reader user should not be told "loading" and then
 * told the same thing again a moment later.
 */
function HeaderSkeleton() {
  return (
    <div className="hx-skeleton-actions" aria-hidden="true">
      <span className="hx-skeleton hx-skeleton--icon" />
      <span className="hx-skeleton hx-skeleton--bell" />
      <span className="hx-skeleton hx-skeleton--pill" />
    </div>
  );
}

/**
 * Whether the page has scrolled past the top.
 *
 * Drives the header's only scroll-dependent styling: transparent at rest, a
 * hairline plus a blur once content has passed underneath.
 *
 * The listener is throttled to one read per animation frame, because a scroll
 * handler fires orders of magnitude more often than the header can visibly
 * change, and `setState` is only called when the boolean actually flips — so
 * this re-renders the header twice per page rather than hundreds of times.
 *
 * The first read happens in an effect, never in `useState`'s initialiser:
 * `useState(() => window.scrollY > 8)` runs during render, where there is no
 * `window` on the server and a different answer on a client reloading
 * mid-page. That mismatch is exactly what React reports as a hydration error.
 */
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

export default Header;
