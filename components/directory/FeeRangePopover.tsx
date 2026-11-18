'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { MAX_FEE, MIN_FEE } from './types';

/**
 * Max Session Fee — popover with a budget slider.
 *
 * Range input styled orange; the filled track is drawn with a linear
 * gradient under the thumb position so the control reads at a glance.
 * The popover opens below the trigger and closes on outside click / Escape.
 */
export function FeeRangePopover({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  const triggerId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isFiltered = value < 3000;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pct = ((value - MIN_FEE) / (MAX_FEE - MIN_FEE)) * 100;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-11 cursor-pointer items-center gap-2 rounded-[14px] border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isFiltered
            ? 'border-accent/40 bg-accent-soft/15 text-foreground'
            : 'border-white/5 bg-[#161616] text-foreground hover:border-white/10'
        )}
      >
        <Wallet className="h-4 w-4 shrink-0 stroke-[1.5] text-accent-text" aria-hidden="true" />
        <span className="whitespace-nowrap">
          Max <span className="tabular-nums">₱{value.toLocaleString()}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Maximum session fee"
          className="absolute right-0 z-30 mt-2 w-[300px] rounded-2xl border border-white/5 bg-[#161616] p-4 shadow-[var(--shadow-lg)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor={`${triggerId}-range`} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Max session fee
            </label>
            <span className="rounded-full bg-accent-soft/25 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-accent-text">
              ₱{value.toLocaleString()}
            </span>
          </div>
          <input
            id={`${triggerId}-range`}
            type="range"
            min={MIN_FEE}
            max={MAX_FEE}
            step={100}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-valuetext={`₱${value.toLocaleString()}`}
            className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616] motion-reduce:transition-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[var(--shadow-sm)]"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
            }}
          />
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium tabular-nums text-subtle-foreground">
            <span>₱{MIN_FEE.toLocaleString()}</span>
            <span>₱{MAX_FEE.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeeRangePopover;

