'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, LogOut, Sparkles } from 'lucide-react';

import type { Profile } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SoundInfoTip } from '@/features/sound/components/SoundInfoTip';
import { SoundToggle } from '@/features/sound/components/SoundToggle';
import { PresenceSegments } from '@/features/presence/components/PresenceSegments';
import type { AppHeaderConfig } from './appHeaderConfig';
import type { NavRole } from './navConfig';
import { maskEmail, maskGeneric } from '@/lib/masking';
import { translateAccountItem } from './headerText';
import { Avatar } from './Avatar';

/**
 * The account menu's content — shared by the dashboard sidebar popover and the
 * public header's account trigger.
 *
 * Compact by design: a single-line header (40px avatar, name, masked email,
 * role badge), single-line menu rows (icon + label), a small status segment
 * control, and a fixed Sign out footer. Header and footer never scroll; only
 * the menu list does, and it never scrolls horizontally.
 */
export function ProfileMenuContent({
  role,
  user,
  config,
  onLogout,
  onNavigate,
}: {
  role: NavRole;
  user: Profile;
  config: AppHeaderConfig;
  onLogout: () => Promise<void> | void;
  onNavigate?: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const { language, t } = useLanguage();

  const displayName = `${user.firstname} ${user.lastname}`.trim();
  const accountItems = config.avatarMenuItems.filter((item) => item.href && !item.action);

  const masked = user.email
    ? maskEmail(user.email)
    : `#${user.custom_id ? maskGeneric(user.custom_id) : '0000'}`;

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onLogout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      {/* ── Compact header (fixed) ─────────────────────────────────────── */}
      <div className="dash-spm-head">
        <Avatar user={user} size={40} />
        <div className="dash-spm-head-text">
          <p className="dash-spm-name">{displayName}</p>
          <p className="dash-spm-email" title={masked}>
            {masked}
          </p>
          <span className="dash-spm-badge">
            <Sparkles aria-hidden="true" />
            {config.roleLabel}
          </span>
        </div>
      </div>

      {/* ── Menu list (scrolls; header/footer stay fixed) ──────────────── */}
      <div className="dash-spm-list" role="menu" aria-label={t('header.accountTitle', 'Account')}>
        <p className="dash-spm-caption">{t('header.account', 'Account')}</p>
        <div role="group" aria-label={t('header.account', 'Account')}>
          {accountItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href as string}
                role="menuitem"
                className="dash-spm-item"
                onClick={onNavigate}
              >
                <Icon aria-hidden="true" />
                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                  {translateAccountItem(role, language, item)}
                </span>
              </Link>
            );
          })}
        </div>

        <p className="dash-spm-caption" style={{ marginTop: 4 }}>
          {t('header.preferences', 'Preferences')}
        </p>
        <div role="group" aria-label={t('header.preferences', 'Preferences')}>
          <div className="dash-spm-row">
            <span className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
              {t('header.status', 'Status')}
            </span>
            <PresenceSegments userId={user.id} fallbackStatus={user.status} />
          </div>
          <div className="dash-spm-row">
            <span className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
              {t('header.language', 'Language')}
            </span>
            <LanguageSwitcher />
          </div>
          <div className="dash-spm-row">
            <span className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
              {t('header.appearance', 'Appearance')}
            </span>
            <ThemeModeSelect />
          </div>
          <div className="dash-spm-row">
            <span className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
              {t('header.sound', 'Sound')}
            </span>
            <span className="flex flex-none items-center gap-1">
              <SoundInfoTip />
              <SoundToggle />
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer (fixed): Sign out lives here, and only here ──────────── */}
      <div className="dash-spm-foot">
        <button
          type="button"
          role="menuitem"
          className="dash-spm-signout"
          onClick={() => void signOut()}
          disabled={signingOut}
          aria-busy={signingOut}
        >
          {signingOut ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          <span>
            {signingOut ? t('header.signingOut', 'Signing out…') : t('header.signOut', 'Sign out')}
          </span>
        </button>
      </div>
    </>
  );
}

export default ProfileMenuContent;
