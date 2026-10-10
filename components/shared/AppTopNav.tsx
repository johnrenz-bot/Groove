'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NotificationDropdown } from '@/components/shared/NotificationDropdown';
import { useDanceAccess } from '@/features/dance/hooks/useDanceAccess';
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect';
import { SoundToggle } from '@/features/sound/components/SoundToggle';
import { PresenceDot, StatusSelect } from '@/components/shared/StatusSelect';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { Profile } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { useUserSearch, type UserSearchResult } from './useUserSearch';
import { UserSearchResults } from './UserSearchResults';
import type { NavItem, NavGroup } from './navTypes';
import {
  ChevronDown,
  LogOut,
  Menu,
  Pencil,
  Search,
  Settings2,
  Shield,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * THE TOP HEADER — the app's primary navigation for all three roles.
 *
 * This replaces the permanent left rail. Every dashboard page renders this one
 * component, so admin, coach, and client share a single navigation surface and
 * differ only in the menu they pass in.
 *
 * LAYOUT (one row, three zones)
 *
 *   [ brand ]  [ inline links · dropdowns ]  [ search · bell · account ]
 *
 * The three zones are the reason the rail could not simply be rotated onto its
 * side: a horizontal row has one line of vertical space, so secondary
 * navigation has to move into dropdown panels rather than stack.
 *
 * SCROLL
 *   The bar is `position: sticky` and carries NO permanent rule. At the top of a
 *   page it is just controls on the page background; once content has scrolled
 *   underneath it gains a hairline and a soft shadow so it separates from what it
 *   is floating over. A border that is always there asserts a division that
 *   nothing is crossing — the rule earns its place only when something is
 *   passing beneath it.
 *
 * APPEARANCE
 *   The Dark / Light / System chooser lives in the account menu, not in the bar.
 *   Three labelled states need more width than a 2.25rem icon slot, and a header
 *   wide enough to hold them pushes the account menu — the one control that must
 *   never be lost — off the edge of a laptop. It is repeated in the mobile sheet
 *   because that sheet is a phone's primary surface.
 *
 * RESPONSIVE
 *   `xl` and up  — full row: inline links, all dropdowns, the search field, and
 *                  the account cluster, all visible.
 *   `lg`–`xl`    — the search field collapses to an icon button; inline links
 *                  and dropdowns stay.
 *   below `lg`   — brand, burger, and the account cluster only. Every destination
 *                  moves into the mobile sheet, including the ones that were
 *                  inline links on desktop. This is the honest treatment: a
 *                  horizontally scrolling menu bar is neither.
 *
 * SIGN OUT
 *   The rail used to own the sign-out control. It now lives in the account menu,
 *   beside profile and settings, which is where a user looks for it — and the
 *   mobile sheet carries it at the end of the list so the control is reachable
 *   at every width.
 *
 * All behaviour below is preserved from the shell this replaced: the identity
 * lookup, the presence update on sign-out, the greeting, and the notification
 * subscription all still happen here.
 */

export type DashboardRole = 'client' | 'coach' | 'admin';

/**
 * Per-role account menu targets. Kept in one place so the three roles cannot
 * drift, and so the header stays free of role-specific branching.
 *
 * `editProfile` is deliberately shaped per role: for client and coach it is the
 * profile editor, but the administrator has no profile of their own to edit —
 * their identity is a row in the user directory, so the same slot becomes the
 * directory. One menu item, one honest label per role.
 */
export const ROLE_META: Record<
  DashboardRole,
  {
    path: string;
    profile: string;
    editProfile: string;
    editProfileLabel: string;
    settings: string;
    label: string;
    icon: LucideIcon;
    homeHref: string;
  }
> = {
  client: {
    path: '/client/home',
    profile: '/client/profile',
    editProfile: '/client/profile/edit',
    editProfileLabel: 'Edit Profile',
    settings: '/client/settings',
    label: 'Client Account',
    icon: Sparkles,
    homeHref: '/client/home',
  },
  coach: {
    path: '/coach/home',
    profile: '/coach/profile',
    editProfile: '/coach/profile/edit',
    editProfileLabel: 'Edit Profile',
    settings: '/coach/settings',
    label: 'Coach Account',
    icon: Sparkles,
    homeHref: '/coach/home',
  },
  admin: {
    path: '/admin/dashboard',
    profile: '/admin/dashboard',
    editProfile: '/admin/users',
    editProfileLabel: 'User Management',
    settings: '/admin/control',
    label: 'Administrator',
    icon: Shield,
    homeHref: '/admin/dashboard',
  },
};

export interface AppTopNavProps {
  role: DashboardRole;
  /** Inline links — the role's most-used destinations. */
  primary?: NavItem[];
  /** Dropdown triggers — everything secondary. */
  groups?: NavGroup[];
  /** Wordmark subtitle: "Client Portal", "Admin Console". */
  portalLabel?: string;
  /** Where the brand logo links to. Defaults to the role's dashboard. */
  homeHref?: string;
  /** Pre-resolved identity, when the parent layout already has it. */
  user?: Profile | null;
}

/** A route is current when it matches exactly or is an ancestor of the path. */
function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Closes on outside click and on Escape.
 *
 * Every dismissable panel in the header uses this. Escape matters more here than
 * it did in the rail: a dropdown is an overlay that appears without moving the
 * layout, so it can trap a keyboard user's focus with no visible target to click
 * away from.
 */
function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return ref;
}

