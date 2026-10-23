'use client';

import React, { useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/shared/cn';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  ariaLabel?: string;
}

/**
 * Pill segmented control with one sliding indicator. Used by the studio radius
 * selector and any compact either/or control that doesn't need tab semantics.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  size = 'sm',
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const reduceMotion = useReducedMotion();
  const rawId = useId();
  const layoutId = `segmented-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (direction: 1 | -1) => {
    const index = options.findIndex((option) => option.value === value);
    const next = (index + direction + options.length) % options.length;
    onChange(options[next].value);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/70 p-1',
        className
      )}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 cursor-pointer rounded-full font-semibold transition-colors duration-150',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full bg-accent shadow-[var(--shadow-sm)]"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
