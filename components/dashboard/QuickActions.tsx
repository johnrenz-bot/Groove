import React from 'react';
import Link from 'next/link';

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'default';
}

export interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2.5" role="navigation" aria-label="Quick actions">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={
            a.variant === 'primary'
              ? 'inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover'
              : 'inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-muted'
          }
        >
          <span className="shrink-0" aria-hidden>
            {a.icon}
          </span>
          {a.label}
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;