/**
 * Whether the page is scrolled past the top.
 *
 * Drives the header's only piece of motion-dependent styling: no rule and no
 * shadow at rest, a hairline and a soft shadow once content has passed
 * underneath. A permanent rule is what the previous chrome had, and it is the
 * thing this design is correcting.
 *
 * Implemented as a subscription rather than state-mirroring-on-every-render: the
 * listener is throttled to one read per animation frame because a scroll handler
 * fires far more often than the header can visibly change, and it only calls
 * `setState` when the boolean actually flips, so the header re-renders twice per
 * page (down and back up) rather than hundreds of times.
 *
 * The initial read is in an effect, not in the initial state: `useState(() =>
 * window.scrollY > threshold)` evaluates during render, so the server produced
 * `false` (no `window`) while a client reloading mid-page produced `true`. React
 * then discarded the server markup and the attribute mismatch surfaced as a
 * hydration warning. Seeding `false` makes the first client render identical to
 * the server's, and the mount read below corrects it before the first paint a
 * user can perceive.
 */
function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > threshold);
      });
    };

    // The seeded value is corrected here rather than by calling setScrolled
    // directly in the effect body: a setState in an effect body is a cascading
    // render (react-hooks/set-state-in-effect), whereas this callback already
    // exists to schedule that read off the render pass. It lands within one
    // frame of mount, so a page restored at a deep offset still never shows a
    // perceptible flash of the flat header. Scrolling is read here and in the
    // handler above only -- never during render, which is what keeps SSR and
    // hydration in agreement.
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}

/** Single source of truth for the nav entry the dance filter matches on. */
const DANCE_EVENTS_HREF = '/dance-events';

