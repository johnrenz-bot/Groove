'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';
import { InfoTip } from '@/components/ui/InfoTip';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  /** Adds the lift-on-hover treatment used by directory and marketing cards */
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Card padding ladder, re-based against the 14px root in `app/globals.css`.
 *
 *     sm   p-4   14px      dense panels, nested cards
 *     md   p-5   17.5px    the default — most cards in the product
 *     lg   p-6   21px      feature cards that need to breathe
 */
const PADDING = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' } as const;

export function Card({
  children,
  className = '',
  hoverable = false,
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[16px] border border-border bg-card shadow-[var(--shadow-sm)]',
        hoverable && 'transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5',
        PADDING[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  /** Longer explanation shown from the info trigger. */
  info?: React.ReactNode;
  /** Tooltip line; falls back to a stringified `info`. */
  infoShort?: string;
  /** Modal heading; defaults to a text title. */
  infoTitle?: string;
  /** @deprecated Subtitles are no longer rendered inline. Pass `info`. */
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({
  children,
  className = '',
  icon,
  title,
  info,
  infoShort,
  infoTitle,
  subtitle,
  action,
  ...props
}: CardHeaderProps) {
  const details = info ?? subtitle;
  const short =
    infoShort ?? (typeof details === 'string' ? details : undefined);
  const heading = infoTitle ?? (typeof title === 'string' ? title : 'About this card');
  const hasParts = Boolean(title || icon || details || action);

  return (
    <div
      className={cn(
        'mb-5 flex items-start justify-between gap-4 pb-5 border-b border-border',
        className
      )}
      {...props}
    >
      {hasParts ? (
        <>
          <div className="flex min-w-0 items-center gap-3">
            {icon && <IconBadge icon={icon} />}
            <div className="flex min-w-0 items-center gap-2">
              {typeof title === 'string' ? (
                <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-foreground">
                  {title}
                </h3>
              ) : (
                title
              )}
              {details ? (
                <InfoTip title={heading} short={short} details={details} />
              ) : null}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Small round icon badge — the recurring corner motif on cards.
 * `position="corner"` pins it to the top-right of a relative parent.
 */
export function IconBadge({
  icon,
  size = 'md',
  position,
  className = '',
}: {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  position?: 'corner';
  className?: string;
}) {
  const dims = {
    sm: 'h-8 w-8 rounded-full',
    md: 'h-10 w-10 rounded-full',
    lg: 'h-12 w-12 rounded-full',
  }[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center bg-accent-soft text-accent-text',
        dims,
        position === 'corner' && 'absolute -right-3 -top-3 shadow-[var(--shadow-sm)]',
        className
      )}
    >
      {icon}
    </span>
  );
}

export function CardTitle({ children, className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold tracking-[-0.01em] text-foreground', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-sm leading-relaxed text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-5 flex items-center justify-between pt-5 border-t border-border text-xs text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;