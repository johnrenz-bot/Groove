'use client';

import React from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Avatar } from './Avatar';
import { PresenceDot } from '@/features/presence/components/StatusSelect';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect';
import { StatusSelect } from '@/features/presence/components/StatusSelect';
import { SoundToggle } from '@/features/sound/components/SoundToggle';
import { SoundInfoTip } from '@/features/sound/components/SoundInfoTip';
import { ModalIconTile } from '@/components/ui/Modal';
import { greetingFor } from '@/lib/header/accountPill';
import type { Profile } from '@/lib/types';
import { translateAccountItem } from './headerText';
import { isRouteActive } from './routeMatch';
import { useLocationHash } from './useLocationHash';
import type { AppHeaderConfig } from './appHeaderConfig';
import type { NavRole } from './navConfig';

interface AccountPanelProps {
  user: Profile;
  role: NavRole;
  config: AppHeaderConfig;
  pathname: string;
  onLogout: () => Promise<void> | void;
  onNavigate?: () => void;
}

export function AccountPanel({
  user,
  role,
  config,
  pathname,
  onLogout,
  onNavigate,
}: AccountPanelProps) {
  const hour = new Date().getHours();
  const displayName = user.firstname || 'Artist';
  const { language } = useLanguage();
  const hash = useLocationHash();

  /**
   * The account destinations come from the role config, never from this
   * component. They used to be hardcoded to `/profile`, `/settings`,
   * `/preferences` and `/help` — four paths that have never existed in `app/`,
   * so every row in this panel 404'd for both members. The config already
   * carries the role-correct hrefs (and `translateAccountItem` already knows
   * their labels); this panel only had to read them.
   */
  const navItems = config.avatarMenuItems.flatMap((item) => {
    if (!item.href) return [];
    const title = translateAccountItem(role, language, item);
    return [
      {
        id: item.id,
        title,
        subtitle: item.description ?? '',
        href: item.href,
        icon: item.icon,
        active: isRouteActive(item.href, pathname, hash),
      },
    ];
  });

  return (
    <div className="flex flex-col h-full max-h-[85dvh] w-full">
      {/* 1. USER CARD (Fixed Header) */}
      <div className="shrink-0 p-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar user={user} size={48} />
            <div className="absolute -bottom-0.5 -right-0.5">
              <PresenceDot status={user.status} size="sm" />
            </div>
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground whitespace-nowrap">
                {`${user.firstname} ${user.lastname}`.trim()}
              </p>
            </div>
            <p
              className="truncate text-[11px] text-muted-foreground whitespace-nowrap"
              title={user.email || ''}
            >
              {user.email || `#${user.custom_id || '0000'}`}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-soft text-accent-text px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {config.roleLabel}
          </span>
          <p className="text-xs font-medium text-muted-foreground italic">
            {greetingFor(role, displayName, hour)}
          </p>
        </div>
      </div>

      {/* 2 & 3. MIDDLE SECTION (Scrollable) */}
      <div className="flex-1 overflow-y-auto g-scroll p-3 space-y-6">
        {/* Navigation */}
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-muted/50 group min-h-11',
                item.active ? 'bg-muted/30' : ''
              )}
            >
              <ModalIconTile
                icon={item.icon}
                className={cn(
                  'h-8 w-8 shrink-0 border-accent-border',
                  item.active ? 'bg-accent-soft text-accent-text' : 'bg-accent-soft/40 text-accent-text'
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">
                  {item.title}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {item.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Settings */}
        <div className="bg-muted/30 rounded-2xl border border-border overflow-hidden">
          {/* Status Row */}
          <div className="flex items-center justify-between px-3 py-2.5 min-h-11 border-b border-border/50">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <StatusSelect userId={user.id} fallbackStatus={user.status} />
          </div>

          {/* Language Row */}
          <div className="flex items-center justify-between px-3 py-2.5 min-h-11 border-b border-border/50">
            <span className="text-xs font-medium text-muted-foreground">Language</span>
            <LanguageSwitcher />
          </div>

          {/* Appearance Row */}
          <div className="flex items-center justify-between px-3 py-2.5 min-h-11 border-b border-border/50">
            <span className="text-xs font-medium text-muted-foreground">Appearance</span>
            <ThemeModeSelect />
          </div>

          {/* Sound Row */}
          <div className="flex items-center justify-between px-3 py-2.5 min-h-11">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">Sound</span>
                <SoundInfoTip />
              </div>
              <span className="truncate text-[10px] text-muted-foreground/70">
                Audio feedback & alerts
              </span>
            </div>
            <SoundToggle />
          </div>
        </div>
      </div>

      {/* 4. SIGN OUT (Fixed Footer) */}
      <div className="shrink-0 p-3 border-t border-border/50 bg-muted/20">
        <button
          type="button"
          onClick={() => void onLogout()}
          className="flex w-full items-center gap-3 p-2 rounded-xl text-danger hover:bg-danger-soft/30 transition-colors group min-h-11"
        >
          <ModalIconTile
            icon={LogOut}
            className="h-8 w-8 shrink-0 bg-danger-soft text-danger border-danger/30"
          />
          <span className="text-xs font-bold">Sign out</span>
        </button>
      </div>
    </div>
  );
}
