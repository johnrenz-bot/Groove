import React from 'react';
import { GlassCard } from './GlassCard';
import { cn } from './cn';

/**
 * Metric card for dashboards and the landing stats band.
 * Large number + label + optional description, with a soft accent icon badge.
 * Rendered using the shared GlassCard.
 */
export function StatCard({
  value,
  label,
  description,
  icon,
  accent = false,
  className = '',
  accentBar,
}: {
  value: React.ReactNode;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  /** Render the number in the accent color (used for landing stats) */
  accent?: boolean;
  className?: string;
  /** Accent bar color for dashboard metric cards */
  accentBar?: 'gold' | 'blue' | 'red' | 'green';
}) {
  const accentBarClass = accentBar ? `ph-accent-bar ph-accent-bar--${accentBar}` : '';

  return (
    <GlassCard className={cn('ph-card flex flex-col gap-4 p-5 sm:p-6 group', accentBarClass, className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ph-border)] bg-[var(--ph-cream)] text-[var(--ph-navy-soft)] transition-transform duration-200 group-hover:scale-105"
          >
            {icon}
          </span>
        )}
        <div
          className={cn(
            'min-w-0 font-bold tabular-nums tracking-[-0.03em]',
            typeof value === 'string' && value.length > 8
              ? 'text-lg sm:text-xl truncate'
              : 'text-2xl sm:text-3xl',
            accent ? 'text-[var(--ph-blue)]' : 'text-[var(--ph-navy)]'
          )}
        >
          {value}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--ph-navy)]">{label}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-[var(--ph-slate)]">{description}</p>}
      </div>
    </GlassCard>
  );
}

/**
 * Numbered step card (01, 02, 03) for process sections.
 * The oversized numeral is decorative and sits behind the content.
 * Rendered using the shared GlassCard.
 */
export function NumberedStep({
  step,
  title,
  description,
  icon,
  className = '',
}: {
  step: number | string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const label = typeof step === 'number' ? String(step).padStart(2, '0') : step;

  return (
    <GlassCard className={cn('relative flex flex-col gap-3 overflow-hidden p-7 group', className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-3 select-none text-[64px] font-bold leading-none tracking-[-0.05em] text-foreground/5"
      >
        {label}
      </span>

      <div className="relative flex items-center gap-3">
        {icon && (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text transition-transform duration-200 group-hover:scale-105"
          >
            {icon}
          </span>
        )}
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-text">
          Step {label}
        </span>
      </div>

      <h3 className="relative text-base font-bold tracking-[-0.01em] text-foreground">{title}</h3>
      {description && (
        <p className="relative text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </GlassCard>
  );
}

export default StatCard;
