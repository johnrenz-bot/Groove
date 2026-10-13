'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown,
  LogOut,
  Pencil,
  Repeat2,
  Settings2,
  Sparkles,
  User,
} from 'lucide-react';

import { getInitials } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { ROLE_META } from '@/components/shared/AppTopNav';
import { PresenceDot, StatusSelect } from '@/components/shared/StatusSelect';
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect';
import { SoundToggle } from '@/features/sound/components/SoundToggle';
import { usePresence } from '@/features/presence/hooks/usePresence';
import type { NavRole } from './navConfig';

/**
 * Time-of-day greeting. A coach is addressed as "Coach {name}" because that is
 * the role they are performing in this session; a client is greeted as a
 * returning visitor, because for them this is a place they visit rather than a
 * job they log into.
 *
 * Rendered from a ticking hour rather than read once, so a session left open
 * across lunchtime updates itself instead of saying "Good evening" at 11am.
 */
function greetingFor(role: NavRole, firstname: string, hour: number): string {
  if (role === 'coach') {
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, Coach ${firstname}`;
  }
  return `Welcome back, ${firstname}`;
}

/**
 * The account cluster: identity pill + its panel.
 *
 * This is a DIALOG, not a menu, and that is deliberate. `role="menu"` may only
 * contain menu items, and this panel deliberately mixes links, a sign-out
 * button, a status selector and a three-option theme radiogroup — which a menu
 * cannot legally contain. The old header reached the same conclusion; keeping
 * the same reasoning here means the two headers do not disagree with each other
 * about what this panel is for a screen reader.
 */
export function UserMenu({
  role,
  user,
  open,
  onOpen,
  onClose,
  onLogout,
  onNavigate,
}: {
  role: NavRole;
  user: Profile | null;
  /**
   * Open state, decided by `<Header>`.
   *
   * The header holds one value for every surface in the bar. When this panel
   * kept its own, the Community menu and the account menu had no idea the other
   * existed and both stayed on screen at once, overlapping.
   *
   * Outside-click is therefore handled by the header, not here: "outside" has
   * to mean outside the WHOLE bar, otherwise a click on a nav trigger is outside
   * this panel and two handlers race over one click.
   */
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [hour, setHour] = useState(() => new Date().getHours());
  const menuId = useId();

  // Presence is read from the shared realtime store rather than fetched here, so
  // this dot, the status selector below it and every other presence surface in
  // the app all render the same value and update together.
  //
  // Every hook runs before the `if (!user) return null` below. React's rules of
  // hooks do not care that the early return looks harmless: on a render where
  // `user` is briefly null the hook count would change and React would discard
  // the component's state.
  const myPresence = usePresence(user?.id, user?.status);

  useEffect(() => {
    const interval = setInterval(() => setHour(new Date().getHours()), 60000);
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

  if (!user) return null;

  const meta = ROLE_META[role === 'guest' ? 'client' : role];
  const displayName = user.firstname || 'Artist';
  const avatar = user.photo_url;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="hx-account"
      >
        {/* Positioning context for the presence dot. The dot itself is a static
            inline span (`.g-presence-dot`), so without `hx-presence` on the
            wrapper it would sit BESIDE the avatar instead of on its corner —
            which is exactly the overlap this pill used to have. */}
        <span className="hx-avatar-wrap">
          {avatar ? (
            <Image src={avatar} alt="" width={34} height={34} className="hx-avatar-img" />
          ) : (
            <span className="hx-avatar">{getInitials(user.firstname, user.lastname)}</span>
          )}
          <span className="hx-presence">
            <PresenceDot status={myPresence} size="sm" />
          </span>
        </span>
        <span className="hx-account-meta">
          <span className="hx-account-name">{displayName}</span>
          <span className="hx-account-sub">{meta.label}</span>
        </span>
        <ChevronDown className="hx-caret" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="dialog"
          aria-label="Account"
          className="hx-panel hx-panel--account"
        >
          <div className="hx-panel-head">
            {avatar ? (
              <Image src={avatar} alt="" width={40} height={40} className="hx-account-avatar-img" />
            ) : (
              <span className="hx-account-avatar">
                {getInitials(user.firstname, user.lastname)}
              </span>
            )}
            <div className="hx-account-identity">
              <p className="hx-account-fullname">
                {`${user.firstname} ${user.lastname}`.trim()}
              </p>
              <p className="hx-account-email">{user.email || `#${user.custom_id || '0000'}`}</p>
              <span className="hx-account-badge">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {meta.label}
              </span>
              {/* The greeting lives here on desktop, where there is no drawer to
                  put it in, so the role difference is visible at every width. */}
              <p className="hx-account-greeting">
                {greetingFor(role, displayName, hour)}
              </p>
            </div>
          </div>

          <div className="hx-panel-body">
            <Link href={meta.profile} className="hx-menu-item" onClick={onNavigate}>
              <User className="hx-menu-item-icon" aria-hidden="true" />
              Profile
            </Link>
            <Link href={meta.editProfile} className="hx-menu-item" onClick={onNavigate}>
              <Pencil className="hx-menu-item-icon" aria-hidden="true" />
              {meta.editProfileLabel}
            </Link>
            <Link href={meta.settings} className="hx-menu-item" onClick={onNavigate}>
              <Settings2 className="hx-menu-item-icon" aria-hidden="true" />
              Account Settings
            </Link>
            <SwitchRoleItem role={role} onNavigate={onNavigate} />
          </div>

          {/* Status, Appearance and Sound are account-level preferences about how
              this member is reachable and how the app behaves for them — the same
              class of thing as the theme chooser, not a destination. They are
              grouped here rather than in the nav for that reason, and they are
              REPEATED in the drawer because on a phone the drawer is the
              primary surface and this panel is not reachable there. */}
          <div className="hx-account-section">
            <p className="hx-account-section-label">Status</p>
            <div className="hx-account-section-body">
              <StatusSelect userId={user.id} fallbackStatus={user.status} />
            </div>
          </div>

          <div className="hx-account-section">
            <p className="hx-account-section-label">Appearance</p>
            <div className="hx-account-section-body">
              <ThemeModeSelect />
            </div>
          </div>

          <div className="hx-account-section">
            <p className="hx-account-section-label">Sound</p>
            <div className="hx-account-section-body">
              <SoundToggle />
            </div>
          </div>

          <div className="hx-panel-foot">
            <button type="button" onClick={onLogout} className="hx-menu-item hx-menu-item--danger">
              <LogOut className="hx-menu-item-icon" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Switch role" — shown ONLY when switching is genuinely possible.
 *
 * `profiles` carries a single `role` column and the Supabase middleware gates
 * `/coach/*` and `/client/*` on it, so a user cannot actually hold two portals
 * at once by changing a preference in a menu. Making this entry unconditional
 * would mean offering a link that the middleware immediately bounces back, which
 * is worse than not offering it.
 *
 * It therefore renders only when the signed-in user really does have BOTH a
 * `coach_profiles` and a `client_profiles` row — the one signal in the current
 * schema that means they are entitled to both portals. Today registration
 * creates exactly one of the two, so this renders for nobody and costs nothing;
 * it is here so that when dual-profile accounts do exist, the control is already
 * correct rather than needing to be retrofitted.
 *
 * A true switch would additionally need `profiles.role` to be written and the
 * session refreshed — an auth change, deliberately out of scope here.
 */
function SwitchRoleItem({ role, onNavigate }: { role: NavRole; onNavigate?: () => void }) {
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    if (role === 'guest') return;
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser || cancelled) return;
        const [{ count: coachRows }, { count: clientRows }] = await Promise.all([
          supabase
            .from('coach_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('id', authUser.id),
          supabase
            .from('client_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('id', authUser.id),
        ]);
        if (!cancelled) setCanSwitch(Boolean(coachRows && clientRows));
      } catch {
        // A failed capability probe must never surface an error in the header;
        // the entry simply stays hidden, which is the safe default.
        if (!cancelled) setCanSwitch(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (!canSwitch) return null;

  const target = role === 'coach' ? ROLE_META.client : ROLE_META.coach;

  return (
    <Link href={target.path} className="hx-menu-item" onClick={onNavigate}>
      <Repeat2 className="hx-menu-item-icon" aria-hidden="true" />
      Switch to {target.label}
    </Link>
  );
}

export { greetingFor };
export default UserMenu;
