'use client';

import React from 'react';
import { Filter, Search, X } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { DISCIPLINE_OPTIONS } from './types';
import { LocationMenu } from './LocationMenu';
import { FeeRangePopover } from './FeeRangePopover';
import { FilterChipsRow } from './FilterChipsRow';
import type { useDirectoryFilters } from './useDirectoryFilters';

export interface DirectoryFiltersProps {
  filters: ReturnType<typeof useDirectoryFilters>;
  resultCount: number;
  totalCount: number;
  noun?: string;
  className?: string;
  onOpenMobileSheet: () => void;
}

/**
 * THE ONE FILTER BAR for coach directories.
 *
 * One compact card: search, location and fee inline (md+), the discipline
 * chips as the single discipline control, applied-filter chips, a polite
 * live result count, and a clear-all. On phones the bar collapses to a
 * search field + a "Filters" button; the sheet holds the rest.
 *
 * Sticky under the header from md up; never covers the sidebar or topbar.
 */
export function DirectoryFilters({
  filters,
  resultCount,
  totalCount,
  noun = 'coach',
  className,
  onOpenMobileSheet,
}: DirectoryFiltersProps) {
  const {
    queryInput,
    setQueryInput,
    discipline,
    setDiscipline,
    location,
    setLocation,
    maxFee,
    setMaxFee,
    activeFilterCount,
    resetAll,
    chips,
  } = filters;

  return (
    <div
      className={cn(
        'md:sticky md:top-16 md:z-20 md:-mx-6 md:px-6 md:py-2 md:bg-[#111111]/90 md:backdrop-blur-md',
        className
      )}
    >
      {/* Search + (desktop) location + fee */}
      <div className="flex items-center gap-2">
        {/* Search — always visible */}
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="directory-search" className="sr-only">
            Search coach by name
          </label>
          <input
            id="directory-search"
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search coach by name…"
            className="h-11 w-full rounded-[14px] border border-white/5 bg-[#161616] pl-10 pr-10 text-[13px] text-foreground outline-none transition-colors placeholder:text-subtle-foreground hover:border-white/10 focus:border-accent focus:bg-[#1e1e1e] focus:ring-2 focus:ring-accent/40"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Desktop-only inline controls */}
        <div className="hidden w-[220px] shrink-0 md:block">
          <LocationMenu value={location} onChange={setLocation} id="directory-location" className="w-full" />
        </div>
        <div className="hidden shrink-0 md:block">
          <FeeRangePopover value={maxFee} onChange={setMaxFee} />
        </div>
      </div>

      {/* Desktop: discipline chips row */}
      <div
        className="mt-2 hidden items-center gap-1.5 overflow-x-auto md:flex"
        role="group"
        aria-label="Filter by discipline"
        style={{ scrollbarWidth: 'none' }}
      >
        {DISCIPLINE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = discipline === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setDiscipline(option.id)}
              className={cn(
                'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                selected
                  ? 'border-accent/50 bg-accent text-accent-foreground shadow-[var(--shadow-sm)]'
                  : 'border-white/5 bg-[#161616] text-muted-foreground hover:border-white/10 hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
              <span className="whitespace-nowrap">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile: filters button + count hint */}
      <div className="mt-2 flex items-center justify-between gap-2 md:hidden">
        <button
          type="button"
          onClick={onOpenMobileSheet}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[14px] border border-white/5 bg-[#161616] px-4 text-[13px] font-semibold text-foreground transition-colors hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={activeFilterCount > 0 ? `Open filters, ${activeFilterCount} active` : 'Open filters'}
        >
          <Filter className="h-4 w-4 stroke-[1.5] text-accent-text" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Applied-filter chips + result count (both breakpoints) */}
      <FilterChipsRow
        className="mt-2"
        chips={chips}
        onClearAll={resetAll}
        resultCount={resultCount}
        totalCount={totalCount}
        noun={noun}
      />
    </div>
  );
}

export default DirectoryFilters;

