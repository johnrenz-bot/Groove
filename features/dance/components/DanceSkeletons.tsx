'use client';

import React from 'react';

export function DanceUpdatesSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col border border-white/10 bg-[#0A141C] p-0 animate-pulse"
        >
          {/* Thumbnail Skeleton */}
          <div className="aspect-[16/9] w-full bg-white/5" />

          {/* Content Body */}
          <div className="space-y-3 p-5">
            <div className="flex gap-2">
              <div className="h-3 w-16 bg-white/10" />
              <div className="h-3 w-20 bg-white/10" />
            </div>
            <div className="h-5 w-5/6 bg-white/15" />
            <div className="h-4 w-full bg-white/5" />
            <div className="h-4 w-3/4 bg-white/5" />
          </div>

          {/* Footer Skeleton */}
          <div className="mt-auto border-t border-white/5 p-4 flex justify-between">
            <div className="h-3 w-12 bg-white/5" />
            <div className="h-3 w-24 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
