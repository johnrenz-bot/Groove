import React from 'react';
import { cn } from '@/components/shared/cn';
import { InfoTip } from '@/components/ui/InfoTip';

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  /** Longer explanation opened from the info trigger next to the heading. */
  info?: React.ReactNode;
  infoShort?: string;
  infoTitle?: string;
  /** Small uppercase label above the heading. */
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Removes the vertical rhythm for sections nested inside a panel. */
  compact?: boolean;
}

/**
 * A semantics-first grouping wrapper. Unlike Panel it paints no surface; it is
 * the heading + spacing layer used to group several panels into one idea.
 */
export function Section({
  title,
  info,
  infoShort,
  infoTitle,
  eyebrow,
  action,
  children,
  className = '',
  compact = false,
  ...props
}: SectionProps) {
  const heading = infoTitle ?? (typeof title === 'string' ? title : 'About this section');

  return (
    <section className={cn(compact ? 'space-y-3' : 'space-y-4', className)} {...props}>
      {(title || action || eyebrow) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                {eyebrow}
              </p>
            )}
            {title && (
              <div className="flex items-center gap-2">
                {typeof title === 'string' ? (
                  <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h2>
                ) : (
                  title
                )}
                {info ? (
                  <InfoTip
                    title={heading}
                    short={infoShort ?? (typeof info === 'string' ? info : undefined)}
                    details={info}
                  />
                ) : null}
              </div>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export default Section;
