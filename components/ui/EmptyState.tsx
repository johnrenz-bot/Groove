import React from 'react';
import Link from 'next/link';
import { cn } from '@/components/shared/cn';
import { Button } from '@/components/ui/Button';
import { InfoTip } from '@/components/ui/InfoTip';

/**
 * Empty states: icon, one short title, optional CTA. The explanation is hidden
 * behind the info trigger instead of printed as a paragraph.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  actionHref,
  className = '',
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionHref?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border-strong bg-card text-center',
        compact ? 'px-6 py-8' : 'px-6 py-12',
        className
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
        >
          {icon}
        </span>
      )}
      <div className="flex items-center justify-center gap-1.5">
        <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h3>
        {description && <InfoTip title={title} short={description} details={description} />}
      </div>
      {actionHref && (
        <Link href={actionHref} className="mt-6">
          {typeof action === 'string' ? <Button size="md">{action}</Button> : action}
        </Link>
      )}
      {action && !actionHref && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;
