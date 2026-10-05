import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading placeholders shaped like the admin surfaces they stand in for.
 *
 * Kept here rather than inlined because a skeleton that does not match the real
 * layout causes a visible jump when data lands — the exact jank that made the
 * old admin dashboard feel unfinished.
 */

/** Matches the metric card grid on the overview page. */
export function AdminSkeletonStat() {
  return (
    <div className="g-card p-5">
      <Skeleton className="h-9 w-9 rounded-xl" />
      <Skeleton className="mt-4 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
      <Skeleton className="mt-1.5 h-3 w-32" />
    </div>
  );
}

/** Matches a stacked list of rows (activity feed, ticket cards). */
export function AdminSkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted px-4 py-3.5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Matches a card with a header and a body of content. */
export function AdminSkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="g-card p-6" aria-hidden="true">
      <div className="mb-5 flex items-center gap-3 border-b border-divider pb-5">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}

export default AdminSkeletonStat;