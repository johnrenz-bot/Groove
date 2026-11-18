'use client';

import React from 'react';

/**
 * Layout-matched loading skeleton for the profile pages. Mirrors the real
 * geometry (cover block, overlapping avatar, identity lines, two-column body)
 * so nothing jumps when the data lands. `role="status"` keeps the wait
 * announced.
 */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl" role="status" aria-busy="true" aria-label="Loading profile">
      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="g-skeleton h-36 w-full sm:h-44 lg:h-52" />
        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          <div className="-mt-12 h-24 w-24 rounded-full sm:-mt-14 sm:h-28 sm:w-28 g-skeleton" />
          <div className="mt-4 flex flex-col gap-3">
            <div className="g-skeleton h-6 w-56" />
            <div className="g-skeleton h-4 w-40" />
            <div className="g-skeleton h-4 w-72 max-w-full" />
            <div className="g-skeleton h-4 w-64 max-w-full" />
          </div>
          <div className="mt-5 flex gap-6 border-t border-border/60 pt-4">
            <div className="g-skeleton h-9 w-20" />
            <div className="g-skeleton h-9 w-20" />
            <div className="g-skeleton h-9 w-20" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="g-skeleton h-52 rounded-2xl" />
          <div className="g-skeleton h-40 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="g-skeleton h-44 rounded-2xl" />
          <div className="g-skeleton h-44 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default ProfileSkeleton;
