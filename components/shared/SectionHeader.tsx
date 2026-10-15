import React from 'react';
import { cn } from './cn';

/**
 * The editorial section signature:
 * small uppercase accent EYEBROW -> serif heading -> muted subtext.
 * Centered with generous spacing by default.
 *
 * The heading is the one place on a public page that switches to the display
 * serif. It is a single line of type doing a lot of work; giving it a different
 * face is what makes the page read as composed rather than as a stack of boxes.
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
      <h2 className="g-display sm:text-[2.5rem]">{title}</h2>
      {subtext && (
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{subtext}</p>
      )}
      {children}
    </div>
  );
}

/**
 * Compact page header for dashboards: eyebrow + title + description + action.
 *
 * The eyebrow used to be hand-rolled here AND `.g-eyebrow` existed one screen
 * away, so the app shipped two pill styles for the same idea. It now uses
 * `.g-eyebrow`, and the title uses the serif display face at the smaller scale.
 */
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
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <span className="g-eyebrow mb-3">{eyebrow}</span>}
        <h1 className="g-title">{title}</h1>
        {description && (
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </header>
  );
}

export default SectionHeader;
