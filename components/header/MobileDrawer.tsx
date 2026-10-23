'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Loader2, LogIn, LogOut, Search, UserPlus, X } from 'lucide-react';

import type { Profile } from '@/lib/types';
import { PresenceDot, StatusSelect } from '@/components/shared/StatusSelect';
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect';
import { SoundInfoTip } from '@/features/sound/components/SoundInfoTip';
import { SoundToggle } from '@/features/sound/components/SoundToggle';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { greetingFor } from './UserMenu';
import { Avatar } from './UserMenu';
import {
  isHeaderNavActive,
  navItemsForPath,
  type AppHeaderConfig,
  type HeaderDropdownItem,
} from './appHeaderConfig';
import type { NavRole } from './navConfig';
import { useLanguage, translateIn, dashboardLanguage } from '@/lib/i18n/LanguageProvider';
import {
  translateAccountItem,
  translateDropdownItem,
  translateGroup,
  translateSectionLabel,
} from './headerText';
import { isRouteActive } from './routeMatch';
import { useLocationHash } from './useLocationHash';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * The sub-1024px navigation sheet.
 *
 * It is a real dialog: focus is moved in, Tab is trapped, Escape closes, the
 * body behind is locked and focus returns to the control that opened it. The
 * header passes the same role configuration the desktop bar uses, so the sheet
 * cannot list a destination the bar hides.
 */
export function MobileDrawer({
  open,
  onClose,
  config,
  role,
  user,
  pathname,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  config: AppHeaderConfig;
  role: NavRole;
  user: Profile | null;
  pathname: string;
  onLogout: () => Promise<void> | void;
}) {
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const dragStart = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const { language } = useLanguage();
  const lang = dashboardLanguage(role, language);
  const t = (key: string, fallback?: string) => translateIn(lang, key, fallback);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((node) => node.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    // Lenis scrolls the document element, so locking <body> alone is not enough.
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Focus synchronously. A rAF here was delayed whenever the tab was
    // backgrounded, which left focus on the bell behind the open dialog.
    drawerRef.current
      ?.querySelector<HTMLElement>('[data-drawer-autofocus]')
      ?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragStart.current = event.clientX;
    dragXRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const delta = Math.max(0, event.clientX - dragStart.current);
    dragXRef.current = delta;
    setDragX(delta);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (dragXRef.current > 88) onClose();
    else setDragX(0);
    dragXRef.current = 0;
  };

  return (
    <div className="hx-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        ref={drawerRef}
        id="hx-mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="hx-drawer hx-drawer--sheet"
        style={{ translate: dragX ? `${dragX}px 0` : undefined }}
      >
        <div
          ref={headRef}
          className="hx-drawer-head"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-dragging={dragX > 0 || undefined}
        >
          <div className="hx-drawer-head-left">
            <span className="hx-drawer-brand-mark" aria-hidden="true">
              <Image src="/image/Logo/GroovePH-Logo.png" alt="" width={32} height={32} />
            </span>
            <span className="hx-drawer-brand-text">
              <span className="hx-drawer-title" id={titleId}>
                {t('drawer.menu', 'Menu')}
              </span>
              <span className="hx-drawer-subtitle">{config.roleLabel}</span>
            </span>
          </div>
          <button
            ref={(node) => {
              if (node) node.dataset.drawerAutofocus = 'true';
            }}
            type="button"
            onClick={onClose}
            aria-label={t('drawer.closeNav', 'Close navigation')}
            className="hx-drawer-close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="hx-drawer-grabber" aria-hidden="true" />
        </div>

        <DrawerBody
          config={config}
          role={role}
          user={user}
          pathname={pathname}
          onClose={onClose}
          onLogout={onLogout}
          signingOut={signingOut}
          onSignOut={async () => {
            if (signingOut) return;
            setSigningOut(true);
            try {
              await onLogout();
            } finally {
              setSigningOut(false);
            }
          }}
        />
      </div>
    </div>
  );
}

