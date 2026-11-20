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
 * The editorial page masthead for every portal (client, coach, admin).
 * One composition everywhere: gold eyebrow over a hairline, Source Serif 4
 * title, muted one-line description, optional action cluster and info tip.
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
    <header className={cn('mb-7 border-b border-border pb-6', className)}>

      <div className="mt-2.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-sans text-3xl font-semibold leading-[1.1] tracking-[-0.015em] text-foreground sm:text-4xl">
              {title}
            </h1>
            {details ? (
              <InfoTip title={heading} short={short} details={details} className="mt-1" />
            ) : null}
          </div>
          {description ? (
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
      </div>
    </header>
  );
}

export default SectionHeader;

