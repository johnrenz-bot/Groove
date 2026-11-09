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

/**
 * RouteSkeleton — layout-true skeleton for route segments (dashboard,
 * profile, catalogue). Each block matches the real geometry so there
 * is no layout shift when content arrives.
 */
export function RouteSkeleton({
  variant = 'dashboard',
  className,
}: {
  variant?: 'dashboard' | 'profile' | 'list' | 'cards';
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <div className="g-skeleton h-7 w-56 motion-reduce:animate-none" />
        <div className="g-skeleton h-3.5 w-80 max-w-full motion-reduce:animate-none" />
      </div>
      {variant === 'dashboard' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="g-card space-y-3 p-5">
              <div className="g-skeleton h-3 w-20 motion-reduce:animate-none" />
              <div className="g-skeleton h-7 w-24 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )}
      {variant === 'profile' && (
        <div className="g-card flex items-center gap-4 p-6">
          <div className="g-skeleton h-20 w-20 rounded-full motion-reduce:animate-none" />
          <div className="flex-1 space-y-2">
            <div className="g-skeleton h-4 w-40 motion-reduce:animate-none" />
            <div className="g-skeleton h-3 w-56 motion-reduce:animate-none" />
            <div className="g-skeleton h-3 w-32 motion-reduce:animate-none" />
          </div>
        </div>
      )}
      {(variant === 'list' || variant === 'dashboard') && (
        <div className="g-card overflow-hidden">
          {[0, 1, 2, 3].map((r) => (
            <div key={r} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-none">
              <div className="g-skeleton h-10 w-10 rounded-full motion-reduce:animate-none" />
              <div className="flex-1 space-y-2">
                <div className="g-skeleton h-3.5 w-1/3 motion-reduce:animate-none" />
                <div className="g-skeleton h-3 w-1/2 motion-reduce:animate-none" />
              </div>
              <div className="g-skeleton h-8 w-20 rounded-full motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )}
      {variant === 'cards' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="g-card space-y-4 p-5">
              <div className="g-skeleton aspect-[16/10] w-full rounded-xl motion-reduce:animate-none" />
              <div className="g-skeleton h-4 w-2/3 motion-reduce:animate-none" />
              <div className="g-skeleton h-3 w-1/2 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LoadingState;
