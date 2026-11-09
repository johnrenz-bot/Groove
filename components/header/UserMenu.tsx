'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Loader2, LogOut, Sparkles, User } from 'lucide-react';

import { getInitials } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { PresenceDot, StatusSelect } from '@/components/shared/StatusSelect';
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { SoundInfoTip } from '@/features/sound/components/SoundInfoTip';
import { SoundToggle } from '@/features/sound/components/SoundToggle';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { LanguageSwitcher } from './LanguageSwitcher';
import { greetingFor } from '@/lib/header/accountPill';
import { translateAccountItem } from './headerText';
import type { AppHeaderConfig } from './appHeaderConfig';
import type { NavRole } from './navConfig';
import { maskEmail, maskGeneric, shouldMask } from '@/lib/masking';
import { cn } from '@/components/shared/cn';

/**
 * The account cluster: avatar trigger + its panel.
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
  const [hour, setHour] = useState(() => new Date().getHours());
  const [rightOffset, setRightOffset] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const menuId = useId();

  const myPresence = usePresence(user?.id, user?.status);
  const { language, t } = useLanguage();

  useEffect(() => {
    const interval = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onLogout();
    } finally {
      setSigningOut(false);
    }
  };

  const triggerLabel = t('header.openAccountMenu', 'Open account menu');
  const accountItems = config.avatarMenuItems.filter((item) => item.href && !item.action);

  return (
    <div className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${triggerLabel} — ${displayName}`}
        className={cn(
          'group flex h-10 items-center gap-2 rounded-full   bg-card px-1.5 transition-all hover: hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ',
          open && ' bg-muted/50  '
        )}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full   bg-card text-xs font-bold text-accent-text">
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
          role="dialog"
          aria-label={t('header.accountTitle', 'Account')}
          className={cn(
            'absolute right-0 top-full z-[100] mt-2 w-[360px] max-w-[95vw] max-h-[85dvh] overflow-hidden rounded-3xl border border-border/40 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200',
            'flex flex-col'
          )}
          style={{ transform: `translateX(${rightOffset}px)` }}
        >
          <div className="relative overflow-hidden border-b border-border/30 bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-6 text-center">
            <div className="relative mx-auto mb-3 h-20 w-20 shrink-0">
              <span className="absolute inset-0 rounded-full bg-accent/20 blur-xl" aria-hidden="true" />
              <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border/60 bg-card shadow-lg">
                <Avatar user={user} size={76} />
              </span>
              <PresenceDot badge status={myPresence} size="sm" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-bold tracking-tight text-foreground">
                {`${user.firstname} ${user.lastname}`.trim()}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email
                  ? maskEmail(user.email)
                  : `#${user.custom_id ? maskGeneric(user.custom_id) : '0000'}`}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {config.roleLabel}
                </span>
              </div>
              <p className="pt-2 text-xs font-medium italic text-muted-foreground">
                {greetingFor(role, displayName, hour)}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 g-scroll">
            <div className="px-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                Account
              </p>
              <div className="space-y-1">
                {accountItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href as string}
                      className="group flex items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-muted/60 hover:translate-x-0.5"
                      onClick={onNavigate}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-accent-text transition-colors group-hover:bg-accent-soft">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-foreground">
                          {translateAccountItem(role, language, item)}
                        </span>
                        {item.description && (
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="px-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                {t('header.preferences', 'Preferences')}
              </p>
              <div className="space-y-1 rounded-2xl bg-muted/20 p-2">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <StatusSelect userId={user.id} fallbackStatus={user.status} />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-medium text-muted-foreground">Language</span>
                  <LanguageSwitcher />
                </div>
                <div className="space-y-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-medium text-muted-foreground">Appearance</span>
                  <ThemeModeSelect />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('header.sound', 'Sound')}
                  </span>
                  <div className="flex items-center gap-2">
                    <SoundInfoTip />
                    <SoundToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3   bg-muted/20 border-t border-border/30">
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              aria-busy={signingOut}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-danger transition-all hover:bg-danger-soft/40 group"
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger transition-colors group-hover:bg-danger/20', signingOut && 'animate-spin')}>
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="text-xs font-bold">
                {signingOut ? t('header.signingOut', 'Signing out…') : t('header.signOut', 'Sign out')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar with a real loading state.
 */
export function Avatar({ user, size = 34 }: { user: Profile; size?: number }) {
  if (!user.photo_url) {
    return (
      <span
        className="hx-avatar"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {getInitials(user.firstname, user.lastname)}
      </span>
    );
  }
  return <AvatarImage key={user.photo_url} user={user} size={size} />;
}

function AvatarImage({ user, size }: { user: Profile; size: number }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <span
      className="hx-avatar-frame"
      data-state={status}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={user.photo_url as string}
        alt=""
        width={size}
        height={size}
        className="hx-avatar-img"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status !== 'loaded' && (
        <>
          <span className="hx-avatar hx-avatar--fallback">
            {getInitials(user.firstname, user.lastname)}
          </span>
          {status === 'loading' && <span className="hx-avatar-shimmer" aria-hidden="true" />}
        </>
      )}
    </span>
  );
}

export default UserMenu;
