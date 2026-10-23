'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/**
 * A single perk on a role card.
 *
 * The visible content is the icon; the label and explanation live in a tooltip
 * that opens on hover, on keyboard focus and on tap. The button opts out of the
 * global click sound, because it is a secondary disclosure, not the card's
 * action.
 */
export function RolePerk({
  icon: Icon,
  label,
  detail,
  align = 'center',
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  align?: 'start' | 'center' | 'end';
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || focused || pinned;

  // A tap-pinned tooltip should dismiss on the next tap outside or on Escape.
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPinned(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pinned]);

  return (
    <span className="relative inline-flex">
      <button
        ref={ref}
        type="button"
        data-click-sound="off"
        aria-label={`${label}: ${detail}`}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setPinned(false);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // Escape dismisses a tap-pinned tooltip without also closing the
          // parent dialog. The dialog owns the next Escape.
          if (event.key === 'Escape' && pinned) {
            event.stopPropagation();
            setPinned(false);
            setFocused(false);
            ref.current?.blur();
          }
        }}
        onClick={(event) => {
          // Never let the disclosure reach the card's navigation link.
          event.stopPropagation();
          setPinned((current) => {
            if (current) {
              // Tapping the same icon again dismisses it even though the tap
              // itself moved focus onto the button.
              ref.current?.blur();
            }
            return !current;
          });
        }}
        className={cn(
          'relative z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-200 motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black/60',
          open
            ? 'border-accent/60 bg-accent-soft text-accent-text'
            : 'border-white/25 bg-black/35 text-white/85 hover:border-accent/50 hover:text-accent-text'
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>

      <span
        id={id}
        role={open ? 'tooltip' : undefined}
        aria-hidden={!open}
        className={cn(
          'pointer-events-none absolute bottom-full z-40 mb-2 w-max max-w-[12rem] rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold leading-snug text-accent-text shadow-[var(--shadow-lg)] transition duration-150 motion-reduce:transition-none',
          align === 'start'
            ? 'left-0'
            : align === 'end'
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2',
          open ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        )}
      >
        {label}
      </span>
    </span>
  );
}

export default RolePerk;
