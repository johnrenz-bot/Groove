'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Palette, ShieldAlert, UserCog } from 'lucide-react';

/**
 * In-page settings navigation shared by the client and coach portals.
 * It is an anchor rail, not a second settings store: every section already
 * lives on the page and keeps its own save/confirm behaviour.
 */
const ITEMS = [
  { id: 'account', label: 'Account', icon: Mail },
  { id: 'profile', label: 'Profile', icon: UserCog },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'danger', label: 'Danger zone', icon: ShieldAlert },
] as const;

export function SettingsNav() {
  const [active, setActive] = useState<string>('account');

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace('#', '');
      if (ITEMS.some((item) => item.id === hash)) setActive(hash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return (
    <nav className="settings-nav" aria-label="Settings sections">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <Link
          key={id}
          href={`#${id}`}
          className="settings-nav-link"
          data-active={active === id || undefined}
          aria-current={active === id ? 'true' : undefined}
          onClick={() => setActive(id)}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default SettingsNav;
