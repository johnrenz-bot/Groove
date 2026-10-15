'use client';

import React from 'react';

export function DanceUpdatesSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 animate-pulse motion-reduce:animate-none"
        >
          {/* Thumbnail Skeleton */}
          <div className="aspect-[16/9] w-full bg-muted/40" />

          {/* Content Body */}
          <div className="space-y-3 p-5">
            <div className="flex gap-2">
              <div className="h-3 w-16 rounded bg-muted/50" />
              <div className="h-3 w-20 rounded bg-muted/30" />
            </div>
            <div className="h-5 w-5/6 rounded bg-muted/60" />
            <div className="h-3.5 w-full rounded bg-muted/30" />
            <div className="h-3.5 w-3/4 rounded bg-muted/30" />
          </div>

          {/* Footer Skeleton */}
          <div className="mt-auto flex justify-between border-t border-divider p-4">
            <div className="h-3 w-12 rounded bg-muted/30" />
            <div className="h-3 w-24 rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
