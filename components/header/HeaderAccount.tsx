'use client';

/**
 * The single account control for every header.
 *
 * Trigger: the member's real avatar, display name and a rotating chevron.
 * Panel: a compact floating menu with a profile header (image, name, role and
 * verification state), the four account destinations, a divider and sign out.
 * No duplicate profile card is mounted anywhere else in the shell.
 */

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  LifeBuoy,
  LogOut,
  Settings2,
  UserRound,
} from 'lucide-react';

import { Avatar } from '@/components/header/Avatar';
import { ROLE_META } from '@/components/header/roleMeta';
import type { AppHeaderConfig } from '@/components/header/appHeaderConfig';
import type { NavRole } from '@/components/header/navConfig';
import type { Profile } from '@/lib/types';

export function HeaderAccount({
  role,
  user,
  config,
  open,
  onOpenChange,
  onLogout,
}: {
  role: NavRole;
  user: Profile;
  config: AppHeaderConfig;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onLogout: () => Promise<void> | void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const fullName = `${user.firstname} ${user.lastname}`.trim() || user.firstname || 'Account';
  const shortName = user.firstname || fullName;
  const verified = Boolean(user.account_verified);

  const hrefOf = (id: string) => config.avatarMenuItems.find((item) => item.id === id)?.href;
  const meta = ROLE_META[role as keyof typeof ROLE_META];
  const profileHref = hrefOf('profile') ?? meta?.profile ?? config.homeHref;
  const settingsHref = hrefOf('settings') ?? meta?.settings ?? config.homeHref;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [open, onOpenChange]);

  const menuItems = [
    { id: 'profile', label: 'My Profile', href: profileHref, icon: UserRound },
    { id: 'settings', label: 'Account Settings', href: settingsHref, icon: Settings2 },
    { id: 'help', label: 'Help & FAQ', href: '/faq', icon: CircleHelp },
    { id: 'support', label: 'Contact Support', href: '/support', icon: LifeBuoy },
  ];

  return (
    <div className="nav-account" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className="nav-account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${fullName}`}
        onClick={() => onOpenChange(!open)}
      >
        <span className="nav-account-avatar">
          <Avatar user={user} size={30} />
        </span>
        <span className="nav-account-name">{shortName}</span>
        <ChevronDown className="nav-account-chevron" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            className="nav-account-panel inverted-shell"
            role="menu"
            aria-label="Account menu"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
          <div className="nav-account-header">
            <Avatar user={user} size={44} />
            <div className="nav-account-identity">
              <p className="nav-account-fullname">{fullName}</p>
              <p className="nav-account-role">{config.roleLabel}</p>
              <p className={`nav-account-status ${verified ? 'is-verified' : ''}`}>
                {verified ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <Clock3 aria-hidden="true" />
                )}
                <span>{verified ? 'Verified account' : 'Verification pending'}</span>
              </p>
            </div>
          </div>

          <div className="nav-account-list">
            {menuItems.map(({ id, label, href, icon: Icon }) => (
              <Link
                key={id}
                href={href}
                role="menuitem"
                className="nav-account-item"
                onClick={() => onOpenChange(false)}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="nav-account-divider" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="nav-account-item nav-account-item--signout"
            onClick={() => {
              onOpenChange(false);
              void onLogout();
            }}
          >
            <LogOut aria-hidden="true" />
            <span>Sign out</span>
          </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HeaderAccount;
