import React from 'react';
import Link from 'next/link';

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'default';
}

/**
 * Quick-access lane: compact premium tiles from the shared `.dash-qa`
 * surface, with a gold icon well, hairline border and a quiet hover lift.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <nav
      className="app-quick-actions"
      aria-label="Quick actions"
    >
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`dash-qa ${a.variant === 'primary' ? 'dash-qa--primary' : ''}`}
        >
          <span className="dash-qa-icon" aria-hidden="true">
            {a.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight text-foreground">
            {a.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export default QuickActions;