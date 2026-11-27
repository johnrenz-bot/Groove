import React from 'react';
import { cn } from '@/lib/utils';
import { InfoTip } from '@/components/ui/InfoTip';

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
 * The universal page masthead for every portal (client, coach, admin).
 * One composition everywhere: small gold eyebrow, clear page title, muted
 * one-line description, optional action cluster and info tip.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  info,
  infoShort,
  infoTitle,
  className = '',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
  /** Optional override for the disclosure content; defaults to `description`. */
  info?: React.ReactNode;
  infoShort?: string;
  infoTitle?: string;
  className?: string;
}) {
  const details = info ?? description;
  const short =
    infoShort ?? (typeof details === 'string' ? details : undefined);
  const heading = infoTitle ?? (typeof title === 'string' ? title : 'Page details');

  return (
    <header className={cn('app-page-head border-b border-border pb-6', className)}>
      <div className="min-w-0">
        {eyebrow ? <span className="app-eyebrow">{eyebrow}</span> : null}
        <div className="flex items-center gap-2.5">
          <h1 className="app-page-title">{title}</h1>
          {details ? (
            <InfoTip title={heading} short={short} details={details} className="mt-1" />
          ) : null}
        </div>
        {description ? <p className="app-page-subtitle">{description}</p> : null}
      </div>
      {action ? <div className="app-page-actions shrink-0">{action}</div> : null}
    </header>
  );
}

export default SectionHeader;

