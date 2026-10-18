'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, Menu, Search, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AnimatedLogo } from '@/components/header/AnimatedLogo';
import { NavDropdown, isRouteActive } from '@/components/header/NavDropdown';
import { UserMenu } from '@/components/header/UserMenu';
import { MobileDrawer } from '@/components/header/MobileDrawer';
import { CommandPalette } from '@/components/header/CommandPalette';
import { useSlidingIndicator } from '@/components/header/useSlidingIndicator';
import { useSession } from '@/components/header/SessionProvider';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { LANDING_ANCHORS, sectionsForRole, type NavRole } from '@/components/header/navConfig';
import { ROLE_META } from '@/components/header/roleMeta';

/**
 * THE ONE HEADER.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The app shipped FOUR header components:
 *
 *   1. `components/shared/AppHeader.tsx`   client + coach + /community/*
 *   2. `components/header/Header.tsx`       every public page   (a near-verbatim
 *                                           copy of 1, differing mainly in that
 *                                           it rendered a language switcher)
 *   3. `components/shared/AppTopNav.tsx`    admin — 1,100 lines, a different
 *                                           design system (`g-header`, 68px)
 *   4. `components/shared/Navbar.tsx`       /users, /messages, /contracts/[id],
 *                                           /userprofile/[id] — a 2-column
 *                                           header with no nav tree
 *
 * Four copies of one surface is what produced every bug in the brief: two
 * different heights, a language toggle on one route and not another, a client
 * account block that lost its name while the coach's kept it, and a nav that
 * shifted horizontally because each copy sized its own columns differently.
 *
 * Design of record: the header as it appears on `/community/performing-arts/dance`
 * — i.e. implementation 1. Its exact markup and `hx-*` classes are preserved
 * below; only the things the brief asks to fix have changed, and each is marked.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MAY DIFFER BY ROLE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Exactly three things: the nav items, the role line under "Groove", and the
 * contents of the dropdowns. All three come from DATA — `navConfig.ts` and
 * `roleMeta.ts` — never from a different component. Height, container, grid,
 * border, blur, z-index and every control are identical for every role.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT IS NOT MOUNTED IN THE ROOT LAYOUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The brief asks for it to be mounted once so it never remounts at a different
 * width on navigation. That is not possible without also changing what the auth
 * routes render: `/login` and `/register/*` use `AuthLayout`, which draws its own
 * compact brand bar, and several pages pass their own `homeHref` (a public
 * profile's "Dashboard" button goes back to the viewer's own portal, not the
 * viewer's home).
 *
 * What this component DOES guarantee, and what was actually causing the shift:
 *   - the geometry is computed from CSS tokens, not from the content in the bar,
 *     so no amount of nav or account content can change the height;
 *   - the row is a `1fr auto 1fr` grid, so the nav is centred in the CONTAINER
 *     and its first item sits at the same x on every page and for every role;
 *   - the role comes from `useSession()`, never from a prop the caller could
 *     forget, so a page cannot ask for a header that disagrees with the session.
 * Layouts mount it; there is still exactly one implementation.
 */

/** The subset of the session role the header renders for. */
type HeaderRole = Extract<NavRole, 'client' | 'coach' | 'admin' | 'guest'>;

/**
 * Map the resolved session role onto a navigation role.
 *
 * A session that has resolved but carries no profile row is a GUEST as far as
 * the header is concerned: it gets the public menu and the auth buttons, which
 * is exactly what it could see a moment ago. Guessing `client` would offer a
 * menu full of destinations that immediately 404.
 *
 * `'admin'` is carried through unchanged — it is a real role here, not a
 * fallback. It used to be impossible for the session to report admin (the
 * provider collapsed it to `client`), which meant an administrator browsing a
 * public page saw "Client Account" and a client-only menu.
 */
function navRoleFor(sessionRole: string | undefined | null): HeaderRole {
  return sessionRole === 'coach' || sessionRole === 'admin' || sessionRole === 'client'
    ? sessionRole
    : 'guest';
}

type MenuId = 'console' | 'dashboard' | 'community' | 'admin-people' | 'admin-operations' | 'admin-platform' | 'about' | 'profile' | 'notifications';

