import React from 'react';
import { cn } from './cn';

/**
 * The SaaS-minimalism section signature:
 * small uppercase accent EYEBROW -> large bold heading -> muted subtext.
 * Centered with generous spacing by default.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtext,
  align = 'center',
  className = '',
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtext?: React.ReactNode;
  align?: 'center' | 'left';
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex max-w-2xl flex-col gap-3',
        align === 'center' ? 'mx-auto items-center text-center' : 'items-start text-left',
        className
      )}
    >
      {eyebrow && <span className="g-eyebrow">{eyebrow}</span>}
      <h2 className="text-3xl font-bold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtext && <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{subtext}</p>}
      {children}
    </div>
  );
}

/** Compact page header for dashboards: eyebrow + title + description + action. */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  className = '',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <header className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </header>
  );
}

export default SectionHeader;
