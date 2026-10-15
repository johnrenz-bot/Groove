import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Dashboard metric card — thick accent bar, big icon circle, chevron, whole card is a link.
 */
export function StatCard({
  icon,
  value,
  label,
  sub,
  accentColor,
  href,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  sub?: string;
  accentColor: 'yellow' | 'blue' | 'red' | 'green';
  href: string;
}) {
  const barColor = {
    yellow: 'bg-brand-sunburst',
    blue: 'bg-info',
    red: 'bg-danger',
    green: 'bg-success',
  }[accentColor];

  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-[14px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(20,40,75,0.06),0_8px_24px_rgba(20,40,75,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(20,40,75,0.1)]"
    >
      {/* Thick accent bar */}
      <span className={`absolute bottom-0 left-0 top-0 w-[4px] rounded-r-full ${barColor}`} aria-hidden="true" />

      {/* Icon circle */}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
        {icon}
      </span>

      {/* Value + label */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-2xl font-bold tabular-nums tracking-[-0.02em] text-foreground">
          {value}
        </p>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>

      {/* Chevron */}
      <ChevronRight
        className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}

export default StatCard;
