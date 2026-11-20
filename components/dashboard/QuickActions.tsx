import React from 'react';
import Link from 'next/link';

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'default';
}

/**
 * Quick-access lane: outlined cards. Transparent bg, 1px border, radius 16px,
 * icon top-left, label below. No gold fill, no glows.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <nav
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label="Quick actions"
    >
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group flex h-[72px] flex-col justify-between rounded-[16px] border border-border bg-transparent p-4 transition-colors hover:border-border-strong hover:bg-surface"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
            {a.icon}
          </span>
          <span className="truncate text-sm font-semibold leading-tight text-foreground">
            {a.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export default QuickActions;