export interface SiteHeaderProps {
  /**
   * Where the brand logo links to. Omit it and each role gets its own home.
   * `/users`, `/messages`, `/contracts/[id]` and `/userprofile/[id]` pass this,
   * because a public profile is not the signed-in user's home page.
   */
  homeHref?: string;
}

/**
 * THE HEADER'S SINGLE BREAKPOINT, IN ONE PLACE.
 *
 * `min-width: 1024px` is not a new number: it is the value already declared in
 * `globals.css` for `.hx-header-nav { display: flex }` and
 * `.hx-burger { display: none }`. Duplicating it as a literal here would be the
 * second place that decides when navigation collapses, and the two would drift.
 */
const DESKTOP_NAV_QUERY = '(min-width: 1024px)';

/** True while the inline navigation is showing, i.e. the hamburger is not. */
function useDesktopNavigation(): boolean {
  const [desktopNav, setDesktopNav] = useState(true);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DESKTOP_NAV_QUERY);
    const sync = () => setDesktopNav(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return desktopNav;
}

export function SiteHeader({ homeHref }: SiteHeaderProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, profile, role: sessionRole } = useSession();
  const { t } = useLanguage();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /**
   * THE ONE OPEN MENU.
   *
   * Each panel used to own its own `open` boolean, so the Community menu and the
   * account menu could both be open and simply draw on top of one another. One
   * value makes that unrepresentable.
   */
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const scrolled = useScrolled();
  const barRef = useRef<HTMLDivElement | null>(null);

  const closeMenus = useCallback(() => setOpenMenu(null), []);
  /**
   * ONE OPEN SURFACE AT A TIME — INCLUDING THE DRAWER.
   *
   * `openMenu` already made two panels in the bar mutually exclusive, but the
   * drawer was a SEPARATE boolean, so the account dropdown and the mobile
   * navigation could both be open at once: tap the burger with the profile panel
   * open and the panel stayed mounted at z-index 100 while the drawer covered the
   * screen at z-[70], or on a short screen both were visible and competing for
   * the same gesture. Tapping a nav trigger inside the drawer did the same.
   *
   * Rather than add a third state and an effect to reconcile them — which is how
   * they drifted in the first place — the two openers now write both values, so
   * "the drawer is open" and "a panel is open" cannot both be true.
   */
  const openMenuId = useCallback((id: MenuId) => {
    setDrawerOpen(false);
    setOpenMenu(id);
  }, []);
  const openDrawer = useCallback(() => {
    setOpenMenu(null);
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /**
   * IS THE DESKTOP NAVIGATION SHOWING?
   *
   * Same breakpoint the CSS uses, read from the same place: `globals.css` turns
   * `.hx-header-nav` on and `.hx-burger` off at `min-width: 1024px`. One media
   * query, expressed once, is what keeps the JS and the stylesheet from
   * disagreeing about when navigation has collapsed — a second, hand-written
   * `window.innerWidth < N` is exactly how those two drift apart.
   *
   * `useState(true)` rather than a lazy `matchMedia` read on purpose: the server
   * has no `window`, so the first render must produce the same tree it did
   * server-side or React reports a hydration mismatch. The value is corrected in
   * the effect below, one frame later. That one frame cannot open a dropdown —
   * the trigger is a real `<button disabled>` once the effect runs, and a
   * disabled button dispatches no click at all.
   */
  const desktopNav = useDesktopNavigation();

  /**
   * COLLAPSED NAVIGATION CLOSES EVERY PANEL.
   *
   * The requirement is that the hamburger and its sidebar are the only menu while
   * navigation is collapsed. That has two halves: nothing may OPEN the profile
   * panel (handled by disabling the trigger), and nothing already open may
   * REMAIN open — which is the case that is easy to miss, because a user who
   * opens the account panel on a desktop and then rotates their phone keeps a
   * desktop-only menu hanging over a mobile layout.
   *
   * Done as React's documented "adjust state when a value changes during
   * render" rather than in an effect, for two reasons: an effect would render
   * the mobile layout with the panel still mounted for one frame, and the rule
   * that forbids `setState` in an effect is right here — this is not
   * synchronising with an external system, it is deriving state from state. The
   * identical pattern is used a few lines below for `pathname`.
   */
  const [lastDesktopNav, setLastDesktopNav] = useState(desktopNav);
  if (lastDesktopNav !== desktopNav) {
    setLastDesktopNav(desktopNav);
    if (!desktopNav) closeMenus();
  }

  /**
   * One outside-click handler for the whole bar, not one per panel.
   *
   * Each panel treating "outside" as "outside ME" meant a click on the account
   * trigger counted as an outside click for the Community panel: Community would
   * close on `mousedown` and the account menu would then open on `click`, with
   * two handlers racing over a single gesture. Anchoring the check to the bar
   * makes "outside" mean outside the bar.
   */
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu, closeMenus]);

  const user = profile;
  const resolving = status === 'loading';
  const role = navRoleFor(sessionRole);

  /**
   * `/` IS THE PUBLIC LANDING PAGE.
   *
   * An authenticated member asking for `/` is redirected to their own portal —
   * at the edge by `lib/supabase/middleware.ts`, and during SSR by
   * `app/(public)/page.tsx`. The bar still has to render correctly in the frames
   * before that redirect lands (a client-side `router.push('/')` paints first),
   * so the rule below stands: on the landing document the centre of the bar is
   * the four in-page links and nothing else.
   *
   * It used to be `!user` as well, so the moment anyone signed in the anchors
   * vanished and were replaced by the role menu — including, until the session
   * provider learned to report `admin`, a client menu for an administrator.
   *
   * The role menu is dropped on `/` rather than shown alongside. The landing
   * page is a marketing document, not a portal: putting a coach's appointments
   * dropdown or the admin console's three operation groups into its header is
   * the "dashboard navigation leaking onto the public page" this is meant to
   * prevent, and with the admin menu it would also overflow the row at 1024px.
   *
   * Every other route is untouched: the nav there still comes from `role` via
   * `sectionsForRole`, so a client still gets the Dashboard group and a coach
   * theirs.
   */
  const isLanding = pathname === '/';

  const sections = useMemo(
    () =>
      // `hideOnLanding` drops the entries marked "no dropdowns on the marketing
      // page"; the `.filter` drops whatever role sections survive it, so the
      // centre of the bar on `/` belongs to the landing page and nothing else.
      sectionsForRole(role, { hideOnLanding: isLanding }).filter(
        () => !isLanding
      ),
    [role, isLanding]
  );

  /**
   * A section is "current" when the page is its own route OR a descendant of
   * it. The descendant test is what makes `/community/performing-arts/dance`
   * light up "Community" rather than nothing at all.
   */
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
   * A render-time state reset rather than an effect: a dropdown that survives a
   * route change re-opens over the page the user just asked to see, and doing
   * this in an effect would produce exactly that for one frame.
   */
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPaletteOpen(false);
    setDrawerOpen(false);
    setOpenMenu(null);
  }

  /** Cmd/Ctrl+K and "/" open the palette. Skipped while typing in a field. */
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
      // Presence flip first: best-effort, and it must not be able to strand the
      // session, so a failure here must not block the sign-out below.
      try {
        await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
      } catch {
        // Ignored deliberately — see above.
      }
    }
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [user, router]);

  /**
   * The brand destination. A signed-out visitor has no portal to go "home" to,
   * so on the landing page the logo returns to the top of the document they are
   * already reading.
   */
  const brandHref = homeHref ?? (isLanding ? '/' : role === 'guest' ? '/' : ROLE_META[role].homeHref);

  /**
   * The role line under "Groove" — the one place the wordmark carries the
   * session's role. A guest gets the neutral "Performing Arts"; every signed-in
   * role gets its own label, from `ROLE_META`, so it cannot fall out of step
   * with the rest of the app.
   */
  const roleLabel = !user
    ? 'Performing Arts'
    : role === 'guest'
      ? ROLE_META.client.label
      : ROLE_META[role].label;

  /** The landing page centre is the four in-page links. */
  const showAnchors = isLanding && !resolving;

  return (
    <>
      <header className="hx-header" data-scrolled={scrolled || undefined}>
        {/* The boundary for the single outside-click handler above. */}
        <div ref={barRef} className="hx-header-inner">
          {/* ---- brand (left third) ----
              `.hx-header-inner` is a `1fr auto 1fr` grid, so this zone is
              start-aligned inside a track exactly as wide as the nav, and the
              nav lands in the container's true centre no matter how wide this
              brand or the action cluster grows. */}
          <div className="hx-header-brand">
            <button
              type="button"
              onClick={openDrawer}
              className="hx-burger"
              aria-label={t('header.openNav', 'Open navigation')}
              aria-expanded={drawerOpen}
            >
              <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            <AnimatedLogo
              href={brandHref}
              subtitle={resolving ? undefined : roleLabel}
              onNavigate={closeMenus}
            />
          </div>

          {/* ---- navigation (centre track) ----
              Hidden entirely while resolving: rendering a guest menu and then
              swapping it for a member one is the flash this exists to avoid. */}
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
                onNavigate={closeMenus}
              />
            ))}

            {showAnchors &&
              LANDING_ANCHORS.map((anchor) => (
                <a key={anchor.id} href={`#${anchor.id}`} className="hx-link hx-link--anchor">
                  {anchor.label}
                </a>
              ))}
          </nav>

          {/* ---- actions (right third) ----
              EXACTLY THREE THINGS, in this order, for every role:
              Search | Bell | Avatar + Chevron.

              The EN/TL switcher used to sit here as a fourth control. It is gone
              from the bar because it is a preference, not a destination, and a
              preference does not belong at the same level of the hierarchy as the
              controls that navigate. It has NOT been removed from the product:
              it lives in the account panel ("Language / Wika") and in the mobile
              drawer, which are the two places a phone or a signed-in user can
              actually reach it. Nothing about switching language changed. */}
          <div className="hx-header-actions">
            {resolving ? (
              <HeaderSkeleton />
            ) : user ? (
              <>
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
                  onOpenChange={(next) => (next ? openMenuId('notifications') : closeMenus())}
                />

                {/* The account trigger exists ONLY while the inline navigation does.

                    Below the breakpoint the hamburger and its drawer are the one
                    navigation surface, so this subtree is not rendered at all —
                    the avatar and the panel are gone from the DOM rather than
                    present-but-inert. Nothing is left to click, nothing is left
                    to cover the drawer, and there is no disabled control sitting
                    in the bar announcing a menu the user is not allowed to open.

                    The panel closes on the same transition (see the
                    `lastDesktopNav` adjustment above), so a dropdown already
                    open when the viewport narrows is unmounted with the trigger.

                    Language / Wika and every other preference stay reachable on
                    mobile in the drawer — MobileDrawer.tsx — so suppressing the
                    account menu here costs nothing. */}
                {desktopNav && (
                  <UserMenu
                    role={role === 'guest' ? 'client' : role}
                    user={user}
                    open={openMenu === 'profile'}
                    onOpen={() => openMenuId('profile')}
                    onClose={closeMenus}
                    onLogout={handleLogout}
                    onNavigate={closeMenus}
                  />
                )}
              </>
            ) : (
              <div className="hx-auth">
                {/* Theme control for visitors.

                    A guest has no profile menu, so before this the ONLY way to
                    change theme in the app was the "Appearance" control inside
                    the signed-in account dropdown — which a visitor reaching
                    `/`, `/about`, `/users` or any community page cannot open.
                    The preference is persisted by the same ThemeProvider either
                    way, so this is the same toggle in the only place a guest
                    can reach it; it is not a second provider or a second source
                    of truth.

                    Signed-in users keep theirs inside the account dropdown, so
                    this renders only for guests rather than duplicating the
                    control. */}
                <ThemeToggle className="hx-theme-toggle" />
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
        onClose={closeDrawer}
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
 * gaps as the real controls, so when the session lands nothing jumps. It occupies
 * the same three slots the real cluster does — search, bell, account — which is
 * why the bar does not change width for a frame on every page load.
 *
 * `aria-hidden` because it conveys nothing.
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
 * Throttled to one read per animation frame, and `setState` is only called when
 * the boolean actually flips — so this re-renders the header twice per page
 * rather than hundreds of times.
 *
 * The first read happens in an effect, never in `useState`'s initialiser:
 * `useState(() => window.scrollY > 8)` runs during render, where there is no
 * `window` on the server and a different answer on a client reloading mid-page.
 * That mismatch is exactly what React reports as a hydration error.
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

export default SiteHeader;
