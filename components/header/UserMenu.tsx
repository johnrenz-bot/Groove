'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Loader2, LogOut, Sparkles } from 'lucide-react';

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
export { greetingFor };
import type { AppHeaderConfig } from './appHeaderConfig';
import { translateAccountItem } from './headerText';
import type { NavRole } from './navConfig';

/**
 * The account cluster: avatar trigger + its panel.
 *
 * The panel is a dialog, not a menu, because it deliberately mixes destinations
 * (Profile, Settings, Billing, Help) with real controls (status, language,
 * appearance, sound). A `role="menu"` may only contain menu items; a dialog can
 * hold the whole account surface without lying to a screen reader.
 *
 * The destination list comes from `config.avatarMenuItems`; the component does
 * not know which role it is drawing. Only the sign-out action is special because
 * it has a pending state.
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

  // Escape closes and returns focus to the trigger. Outside-click and route
  // changes are the header's job.
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

  /**
   * Keep the panel inside the viewport. The trigger is near the right edge, so
   * the only usual correction is moving the panel left; the negative branch
   * covers a very narrow window where even `right: 0` would overflow.
   *
   * The offset is measured from the WRAPPER, not from the panel's rect: the
   * panel already carries the previous correction as a transform, and rect
   * would include it, so every resize would compound the shift. `offsetWidth`
   * and the wrapper's right edge are the untransformed geometry.
   */
  const positionPanel = React.useCallback(() => {
    const panel = panelRef.current;
    const wrap = triggerRef.current?.parentElement;
    if (!panel || !wrap) return;

    const gutter = 8;
    const right = wrap.getBoundingClientRect().right;
    const width = panel.offsetWidth;
    let next = 0;

    // `right: 0` puts the panel's right edge on the wrapper's. A negative
    // translate moves it back inside the viewport.
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
    // The viewport can change while the panel is open (rotation, window snap,
    // devtools). Re-measure so the correction never becomes stale.
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
      // If the route did not change (a failed sign-out), the button must not stay
      // disabled forever.
      setSigningOut(false);
    }
  };

  const triggerLabel = t('header.openAccountMenu', 'Open account menu');
  const accountItems = config.avatarMenuItems.filter((item) => item.href && !item.action);

  return (
    <div className="hx-account-wrap">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${triggerLabel} — ${displayName}`}
        className="hx-account"
      >
        <span className="hx-avatar-wrap">
          <Avatar user={user} size={34} />
          <span className="hx-presence">
            <PresenceDot status={myPresence} size="sm" />
          </span>
        </span>
        <ChevronDown className="hx-caret" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-label={t('header.accountTitle', 'Account')}
          className="hx-panel hx-panel--account"
          style={{ ['--hx-account-shift' as string]: `${rightOffset}px` }}
        >
          <div className="hx-panel-head">
            <Avatar user={user} size={44} />
            <div className="hx-account-identity">
              <p className="hx-account-fullname">{`${user.firstname} ${user.lastname}`.trim()}</p>
              <p className="hx-account-email">{user.email || `#${user.custom_id || '0000'}`}</p>
              <span className="hx-account-badge">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {config.roleLabel}
              </span>
              <p className="hx-account-greeting">{greetingFor(role, displayName, hour)}</p>
            </div>
          </div>

          <div className="hx-panel-body">
            {accountItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href as string}
                  className="hx-menu-item"
                  onClick={onNavigate}
                  style={{ ['--item-index' as string]: String(index) }}
                >
                  <Icon className="hx-menu-item-icon" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate">
                      {translateAccountItem(role, language, item)}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-subtle-foreground">
                        {item.description}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="hx-account-section">
            <p className="hx-account-section-label">{t('header.preferences', 'Preferences')}</p>
            <div className="hx-account-section-body">
              <StatusSelect userId={user.id} fallbackStatus={user.status} />
            </div>
          </div>

          <div className="hx-account-section">
            <p className="hx-account-section-label">Language / Wika</p>
            <div className="hx-account-section-body">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="hx-account-section">
            <p className="hx-account-section-label">{t('header.appearance', 'Appearance')}</p>
            <div className="hx-account-section-body">
              <ThemeModeSelect />
            </div>
          </div>

          <div className="hx-account-section">
            <div className="mb-1.5 flex items-center gap-1.5 [&>p]:mb-0">
              <p className="hx-account-section-label">{t('header.sound', 'Sound')}</p>
              <SoundInfoTip />
            </div>
            <div className="hx-account-section-body">
              <SoundToggle />
            </div>
          </div>

          <div className="hx-panel-foot">
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              aria-busy={signingOut}
              className="hx-menu-item hx-menu-item--danger"
            >
              {signingOut ? (
                <Loader2 className="hx-menu-item-icon animate-spin" aria-hidden="true" />
              ) : (
                <LogOut className="hx-menu-item-icon" aria-hidden="true" />
              )}
              {signingOut ? t('header.signingOut', 'Signing out…') : t('header.signOut', 'Sign out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar with a real loading state. The initials sit underneath the image, so a
 * slow connection sees a deliberate identity rather than a blank circle, and a
 * failed image simply keeps them.
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
      {status !== 'error' && (
        <Image
          src={user.photo_url as string}
          alt=""
          width={size}
          height={size}
          className="hx-avatar-img"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
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
