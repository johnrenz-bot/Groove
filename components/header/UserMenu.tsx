'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { PresenceDot } from '@/features/presence/components/StatusSelect';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { ProfileMenuContent } from './ProfileMenuContent';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/components/shared/cn';
import type { Profile } from '@/lib/types';
import type { AppHeaderConfig } from './appHeaderConfig';
import type { NavRole } from './navConfig';
import { Avatar } from './Avatar';

/**
 * The public header's account cluster: avatar trigger + its panel.
 * Used by `<AppHeader />` on the public site — the dashboard moved its
 * profile menu into the sidebar (`<SidebarProfileMenu />`).
 */
export function UserMenu({
  role,
  user,
  config,
  open,
  onOpen,
  onClose,
  onLogout,
  onNavigate,
  pathname = '',
}: {
  role: NavRole;
  user: Profile | null;
  config: AppHeaderConfig;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  onNavigate?: () => void;
  pathname?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const prevPathnameRef = useRef(pathname);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const menuId = useId();

  const myPresence = usePresence(user?.id, user?.status);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Outside-click close: a dedicated wrapper ref holds BOTH the trigger and
  // the panel, so clicks inside never read as "outside". pointerdown fires
  // before click, and the listener is attached in an effect that runs AFTER
  // the opening interaction completes, so the opening click never closes it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (wrapperRef.current && target && !wrapperRef.current.contains(target)) {
        onCloseRef.current();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Route change closes the menu, but only when the pathname actually changed.
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (open) onCloseRef.current();
    }
  }, [pathname, open]);

  // Position the panel so it never overflows the right edge of the viewport.
  const [rightOffset, setRightOffset] = useState(0);

  const positionPanel = React.useCallback(() => {
    const panel = panelRef.current;
    const wrap = triggerRef.current?.parentElement;
    if (!panel || !wrap) return;

    const gutter = 8;
    const right = wrap.getBoundingClientRect().right;
    const width = panel.offsetWidth;
    let next = 0;

    const overflowRight = right - (window.innerWidth - gutter);
    if (overflowRight > 0) next = -overflowRight;

    const leftAfter = right + next - width;
    if (leftAfter < gutter) next += gutter - leftAfter;

    setRightOffset((current) => (Math.abs(current - next) < 1 ? current : next));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    positionPanel();
  }, [open, positionPanel]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', positionPanel);
    return () => window.removeEventListener('resize', positionPanel);
  }, [open, positionPanel]);

  if (!user) return null;

  const displayName = user.firstname || 'Artist';
  const triggerLabel = t('header.openAccountMenu', 'Open account menu');

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${triggerLabel} — ${displayName}`}
        className={cn(
          'group flex h-10 items-center gap-2 rounded-full border border-border bg-card px-1.5 transition-all hover:border-border-strong hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ',
          open && ' border border-border bg-muted/50  '
        )}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xs font-bold text-accent-text">
            <Avatar user={user} size={32} />
          </span>
          <PresenceDot badge status={myPresence} size="sm" />
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:text-foreground',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={t('header.accountTitle', 'Account')}
          className={cn(
            'absolute right-0 top-full z-[100] mt-2 w-[min(360px,calc(100vw-16px))] max-h-[85dvh] overflow-hidden rounded-3xl border border-border/40 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200',
            'flex flex-col'
          )}
          style={{ transform: `translateX(${rightOffset}px)` }}
        >
          <ProfileMenuContent
            role={role}
            user={user}
            config={config}
            onLogout={onLogout}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}

export { Avatar };
export default UserMenu;
