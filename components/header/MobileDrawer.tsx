'use client';

import React, { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, LogIn, LogOut, UserPlus } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { PresenceDot, StatusSelect } from '@/components/shared/StatusSelect';
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect';
import { SoundToggle } from '@/features/sound/components/SoundToggle';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { greetingFor } from './UserMenu';
import {
  descriptionFor,
  hrefFor,
  isDropdown,
  labelFor,
  type NavRole,
  type NavSection,
} from './navConfig';

/**
 * The sub-1024px navigation.
 *
 * WHY A DRAWER AND NOT A COLLAPSED BAR
 *   A horizontal menu that scrolls sideways is neither. It hides destinations
 *   behind a gesture most users never try, and the items it does show get
 *   truncated mid-word. Below `lg` there is not enough width for three triggers
 *   and the account cluster, so the destinations move into a sheet — the same
 *   call the previous header made, for the same reason.
 *
 * IDENTITY LEADS
 *   On desktop the account pill carries the name and role. At this width that pill
 *   collapses to an avatar, so without the card at the top of this drawer a phone
 *   user has no idea which account they are signed in as.
 *
 * WHY THE BODY IS A SEPARATE COMPONENT
 *   The drawer must start fully expanded every time it opens. Keeping the
 *   accordion state here would mean writing to it from an effect on the
 *   open transition — a cascading render on every open. `<DrawerBody>` unmounts
 *   when the drawer closes, so its `useState` initializer runs afresh each time
 *   and the reset is free.
 *
 * The Status, Appearance and Sound controls are repeated from the account menu.
 * That panel is not reachable below `lg`, and a control the user has to close one
 * surface to reach is a control they will not find.
 */
export function MobileDrawer({
  open,
  onClose,
  sections,
  role,
  user,
  pathname,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  sections: NavSection[];
  role: NavRole;
  user: Profile | null;
  pathname: string;
  onLogout: () => void;
}) {
  const titleId = useId();

  // Escape, plus a scroll lock so the page behind cannot move under the sheet.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="hx-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="hx-drawer"
      >
        <div className="hx-drawer-head">
          <span id={titleId} className="hx-drawer-title">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="hx-drawer-close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <DrawerBody
          sections={sections}
          role={role}
          user={user}
          pathname={pathname}
          onClose={onClose}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}

function DrawerBody({
  sections,
  role,
  user,
  pathname,
  onClose,
  onLogout,
}: {
  sections: NavSection[];
  role: NavRole;
  user: Profile | null;
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  // Starts fully expanded: a drawer that opens with everything collapsed makes
  // the user tap twice to reach anything. The lazy initializer is enough — this
  // component does not survive a close, so the next open re-runs it.
  const [openIds, setOpenIds] = useState<string[]>(() =>
    sections.filter((section) => isDropdown(section)).map((section) => section.id)
  );

  // Presence is read from the shared realtime store so this dot and the one in
  // the account menu always agree.
  const myPresence = usePresence(user?.id, user?.status);

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="hx-drawer-body g-scroll">
      {user ? (
        <>
          <div className="hx-drawer-identity">
            <span className="hx-drawer-avatar-wrap">
              {user.photo_url ? (
                <Image
                  src={user.photo_url}
                  alt=""
                  width={44}
                  height={44}
                  className="hx-avatar-img"
                />
              ) : (
                <span className="hx-drawer-avatar">{getInitials(user.firstname, user.lastname)}</span>
              )}
              <span className="hx-presence">
                <PresenceDot status={myPresence} size="sm" />
              </span>
            </span>
            <div className="hx-account-identity">
              <p className="hx-account-fullname">{`${user.firstname} ${user.lastname}`.trim()}</p>
              <p className="hx-account-email">{user.email || `#${user.custom_id || '0000'}`}</p>
              <p className="hx-drawer-greeting">
                {greetingFor(role, user.firstname || 'Artist', new Date().getHours())}
              </p>
            </div>
          </div>

          <nav aria-label="Main">
            {sections.map((section) =>
              isDropdown(section) ? (
                <div key={section.id} className="hx-drawer-section">
                  <button
                    type="button"
                    onClick={() => toggle(section.id)}
                    aria-expanded={openIds.includes(section.id)}
                    aria-controls={`hx-drawer-${section.id}`}
                    className="hx-drawer-link hx-drawer-link--toggle"
                  >
                    <section.icon className="hx-drawer-link-icon" aria-hidden="true" />
                    {section.label}
                    <ChevronDown
                      className="hx-caret"
                      data-open={openIds.includes(section.id) || undefined}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    id={`hx-drawer-${section.id}`}
                    hidden={!openIds.includes(section.id)}
                    className="hx-drawer-sub"
                  >
                    {section.heading && <p className="hx-drawer-subheading">{section.heading}</p>}
                    {section.items?.map((item) => {
                      const href = hrefFor(item, role);
                      const description = descriptionFor(item, role);
                      const active = pathname === href.split('#')[0];
                      return (
                        <Link
                          key={item.id}
                          href={href}
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className="hx-drawer-sublink"
                        >
                          <item.icon className="hx-drawer-sublink-icon" aria-hidden="true" />
                          <span>
                            <span className="hx-drawer-sublink-label">{labelFor(item, role)}</span>
                            {description && (
                              <span className="hx-drawer-sublink-desc">{description}</span>
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div key={section.id} className="hx-drawer-section">
                  <Link
                    href={section.href ?? '#'}
                    onClick={onClose}
                    className="hx-drawer-link"
                  >
                    <section.icon className="hx-drawer-link-icon" aria-hidden="true" />
                    {section.label}
                  </Link>
                </div>
              )
            )}
          </nav>

          <div className="hx-drawer-section">
            <p className="hx-drawer-label">Status</p>
            <StatusSelect userId={user.id} fallbackStatus={user.status} />
          </div>
          <div className="hx-drawer-section">
            <p className="hx-drawer-label">Appearance</p>
            <ThemeModeSelect />
          </div>
          <div className="hx-drawer-section">
            <p className="hx-drawer-label">Sound</p>
            <SoundToggle />
          </div>
          <div className="hx-drawer-section">
            <button
              type="button"
              onClick={onLogout}
              className="hx-drawer-link hx-drawer-link--danger"
            >
              <LogOut className="hx-drawer-link-icon" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </>
      ) : (
        <>
          <nav aria-label="Main">
            {sections.map((section) => (
              <div key={section.id} className="hx-drawer-section">
                <Link href={section.href ?? '#'} onClick={onClose} className="hx-drawer-link">
                  <section.icon className="hx-drawer-link-icon" aria-hidden="true" />
                  {section.label}
                </Link>
              </div>
            ))}
          </nav>
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
        </>
      )}
    </div>
  );
}

export default MobileDrawer;
