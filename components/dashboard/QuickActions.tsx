import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'default';
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-2.5" role="navigation" aria-label="Quick actions">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={
            a.variant === 'primary'
              ? 'inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none'
              : 'inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-muted hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none'
          }
        >
          <span className="shrink-0" aria-hidden>{a.icon}</span>
          {a.label}
          {a.variant === 'primary' && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;
