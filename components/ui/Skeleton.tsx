import React from 'react';
import { cn } from '@/components/shared/cn';

/** Base shimmer block. Use the `*Skeleton` helpers for common shapes. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('g-skeleton', className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={cn('g-card space-y-4 p-6', className)} aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="g-card overflow-hidden" aria-hidden="true">
      <div className="flex gap-4 border-b border-border bg-muted px-5 py-3.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-divider px-5 py-4 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grid of card skeletons — for coach/studio/talent directories. */
export function SkeletonGrid({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div
      className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Named loading state with an accessible label. */
export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center gap-3 py-16', className)}>
      <span className="g-spin h-6 w-6 rounded-full border-2 border-border border-t-accent" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default Skeleton;
