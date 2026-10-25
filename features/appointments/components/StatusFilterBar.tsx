'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/shared/cn';

export interface StatusFilterOption {
  /** Enum label, or 'All'. */
  value: string;
  label: string;
  count: number;
}

/**
 * Animated status pills with live counts.
 *
 * The page owns the counts, so this component has no opinion about bookings —
 * it only renders what the database just returned. A pill whose count has
 * dropped to zero is hidden UNLESS it is the selected filter: hiding the active
 * pill after a status change would leave the list filtered with no visible
 * control explaining why.
 *
 * The moving highlight is a shared `layoutId`, so switching filters slides one
 * surface rather than fading two. `useReducedMotion` removes the slide.
 */
export function StatusFilterBar({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly StatusFilterOption[];
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('g-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-2', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        if (option.count === 0 && option.value !== 'All' && !active) return null;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
              active
                ? 'border-accent-border text-accent-text'
                : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId="booking-active-filter"
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-accent-soft"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }
                }
              />
            )}
            <span className="relative">{option.label}</span>
            <span
              className={cn(
                'relative inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={option.count}
                  initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  transition={{ duration: reduceMotion ? 0 : 0.16 }}
                >
                  {option.count}
                </motion.span>
              </AnimatePresence>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default StatusFilterBar;
