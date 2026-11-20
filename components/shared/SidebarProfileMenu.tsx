'use client';

import React, { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

import { PresenceDot } from '@/features/presence/components/StatusSelect';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { ProfileMenuContent } from '@/components/header/ProfileMenuContent';
import { Avatar } from '@/components/header/Avatar';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import type { AppHeaderConfig } from '@/components/header/appHeaderConfig';
import type { NavRole } from '@/components/header/navConfig';

const MENU_ITEM = '[role="menuitem"]';
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  };
}

/**
 * SIDEBAR PROFILE MENU — the footer trigger and its popover.
 *
 * Trigger: full-width profile card (expanded) or avatar-only (collapsed rail).
 * Popover: rendered in a portal to <body> so it can never be clipped by the
 * sidebar's overflow, anchored above the card (expanded) or beside it (rail),
 * with fade + scale + y animation. 180ms, Esc and outside-click close.
 */
export function SidebarProfileMenu({
  role,
  user,
  config,
  collapsed = false,
  onLogout,
  onNavigate,
  pathname = '',
}: {
  role: NavRole;
  user: Profile;
  config: AppHeaderConfig;
  collapsed?: boolean;
  onLogout: () => Promise<void> | void;
  onNavigate?: () => void;
  pathname?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; bottom: number; width: number } | null>(
    null
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const prevPathnameRef = useRef(pathname);
  const reduceMotion = useReducedMotion();
  const rafRef = useRef<number | null>(null);
  const menuId = useId();

  /* Collapsed rail is a desktop affordance; on mobile/tablet the trigger is
     the full card and the popover spans the drawer width. */
  const isDesktop = useSyncExternalStore(
    subscribeMedia('(min-width: 1024px)'),
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => true
  );
  const railCollapsed = collapsed && isDesktop;

  const myPresence = usePresence(user.id, user.status);
  const { t } = useLanguage();

  const fullName = `${user.firstname} ${user.lastname}`.trim();
  const triggerLabel = t('header.openAccountMenu', 'Open account menu');

  const measure = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (railCollapsed) {
      const width = Math.max(220, Math.min(264, window.innerWidth - rect.right - 10 - 8));
      const left = Math.min(rect.right + 10, window.innerWidth - width - 8);
      setCoords({
        left: Math.max(8, left),
        bottom: window.innerHeight - rect.bottom,
        width,
      });
      return;
    }

    setCoords({
      bottom: window.innerHeight - rect.top + 8,
      left: Math.max(8, rect.left),
      width: Math.min(280, Math.max(240, rect.width)),
    });
  }, [railCollapsed]);

  /* Position on open, keep anchored through scroll/resize. */
  useEffect(() => {
    if (!open) return;
    measure();
    const update = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open, measure]);

  const toggle = () => {
    setOpen((value) => {
      if (!value) measure();
      return !value;
    });
  };

  /* Route change closes the menu. */
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (open) setOpen(false);
    }
  }, [pathname, open]);

  /* Outside-click close — the portal means checking both wrapper and panel. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  /* Esc closes + focus trap (Tab/Shift+Tab cycle within the panel). */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled')
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = panel.contains(active);

      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  /* Focus the first item when the menu opens. */
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(MENU_ITEM)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  /* Arrow-key roving among the account rows. */
  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM) ?? []
    ).filter((el) => !el.hasAttribute('disabled'));
    if (items.length === 0) return;

    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (event.key === 'ArrowDown') next = current === -1 ? 0 : (current + 1) % items.length;
    else if (event.key === 'ArrowUp')
      next = current === -1 ? items.length - 1 : (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    items[next]?.focus();
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const panel =
    open && coords ? (
      <motion.div
        ref={panelRef}
        id={menuId}
        role="menu"
        aria-label={t('header.accountTitle', 'Account')}
        className="dash-spm-panel"
        style={{ bottom: coords.bottom, left: coords.left, width: coords.width }}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onKeyDown={onPanelKeyDown}
      >
        <ProfileMenuContent
          role={role}
          user={user}
          config={config}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />
      </motion.div>
    ) : null;

  return (
    <div ref={wrapperRef} className={cn('dash-profile-root', open && 'is-open')}>
      <button
        ref={triggerRef}
        type="button"
        className="dash-profile"
        data-collapsed={railCollapsed || undefined}
        data-label={fullName}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${triggerLabel} — ${fullName}`}
      >
        <span className="dash-profile-avatar">
          <Avatar user={user} size={36} />
          <PresenceDot badge status={myPresence} size="sm" />
        </span>

        <span className="dash-profile-copy">
          <span className="dash-profile-name">{fullName}</span>
          <span className="dash-profile-role">{config.roleLabel}</span>
        </span>

        <ChevronUp className="dash-profile-chevron" aria-hidden="true" />
      </button>

      {typeof document !== 'undefined'
        ? createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)
        : null}
    </div>
  );
}

export default SidebarProfileMenu;