export function AppTopNav({
  role,
  primary: primaryProp = [],
  groups: groupsProp = [],
  portalLabel,
  homeHref,
  user: propUser,
}: AppTopNavProps) {
  const router = useRouter();
  const isActive = useIsActive();
  const meta = ROLE_META[role];
  const pathname = usePathname();

  /**
   * Dance Events & News is shown only to Dance users and admins.
   *
   * Filtering HERE, at the destructure, is deliberate: `primary` and `groups`
   * are consumed in four places (desktop header, the mobile sheet, the group
   * dropdown and its items), so filtering once at the source covers all of them
   * and cannot be forgotten at a later call site. A group left empty by the
   * filter is dropped rather than rendered as an empty dropdown.
   *
   * This is a CONVENIENCE, not the control. lib/danceAccess.ts gates
   * /api/dance-events and /dance-events server-side, so a user who somehow saw
   * this link anyway would get a redirect and a 403 — never event data.
   */
  const { allowed: danceAllowed } = useDanceAccess();
  const keep = (item: NavItem) => item.href !== DANCE_EVENTS_HREF || danceAllowed;

  const primary = useMemo(() => primaryProp.filter(keep), [primaryProp, danceAllowed]);
  const groups = useMemo(
    () =>
      groupsProp
        .map((g) => ({ ...g, items: g.items.filter(keep) }))
        .filter((g) => g.items.length > 0),
    [groupsProp, danceAllowed]
  );

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScrolled();

  /* Real user search. This used to be a substring filter over the role's own
     navigation, which meant typing a member's name returned nothing — the field
     looked like it searched people and silently only searched pages.
     `useUserSearch` debounces and queries GET /api/users; this component owns
     the presentation and the keyboard handling. */
  const userSearch = useUserSearch();
  // Which result the arrow keys are on. -1 = none highlighted, which is the
  // resting state: Enter should not immediately navigate to an arbitrary row.
  const [activeIndex, setActiveIndex] = useState(-1);
  const setSearchQuery = useCallback(
    (value: string) => {
      userSearch.setQuery(value);
      // Any edit invalidates the highlight — the highlighted row is no longer
      // the best match for the new text.
      setActiveIndex(-1);
    },
    [userSearch]
  );

  // The resolved identity. When the parent layout already resolved the profile
  // it arrives as `propUser`; otherwise it is fetched once on mount.
  //
  // `propUser` is applied during render rather than copied into state by an
  // effect: a state copy of a prop is a second source of truth that lags a
  // parent re-render by a frame, and copying it in an effect is a cascading
  // render for no benefit.
  const [fetchedUser, setFetchedUser] = useState<Profile | null>(null);
  const user = propUser ?? fetchedUser;

  // Presence is not local state. It is read from the shared realtime store, so
  // the dot on this trigger, the selector in the panel, and every other presence
  // surface in the app all render the same value and update together.
  //
  // Admins have no presence to advertise — their availability is not what a
  // member books or messages against — so the control is omitted for that role
  // rather than shown disabled.
  const canSetPresence = role === 'coach' || role === 'client';
  const myPresence = usePresence(user?.id, user?.status);

  useEffect(() => {
    // A parent-supplied identity is authoritative; never spend a session lookup
    // on a page that already knows who it is rendering for.
    if (propUser) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser || cancelled) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (data && !cancelled) setFetchedUser(data as Profile);
    })();
    return () => {
      cancelled = true;
    };
  }, [propUser]);

  // The greeting is the current hour, so it is derived at render and only the
  // "tick" is state: an effect that calls setGreeting() synchronously on mount
  // would paint "Welcome" for one frame before correcting itself.
  const greetingFor = (hour: number) =>
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [hourTick, setHourTick] = useState(() => new Date().getHours());
  const greeting = greetingFor(hourTick);

  useEffect(() => {
    // Re-read the hour each minute so a session left open across a boundary
    // updates itself. The interval is a subscription to time passing, not a
    // state mirror, so setting state in the callback is correct here.
    const interval = setInterval(() => setHourTick(new Date().getHours()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Any navigation closes every panel. Without this a dropdown survives a route
  // change and re-opens over the page the user just asked to see.
  //
  // Implemented as render-time state adjustment rather than an effect: React's
  // documented pattern for "reset state when a prop changes". Storing the
  // pathname alongside the panel state and clearing during render avoids both
  // the cascading render of an effect and the one-frame flash of a dropdown
  // re-appearing over the new page.
  const [panelPath, setPanelPath] = useState(pathname);
  if (panelPath !== pathname) {
    setPanelPath(pathname);
    setOpenGroup(null);
    setAccountOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
  }

  // The mobile sheet is a full-height overlay, so it owns Escape the same way a
  // dropdown does, plus a scroll lock so the page behind cannot move under it.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    // Presence flip first: the row update is best-effort and must not be able to
    // strand the session, so a failure here must not block the sign-out below.
    if (user) {
      try {
        await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
      } catch {
        // Ignored deliberately — see above.
      }
    }
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  /** Only one panel at a time: opening any of them closes the others. */
  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => (prev === label ? null : label));
    setAccountOpen(false);
    setSearchOpen(false);
  };

  const accountRef = useDismiss(accountOpen, () => setAccountOpen(false));
  // Auto-focus on expand. Runs on the `searchOpen` transition only -- focusing on
  // every render would steal focus back the instant the user clicked a result.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Collapse clears the query AND the results, so a later open starts blank
  // instead of showing a stale list the user has to clear by hand. It also
  // cancels any in-flight request — closing the panel should stop the work.
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setActiveIndex(-1);
    userSearch.reset();
  }, [userSearch]);

  const searchRef = useDismiss(searchOpen, closeSearch);

  /**
   * The group dropdowns need the same outside-click and Escape dismissal the
   * account and search panels already had. They were missing it: `useDismiss`
   * was only ever called for `accountRef` and `searchRef`, so a group panel
   * opened by its trigger could be closed only by clicking the trigger again or
   * by navigating. Escape silently did nothing, and a keyboard or screen-reader
   * user had no way out of an open menu.
   *
   * `firstGroupRef` spans every trigger rather than one panel, so an outside
   * click on a *different* trigger is not treated as an outside click — that is
   * what lets `toggleGroup` switch directly between two open menus.
   */
  const firstGroupRef = useRef<HTMLDivElement>(null);
  useDismiss(openGroup !== null, () => setOpenGroup(null));

  // The search button advertises "/" on its face, so "/" has to work. Bound at
  // the document rather than the button, and skipped whenever the keystroke is
  // already going into a field — typing a slash in the search box must not
  // reopen the panel the user is standing in.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      event.preventDefault();
      setOpenGroup(null);
      setAccountOpen(false);
      userSearch.reset();
      setActiveIndex(-1);
      setSearchOpen(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // `userSearch.reset` is stable (useCallback with no deps); re-subscribing on
    // every query change would drop the listener mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brandHref = homeHref ?? meta.homeHref;
  const displayName = user?.firstname || (role === 'coach' ? 'Coach' : 'Artist');

  /** Go to a search result's public profile. */
  const goToUser = useCallback(
    (user: UserSearchResult) => {
      closeSearch();
      router.push(`/userprofile/${user.id}`);
    },
    [closeSearch, router]
  );

  /**
   * Keyboard handling for the result list.
   *
   * Uses `aria-activedescendant` rather than moving DOM focus: the focus stays on
   * the input, so typing continues uninterrupted while the highlight moves. That
   * is the pattern a combobox/listbox pair requires — moving focus into the list
   * would make every subsequent keystroke land in the wrong element.
   */
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const count = userSearch.results.length;

    switch (e.key) {
      case 'Escape':
        // Stop the panel-level Escape handler from also firing, so one press
        // closes the search once rather than twice.
        e.stopPropagation();
        closeSearch();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (count > 0) setActiveIndex((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (count > 0) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case 'Home':
        if (count > 0) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (count > 0) {
          e.preventDefault();
          setActiveIndex(count - 1);
        }
        break;
      case 'Enter': {
        // Prefer the highlighted row; fall back to the first result so Enter is
        // useful without having to arrow down first.
        const target =
          activeIndex >= 0 && activeIndex < count
            ? userSearch.results[activeIndex]
            : userSearch.results[0];
        if (target) {
          e.preventDefault();
          goToUser(target);
        }
        break;
      }
    }
  };

  const activeOptionId =
    activeIndex >= 0 && activeIndex < userSearch.results.length
      ? `header-usearch-option-${activeIndex}`
      : undefined;

  return (
    // `data-scrolled` is the whole scroll affordance. At rest the header has no
    // rule and no shadow and the page background runs straight through it; once
    // content passes underneath it gains both, so the bar separates from the
    // content without ever drawing a permanent line at rest.
    <header className="g-header" data-scrolled={scrolled || undefined}>
      <div className="g-header-inner">
        {/* ---- Zone 1: brand ---- */}
        <div className="g-header-brand">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="g-header-burger"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>

          <Link href={brandHref} className="g-header-logo" aria-label={`Groove — ${portalLabel ?? meta.label}`}>
            <span className="g-header-mark">
              <Image
                src="/image/wc/logo.png"
                alt=""
                width={22}
                height={22}
                className="h-[22px] w-[22px] object-contain"
              />
            </span>
            <span className="g-header-wordmark">
              <span className="g-header-name">Groove</span>
              {portalLabel && <span className="g-header-role">{portalLabel}</span>}
            </span>
          </Link>
        </div>

        {/* ---- Zone 2: primary links + dropdown triggers ---- */}
        <nav className="g-header-nav" aria-label={`${portalLabel ?? meta.label} navigation`}>
          {primary.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                className="g-header-link"
              >
                {item.label}
              </Link>
            );
          })}

          {groups.map((group) => {
            const open = openGroup === group.label;
            // A trigger is "current" when any destination inside it is the page
            // being viewed, so the user can tell which section they are in.
            const inSection = group.items.some((item) => isActive(item.href));
            const GroupIcon = group.icon;
            return (
              <div
                key={group.label}
                className="relative"
                ref={group === groups[0] ? firstGroupRef : undefined}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  data-active={inSection || undefined}
                  aria-expanded={open}
                  aria-haspopup="menu"
                  className="g-header-link g-header-trigger"
                >
                  {GroupIcon && <GroupIcon className="g-header-trigger-icon" aria-hidden="true" />}
                  {group.label}
                  <ChevronDown className="g-header-caret" aria-hidden="true" />
                </button>

                {open && <NavDropdownPanel group={group} isActive={isActive} onPick={() => setOpenGroup(null)} />}
              </div>
            );
          })}
        </nav>

        {/* ---- Zone 3: actions ---- */}
        <div className="g-header-actions">
          {/* Search. A real destination filter rather than a decorative field:
              it searches the role's own navigation, so it is useful without a
              backend and cannot return results the user cannot reach.

              ONE element, two states. Collapsed it is a 2.25rem icon button, the
              same hit target as the bell and the theme toggle. Clicking expands
              that same node into a field rather than swapping in a separate
              panel behind a separate button — two controls for one action is how
              they drift apart. The `/` shortcut opens it identically. */}
          <div className="relative" ref={searchRef}>
            <div className="g-hsearch" data-open={searchOpen}>
              <button
                type="button"
                onClick={() => {
                  if (searchOpen) {
                    closeSearch();
                  } else {
                    setSearchOpen(true);
                    setAccountOpen(false);
                    setOpenGroup(null);
                  }
                }}
                aria-label={searchOpen ? 'Close search' : 'Search coaches and clients'}
                aria-expanded={searchOpen}
                className="inline-flex flex-shrink-0 cursor-pointer items-center justify-center"
              >
                <Search className="g-hsearch-icon" aria-hidden="true" />
              </button>

              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                value={userSearch.query}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                autoComplete="off"
                spellCheck={false}
                // Only meaningful while open; while collapsed the input is taken
                // out of the tab order and the accessibility tree by CSS.
                tabIndex={searchOpen ? 0 : -1}
                aria-hidden={!searchOpen}
                aria-label="Search coaches and clients"
                aria-expanded={searchOpen}
                aria-controls="header-usearch-list"
                aria-autocomplete="list"
                aria-activedescendant={activeOptionId}
                placeholder="Search coaches & clients…"
                className="g-hsearch-input"
              />

              {searchOpen && userSearch.query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="g-hsearch-clear"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {searchOpen && (
              <div className="g-hsearch-results" role="presentation">
                <UserSearchResults
                  results={userSearch.results}
                  status={userSearch.status}
                  error={userSearch.error}
                  query={userSearch.query}
                  isSearchable={userSearch.isSearchable}
                  activeIndex={activeIndex}
                  onActiveIndexChange={setActiveIndex}
                  onNavigate={goToUser}
                  idPrefix="header-usearch"
                />
              </div>
            )}
          </div>

          {user && <NotificationDropdown userId={user.id} />}

          {/* Account menu: identity, the role's account destinations, appearance,
              sign out. The theme selector lives here rather than in the bar — a
              three-state chooser needs a labelled group, and a header wide enough
              to hold one loses the account menu on a laptop, which is the one
              control a user must never have to hunt for. */}
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => {
                setAccountOpen((v) => !v);
                setOpenGroup(null);
                setSearchOpen(false);
              }}
              className="g-header-account"
              aria-label="Account menu"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              {/* The wrapper is the positioning context for the absolutely-placed presence
                  badge; the avatar itself is unchanged for admins, who simply get
                  no badge. */}
              <span className="g-header-avatar-wrap">
                {user?.photo_url ? (
                  <Image
                    src={user.photo_url}
                    alt=""
                    width={34}
                    height={34}
                    className="g-header-avatar-img"
                  />
                ) : (
                  <span className="g-header-avatar">
                    {getInitials(user?.firstname || 'U', user?.lastname || 'A')}
                  </span>
                )}
                {canSetPresence && user && <PresenceDot status={myPresence} size="sm" />}
              </span>
              <span className="g-header-account-meta">
                <span className="g-header-account-name">{displayName}</span>
                <span className="g-header-account-sub">{meta.label}</span>
              </span>
              <ChevronDown className="g-header-caret" aria-hidden="true" />
            </button>

            {accountOpen && (
              // A dialog, not a menu. `role="menu"` may only contain menu items,
              // and this panel deliberately mixes links, a button, and a
              // three-option radiogroup — which a menu cannot legally contain.
              // A labelled dialog is the honest role for a mixed popover, and
              // `useDismiss` already gives it Escape-to-close.
              <div className="g-panel g-panel-account" role="dialog" aria-label="Account">
                <div className="g-panel-head g-account-head">
                  {user?.photo_url ? (
                    <Image
                      src={user.photo_url}
                      alt=""
                      width={40}
                      height={40}
                      className="g-account-avatar-img"
                    />
                  ) : (
                    <span className="g-account-avatar">
                      {getInitials(user?.firstname || 'U', user?.lastname || 'A')}
                    </span>
                  )}
                  <div className="g-account-identity">
                    <p className="g-panel-head-name">
                      {user ? `${user.firstname} ${user.lastname}` : 'Groove User'}
                    </p>
                    <p className="g-panel-head-sub">
                      {user?.email || `#${user?.custom_id || '0000'}`}
                    </p>
                    <span className="g-panel-badge">
                      {React.createElement(meta.icon, { className: 'h-3 w-3', 'aria-hidden': true })}
                      {meta.label}
                    </span>
                  </div>
                </div>

                <div className="g-panel-body">
                  <Link href={meta.profile} className="g-menu-item">
                    <User className="g-menu-item-icon" aria-hidden="true" />
                    Profile
                  </Link>
                  <Link href={meta.editProfile} className="g-menu-item">
                    <Pencil className="g-menu-item-icon" aria-hidden="true" />
                    {meta.editProfileLabel}
                  </Link>
                  <Link href={meta.settings} className="g-menu-item">
                    <Settings2 className="g-menu-item-icon" aria-hidden="true" />
                    Account Settings
                  </Link>
                </div>

                {/* Presence, directly above Appearance: it is an account-level
                    preference about how the member is reachable, which is the
                    same class of thing as the theme chooser rather than a
                    navigation destination. */}
                {canSetPresence && user && (
                  <div className="g-account-section">
                    <p className="g-account-section-label">Status</p>
                    <div className="g-account-section-body">
                      <StatusSelect userId={user.id} fallbackStatus={user.status} />
                    </div>
                  </div>
                )}

                {/* Appearance. The one control that used to sit loose in the
                    bar, now grouped with the other account-level preferences. */}
                <div className="g-account-section">
                  <p className="g-account-section-label">Appearance</p>
                  <div className="g-account-section-body">
                    <ThemeModeSelect />
                  </div>
                </div>

                {/* Click sounds. Same account-level preference as the theme: a
                    device setting, not a navigation destination, so it belongs
                    in this group rather than in the nav. */}
                <div className="g-account-section">
                  <p className="g-account-section-label">Sound</p>
                  <div className="g-account-section-body">
                    <SoundToggle />
                  </div>
                </div>

                <div className="g-panel-foot">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="g-menu-item g-menu-item-danger"
                  >
                    <LogOut className="g-menu-item-icon" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Mobile sheet ---- */}
      {mobileOpen && (
        <div className="g-sheet-backdrop" role="presentation" onClick={() => setMobileOpen(false)}>
          <div
            className="g-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="g-sheet-head">
              <span className="g-sheet-title">Menu</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="g-header-burger"
                aria-label="Close navigation"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="g-sheet-body g-scroll">
              {/* Identity leads. On desktop the account trigger carries the
                  name and role; below `lg` that trigger collapses to an avatar,
                  so the sheet has to reintroduce the context or a phone user
                  has no idea who they are signed in as. */}
              <div className="g-sheet-identity">
                <span className="g-account-avatar">
                  {getInitials(user?.firstname || 'U', user?.lastname || 'A')}
                </span>
                <div className="g-account-identity">
                  <p className="g-panel-head-name">
                    {user ? `${user.firstname} ${user.lastname}` : 'Groove User'}
                  </p>
                  <p className="g-panel-head-sub">
                    {user?.email || `#${user?.custom_id || '0000'}`}
                  </p>
                  <span className="g-panel-badge">
                    {React.createElement(meta.icon, { className: 'h-3 w-3', 'aria-hidden': true })}
                    {meta.label}
                  </span>
                </div>
              </div>

              {/* The greeting follows the identity because it is the one piece
                  of context the inline nav used to carry. */}
              <p className="g-sheet-greeting">
                {greeting}, <strong>{displayName}</strong>
              </p>

              <div className="g-sheet-section">
                {primary.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      data-active={active || undefined}
                      className="g-sheet-link"
                    >
                      <Icon className="g-sheet-link-icon" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {groups.map((group) => (
                <div key={group.label} className="g-sheet-section">
                  <p className="g-sheet-label">{group.label}</p>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        data-active={active || undefined}
                        className="g-sheet-link"
                      >
                        <Icon className="g-sheet-link-icon" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* The account destinations and the appearance chooser are repeated
                at the end of the sheet. They are already in the account
                dropdown, which stays reachable below `lg`, but the sheet is the
                primary navigation surface on a phone — a control the user has
                to close one panel to reach is a control they will not find. */}
            <div className="g-sheet-section">
              <p className="g-sheet-label">Account</p>
              <Link
                href={meta.profile}
                aria-current={isActive(meta.profile) ? 'page' : undefined}
                data-active={isActive(meta.profile) || undefined}
                className="g-sheet-link"
              >
                <User className="g-sheet-link-icon" aria-hidden="true" />
                Profile
              </Link>
              <Link
                href={meta.editProfile}
                aria-current={isActive(meta.editProfile) ? 'page' : undefined}
                data-active={isActive(meta.editProfile) || undefined}
                className="g-sheet-link"
              >
                <Pencil className="g-sheet-link-icon" aria-hidden="true" />
                {meta.editProfileLabel}
              </Link>
              <Link
                href={meta.settings}
                aria-current={isActive(meta.settings) ? 'page' : undefined}
                data-active={isActive(meta.settings) || undefined}
                className="g-sheet-link"
              >
                <Settings2 className="g-sheet-link-icon" aria-hidden="true" />
                Account Settings
              </Link>
            </div>

            {/* Repeated in the sheet because that sheet is a phone's primary surface —
                    the account menu is not reachable at that width. */}
            {canSetPresence && user && (
              <div className="g-sheet-section">
                <p className="g-sheet-label">Status</p>
                <StatusSelect userId={user.id} fallbackStatus={user.status} />
              </div>
            )}

            <div className="g-sheet-section">
              <p className="g-sheet-label">Appearance</p>
              <ThemeModeSelect />
            </div>

            {/* Repeated in the sheet because that sheet is a phone's primary
                surface — the account menu is not reachable at that width. */}
            <div className="g-sheet-section">
              <p className="g-sheet-label">Sound</p>
              <SoundToggle />
            </div>

            {/* Sign out lives at the end of the sheet, where the rail used to
                put it: the last item of the list, never a pinned footer. */}
            <div className="g-sheet-foot">
              <button type="button" onClick={handleLogout} className="g-sheet-link g-sheet-link--danger">
                <LogOut className="g-sheet-link-icon" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** One dropdown panel. Extracted so the header body stays about layout. */
function NavDropdownPanel({
  group,
  isActive,
  onPick,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
  onPick: () => void;
}) {
  return (
    <div className="g-panel" role="menu">
      <div className="g-panel-body">
        {group.items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              aria-current={active ? 'page' : undefined}
              data-active={active || undefined}
              onClick={onPick}
              className="g-panel-item"
            >
              <span className="g-panel-item-icon" aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <span className="g-panel-item-text">
                <span className="g-panel-item-label">{item.label}</span>
                {item.description && (
                  <span className="g-panel-item-desc">{item.description}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default AppTopNav;