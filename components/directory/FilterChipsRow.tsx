'use client';

import React from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

/**
 * The applied-filter row: one removable chip per active filter, a Clear-all
 * action, and a polite live result count ("Showing 3 of 3 coaches").
 */
export function FilterChipsRow({
  chips,
  onClearAll,
  resultCount,
  totalCount,
  noun = 'coach',
  className,
}: {
  chips: readonly FilterChip[];
  onClearAll: () => void;
  resultCount: number;
  totalCount: number;
  noun?: string;
  className?: string;
}) {
  const showChips = chips.length > 0;
  const plural = totalCount === 1 ? noun : `${noun}s`;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        showChips || resultCount !== totalCount ? '' : 'min-h-0',
        className
      )}
    >
      {showChips && (
        <>
          <span className="pointer-events-none inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            Active filters
          </span>
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remove filter: ${chip.label}`}
              className="group inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft/15 py-0 pl-2.5 pr-1 text-[11px] font-semibold text-accent-text transition-colors hover:border-accent/50 hover:bg-accent-soft/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="max-w-[160px] truncate">{chip.label}</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 text-accent-text transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <X className="h-2.5 w-2.5" aria-hidden="true" strokeWidth={2.5} />
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Clear all
          </button>
        </>
      )}

      <p className="ml-auto text-[11px] font-medium tabular-nums text-muted-foreground" aria-live="polite">
        Showing <span className="font-semibold text-foreground">{resultCount}</span> of{' '}
        <span className="font-semibold text-foreground">{totalCount}</span> {plural}
      </p>
    </div>
  );
}

export default FilterChipsRow;

