'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/components/shared/cn';

const SINGING_CATEGORIES = [
  { id: 'all', label: 'Everything' },
  { id: 'competition', label: 'Competitions' },
  { id: 'workshop', label: 'Masterclasses & Clinics' },
  { id: 'event', label: 'Concerts & Recitals' },
  { id: 'news', label: 'Pedagogy & News' },
] as const;

interface SingingUpdatesFilterBarProps {
  region: string;
  category: string;
  searchQuery: string;
  language: 'en' | 'tl';
  onSelectRegion: (reg: string) => void;
  onSelectCategory: (cat: string) => void;
  onSearchChange: (q: string) => void;
  onToggleLanguage: (lang: 'en' | 'tl') => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function SingingUpdatesFilterBar({
  category,
  searchQuery,
  onSelectCategory,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
}: SingingUpdatesFilterBarProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      {/* Top Filter Controls: Search & Reset */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="relative w-full max-w-md" role="search">
          <label htmlFor="singing-update-search" className="sr-only">
            Search choral competitions, ensembles, and clinics
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="singing-update-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search choirs, masterclasses, venues..."
            className="w-full rounded-full border border-border bg-background py-2 pl-10 pr-10 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:border-border-strong hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-3" role="group" aria-label="Filter by category">
        {SINGING_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            aria-pressed={category === cat.id}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              category === cat.id
                ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