function DrawerBody({
  config,
  role,
  user,
  pathname,
  onClose,
  onSignOut,
  signingOut,
}: {
  config: AppHeaderConfig;
  role: NavRole;
  user: Profile | null;
  pathname: string;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}) {
  const [query, setQuery] = useState('');
  // Sections start closed: the sheet stays scannable, and opening one is an
  // explicit tap rather than arriving with a dozen destinations already poured
  // down the screen. A search query opens every matching section.
  const [openIds, setOpenIds] = useState<string[]>([]);
  const myPresence = usePresence(user?.id, user?.status);
  const { language } = useLanguage();
  const lang = dashboardLanguage(role, language);
  const hash = useLocationHash();
  const t = (key: string, fallback?: string) => translateIn(lang, key, fallback);

  const navItems = navItemsForPath(config, pathname);
  const q = query.trim().toLowerCase();
  const matches = (item: HeaderDropdownItem) => {
    if (!q) return true;
    const text = translateDropdownItem(role, language, item);
    return [text.label, text.description, ...(item.keywords ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  };

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const isOpen = (id: string) => q.length > 0 || openIds.includes(id);

  return (
    <>
      <div className="hx-drawer-search">
        <Search className="hx-drawer-search-icon" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('header.searchNavigation', 'Search navigation…')}
          aria-label={t('drawer.searchNavigation', 'Search navigation')}
          className="hx-drawer-search-input"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('drawer.clearSearch', 'Clear search')}
            className="hx-drawer-search-clear"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="hx-drawer-scroll g-scroll">
        <nav aria-label={t('drawer.mainNav', 'Main')}>
          {navItems.map((navItem, navIndex) => {
            // Direct destinations and dropdown groups render in the same order
            // the desktop bar uses — Dashboard, Community, About — rather than
            // direct links first and groups afterwards.
            if (!navItem.dropdown) {
              const label = translateSectionLabel(role, language, navItem.id, navItem.label);
              if (q && !label.toLowerCase().includes(q)) return null;
              const active = isHeaderNavActive(navItem, pathname);
              return (
                <div
                  key={navItem.id}
                  className="hx-drawer-section"
                  style={{ ['--item-index' as string]: String(navIndex) }}
                >
                  <Link
                    href={navItem.href ?? '#'}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className="hx-drawer-link"
                  >
                    <navItem.icon className="hx-drawer-link-icon" aria-hidden="true" />
                    {label}
                  </Link>
                </div>
              );
            }

            const allItems = config.dropdownItems[navItem.dropdown] ?? [];
            const sectionLabel = translateSectionLabel(role, language, navItem.id, navItem.label);
            // Typing the section name ("community") should reveal the section,
            // not disappear because no individual child label contains it.
            const items = sectionLabel.toLowerCase().includes(q)
              ? allItems
              : allItems.filter(matches);
            if (items.length === 0) return null;
            const expanded = isOpen(navItem.id);
            return (
              <div
                key={navItem.id}
                className="hx-drawer-section"
                style={{ ['--item-index' as string]: String(navIndex) }}
              >
                <button
                  type="button"
                  onClick={() => toggle(navItem.id)}
                  aria-expanded={expanded}
                  aria-controls={`hx-drawer-${navItem.id}`}
                  className="hx-drawer-link hx-drawer-link--toggle"
                >
                  <navItem.icon className="hx-drawer-link-icon" aria-hidden="true" />
                  {sectionLabel}
                  <ChevronDown className="hx-caret" data-open={expanded || undefined} aria-hidden="true" />
                </button>

                <div id={`hx-drawer-${navItem.id}`} hidden={!expanded} className="hx-drawer-sub">
                  {items.map((item, index) => {
                    const text = translateDropdownItem(role, language, item);
                    const group = translateGroup(role, language, item.group);
                    const showGroup =
                      Boolean(item.group) &&
                      (index === 0 || items[index - 1]?.group !== item.group);
                    const active = isRouteActive(item.href, pathname, hash);
                    return (
                      <React.Fragment key={item.id}>
                        {showGroup && <p className="hx-drawer-subheading">{group}</p>}
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className="hx-drawer-sublink"
                          style={{ ['--item-index' as string]: String(index) }}
                        >
                          <item.icon className="hx-drawer-sublink-icon" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="hx-drawer-sublink-label">{text.label}</span>
                            {text.description && (
                              <span className="hx-drawer-sublink-desc">{text.description}</span>
                            )}
                          </span>
                        </Link>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {q &&
            navItems.every((navItem) => {
              const sectionLabel = translateSectionLabel(
                role,
                language,
                navItem.id,
                navItem.label
              );
              if (!navItem.dropdown) return !sectionLabel.toLowerCase().includes(q);
              if (sectionLabel.toLowerCase().includes(q)) return false;
              return (config.dropdownItems[navItem.dropdown] ?? []).filter(matches).length === 0;
            }) && <p className="hx-drawer-empty">No destinations match “{query}”.</p>}
        </nav>
      </div>

      <div className="hx-drawer-foot g-scroll">
        {user ? (
          <>
            <div className="hx-drawer-identity">
              <span className="hx-drawer-avatar-wrap">
                <Avatar user={user} size={44} />
                <span className="hx-presence">
                  <PresenceDot status={myPresence} size="sm" />
                </span>
              </span>
              <div className="hx-account-identity">
                <p className="hx-account-fullname">{`${user.firstname} ${user.lastname}`.trim()}</p>
                <p className="hx-account-email">{user.email || `#${user.custom_id || '0000'}`}</p>
                <span className="hx-account-badge">{config.roleLabel}</span>
                <p className="hx-drawer-greeting">
                  {greetingFor(role, user.firstname || 'Artist', new Date().getHours())}
                </p>
              </div>
            </div>

            <div className="hx-drawer-section">
              {config.avatarMenuItems
                .filter((item) => item.href && !item.action)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={item.href as string}
                    onClick={onClose}
                    className="hx-drawer-link"
                  >
                    <item.icon className="hx-drawer-link-icon" aria-hidden="true" />
                    {translateAccountItem(role, language, item)}
                  </Link>
                ))}
            </div>

            <div className="hx-drawer-section">
              <p className="hx-drawer-label">{t('header.preferences', 'Preferences')}</p>
              <div className="hx-drawer-pref">
                <StatusSelect userId={user.id} fallbackStatus={user.status} />
                <LanguageSwitcher />
                <ThemeModeSelect />
                <div className="flex items-center gap-1.5 px-3 pt-1">
                  <span className="text-xs font-semibold text-foreground">
                    {t('header.sound', 'Sound')}
                  </span>
                  <SoundInfoTip />
                </div>
                <SoundToggle />
              </div>
            </div>

            <div className="hx-drawer-section">
              <button
                type="button"
                onClick={() => void onSignOut()}
                disabled={signingOut}
                aria-busy={signingOut}
                className="hx-drawer-link hx-drawer-link--danger"
              >
                {signingOut ? (
                  <Loader2 className="hx-drawer-link-icon animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="hx-drawer-link-icon" aria-hidden="true" />
                )}
                {signingOut ? t('header.signingOut', 'Signing out…') : t('header.signOut', 'Sign out')}
              </button>
            </div>
          </>
        ) : (
          <div className="hx-drawer-section hx-drawer-auth">
            <Link href="/login" onClick={onClose} className="hx-drawer-auth-link">
              <LogIn className="hx-drawer-link-icon" aria-hidden="true" />
              Log in
            </Link>
            <Link
              href="/register/client"
              onClick={onClose}
              className="hx-drawer-auth-link hx-drawer-auth-link--primary"
            >
              <UserPlus className="hx-drawer-link-icon" aria-hidden="true" />
              Sign up
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export default MobileDrawer;
