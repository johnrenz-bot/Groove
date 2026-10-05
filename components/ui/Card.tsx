'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  /** Adds the lift-on-hover treatment used by directory and marketing cards */
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' } as const;

export function Card({
  children,
  className = '',
  hoverable = false,
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      className={cn('g-card', hoverable && 'g-card-hover', PADDING[padding], className)}
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
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({
  children,
  className = '',
  icon,
  title,
  subtitle,
  action,
  ...props
}: CardHeaderProps) {
  const hasParts = Boolean(title || icon || subtitle || action);

  return (
    <div
      className={cn(
        'mb-5 flex items-start justify-between gap-4 border-b border-divider pb-5',
        className
      )}
      {...props}
    >
      {hasParts ? (
        <>
          <div className="flex min-w-0 items-center gap-3">
            {icon && <IconBadge icon={icon} />}
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h3 className="truncate text-base font-bold tracking-[-0.01em] text-foreground">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
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
 * Small round lucide icon badge — the recurring corner motif on cards.
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
        'flex shrink-0 items-center justify-center border border-accent-border bg-accent-soft text-accent-text',
        dims,
        position === 'corner' && 'absolute -right-3 -top-3 shadow-[var(--shadow-md)]',
        className
      )}
    >
      {icon}
    </span>
  );
}

export function CardTitle({ children, className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-bold tracking-[-0.01em] text-foreground', className)} {...props}>
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
        'mt-5 flex items-center justify-between border-t border-divider pt-5 text-xs text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
