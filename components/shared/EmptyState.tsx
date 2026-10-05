import React from 'react';
import Link from 'next/link';
import { cn } from './cn';
import { Button } from '@/components/ui/Button';

/**
 * Empty state for lists, tables, search results, and directories.
 *
 * The app's "nothing here yet" surface: a dashed neutral card, a soft accent
 * icon badge, one short title, one line of explanation, and at most one action.
 *
 * The action deliberately renders through <Button> rather than a local pill. It
 * used to hand-roll the same shape, which meant an empty-state CTA and a real
 * CTA drifted apart the moment either one changed. Sharing the primitive is what
 * keeps them identical.
 *
 * `actionHref` and `action` compose: pass a string for a link-styled button, or
 * any node for a real control. Both together render the node inside a link.
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
        'flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border-strong bg-card text-center',
        compact ? 'px-6 py-10' : 'px-6 py-16',
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
      <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {actionHref && (
        <Link href={actionHref} className="mt-6">
          {typeof action === 'string' ? (
            <Button size="md">{action}</Button>
          ) : (
            action
          )}
        </Link>
      )}
      {action && !actionHref && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;