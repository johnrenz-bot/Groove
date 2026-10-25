'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Loader2, LogOut, Sparkles, User } from 'lucide-react';

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
import { cn } from '@/components/shared/cn';
import { ModalIconTile } from '@/components/ui/Modal';

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
          'group flex h-10 items-center gap-2 rounded-full border border-border bg-card px-1.5 transition-all hover:border-accent-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'border-accent-border bg-muted/50 ring-1 ring-accent-border'
        )}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xs font-bold text-accent-text">
          <Avatar user={user} size={32} />
          <span className="absolute bottom-0 right-0 scale-75 transform translate-x-1/4 translate-y-1/4">
            <PresenceDot status={myPresence} size="sm" />
          </span>
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
            'absolute right-0 top-full z-[100] mt-2 w-[320px] max-w-[95vw] max-h-[85dvh] overflow-hidden rounded-3xl border border-accent-border bg-card/90 shadow-[0_0_60px_-12px_var(--accent-soft)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-200',
            'flex flex-col'
          )}
          style={{ transform: `translateX(${rightOffset}px)` }}
        >
          <div className="flex flex-col items-center gap-3 p-6 text-center border-b border-border/50 bg-muted/20">
            <div className="relative">
              <Avatar user={user} size={64} />
              <div className="absolute -bottom-1 -right-1">
                <PresenceDot status={myPresence} size="sm" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {`${user.firstname} ${user.lastname}`.trim()}
              </p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {user.email || `#${user.custom_id || '0000'}`}
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent-text text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                {config.roleLabel}
              </span>
              <p className="mt-2 text-xs font-medium text-muted-foreground italic">
                {greetingFor(role, displayName, hour)}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 g-scroll">
            {accountItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href as string}
                  className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
                  onClick={onNavigate}
                >
                  <ModalIconTile
                    icon={Icon}
                    className="h-8 w-8 shrink-0 bg-accent-soft/40 text-accent-text border-accent-border"
                  />
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

            <div className="my-4 space-y-3">
              <div className="px-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                  {t('header.preferences', 'Preferences')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <StatusSelect userId={user.id} fallbackStatus={user.status} />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-medium text-muted-foreground">Language</span>
                    <LanguageSwitcher />
                  </div>
                  <div className="space-y-2 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-medium text-muted-foreground">Appearance</span>
                    <ThemeModeSelect />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
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
          </div>

          <div className="p-3 border-t border-border/50 bg-muted/20">
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              aria-busy={signingOut}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-danger hover:bg-danger-soft/30 transition-colors group"
            >
              <ModalIconTile
                icon={signingOut ? Loader2 : LogOut}
                className={cn(
                  'h-8 w-8 shrink-0 bg-danger-soft text-danger border-danger/30',
                  signingOut && 'animate-spin'
                )}
              />
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
