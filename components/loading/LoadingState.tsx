'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';
import { GrooveSpinner } from './GrooveSpinner';

/**
 * LoadingState — compact inline loading (lists, tables, cards, search).
 * Replaces the old `g-spin` ring so every data surface shares one glyph.
 */

export function LoadingState({
  label = 'Loading…',
  hint,
  spinner = 'orbit',
  className,
}: {
  label?: string;
  hint?: string;
  spinner?: 'orbit' | 'play' | 'bars' | 'pulse' | 'dots' | 'morph';
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-14 text-center',
        className
      )}
    >
      <GrooveSpinner variant={spinner} size="lg" label={label} />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {hint ? (
        <p className="max-w-[280px] text-xs leading-relaxed text-subtle-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Visually-hidden label for screen readers. */
const SR_ONLY = 'sr-only';

/**
 * RouteSkeleton — layout-true skeleton for route segments (dashboard,
 * profile, catalogue). Each block matches the real page geometry so there
 * is no layout shift when content arrives. Rendered by loading.tsx inside
 * the route group — the sidebar and header stay mounted and interactive.
 */
export function RouteSkeleton({
  variant = 'dashboard',
  className,
}: {
  variant?: 'dashboard' | 'hero' | 'profile' | 'list' | 'cards' | 'widgets';
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading content"
      className={cn('space-y-6', className)}
    >
      <span className={SR_ONLY}>Loading content…</span>

      {/* Page heading block — every dashboard page leads with it */}
      <div className="space-y-2" aria-hidden="true">
        <div className="g-skeleton h-7 w-56 max-w-full motion-reduce:animate-none" />
        <div className="g-skeleton h-3.5 w-80 max-w-full motion-reduce:animate-none" />
      </div>

      {variant === 'widgets' && (
        <>
          {/* 4-up stat tiles (matches the widget grid's stat strip) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="g-skeleton h-32 rounded-[14px] motion-reduce:animate-none" />
            ))}
          </div>
          {/* 8/4 row (sessions + action/requests) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-hidden="true">
            <div className="g-skeleton h-72 rounded-[14px] lg:col-span-8" />
            <div className="g-skeleton h-72 rounded-[14px] lg:col-span-4" />
          </div>
          {/* 8/4 row (coaches/students + next session) */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12" aria-hidden="true">
            <div className="g-skeleton h-64 rounded-[14px] lg:col-span-8" />
            <div className="g-skeleton h-64 rounded-[14px] lg:col-span-4" />
          </div>
        </>
      )}

      {variant === 'dashboard' && (
        <>
          {/* Hero banner */}
          <div className="g-skeleton h-40 w-full rounded-2xl motion-reduce:animate-none" aria-hidden="true" />
          {/* Stat cards (4-up on desktop, 2-up on tablet, 1-up on phone) */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="g-card space-y-3 p-5">
                <div className="g-skeleton h-3 w-20" />
                <div className="g-skeleton h-7 w-24" />
              </div>
            ))}
          </div>
          {/* Two-panel content row */}
          <div className="grid gap-5 lg:grid-cols-3" aria-hidden="true">
            <div className="g-card space-y-3 p-5 lg:col-span-2">
              <div className="g-skeleton h-4 w-40" />
              <div className="g-skeleton h-3 w-3/4" />
              <div className="g-skeleton h-3 w-2/3" />
              <div className="g-skeleton h-64 w-full" />
            </div>
            <div className="g-card space-y-3 p-5">
              <div className="g-skeleton h-4 w-36" />
              <div className="g-skeleton h-3 w-full" />
              <div className="g-skeleton h-3 w-5/6" />
              <div className="g-skeleton h-48 w-full" />
            </div>
          </div>
        </>
      )}

      {variant === 'hero' && (
        <>
          {/* Hero block used by community + about pages */}
          <div className="g-skeleton h-56 w-full rounded-2xl motion-reduce:animate-none" aria-hidden="true" />
          {/* Feature cards grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="g-card space-y-3 p-5">
                <div className="g-skeleton h-10 w-10 rounded-xl" />
                <div className="g-skeleton h-3.5 w-2/3" />
                <div className="g-skeleton h-3 w-full" />
                <div className="g-skeleton h-3 w-4/5" />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === 'profile' && (
        <div className="g-card flex items-center gap-4 p-6" aria-hidden="true">
          <div className="g-skeleton h-20 w-20 shrink-0 rounded-full motion-reduce:animate-none" />
          <div className="flex-1 space-y-2">
            <div className="g-skeleton h-4 w-40" />
            <div className="g-skeleton h-3 w-56 max-w-full" />
            <div className="g-skeleton h-3 w-32" />
          </div>
        </div>
      )}

      {(variant === 'list' || variant === 'dashboard') && (
        <div className="g-card overflow-hidden" aria-hidden="true">
          {[0, 1, 2, 3].map((r) => (
            <div
              key={r}
              className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-none"
            >
              <div className="g-skeleton h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="g-skeleton h-3.5 w-1/3 max-w-full" />
                <div className="g-skeleton h-3 w-1/2 max-w-full" />
              </div>
              <div className="g-skeleton h-8 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="g-card space-y-4 p-5">
              <div className="g-skeleton aspect-[16/10] w-full rounded-xl" />
              <div className="g-skeleton h-4 w-2/3" />
              <div className="g-skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LoadingState;

