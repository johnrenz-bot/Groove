'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DisciplineUpdatesFilterBarProps {
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
  /** Which discipline's filter vocabulary to render. (Dance keeps its own component.) */
  variant: 'singing' | 'acting' | 'theater';
}

const CATEGORIES = {
  singing: [
    { id: 'all', label: 'Everything' },
    { id: 'competition', label: 'Competitions' },
    { id: 'workshop', label: 'Masterclasses & Clinics' },
    { id: 'event', label: 'Concerts & Recitals' },
    { id: 'news', label: 'Pedagogy & News' },
  ],
  acting: [
    { id: 'all', label: 'Everything' },
    { id: 'competition', label: 'Auditions & Castings' },
    { id: 'workshop', label: 'Masterclasses & Labs' },
    { id: 'event', label: 'Showcases & Staged Plays' },
    { id: 'news', label: 'Guild & Industry Standards' },
  ],
  theater: [
    { id: 'all', label: 'Everything' },
    { id: 'competition', label: 'Festivals & Competitions' },
    { id: 'workshop', label: 'Production & Technical Labs' },
    { id: 'event', label: 'Mainstage & Premieres' },
    { id: 'news', label: 'Gawad Buhay & Industry' },
  ],
} as const;

const COPY = {
  singing: {
    searchId: 'singing-update-search',
    searchLabel: 'Search choral competitions, ensembles, and clinics',
    placeholder: 'Search choirs, masterclasses, venues...',
  },
  acting: {
    searchId: 'acting-update-search',
    searchLabel: 'Search auditions, castings, workshops, and studios',
    placeholder: 'Search auditions, studios, masterclasses...',
  },
  theater: {
    searchId: 'theater-update-search',
    searchLabel: 'Search productions, openings, and venues',
    placeholder: 'Search productions, venues, and run dates...',
  },
} as const;

export function DisciplineUpdatesFilterBar({
  category,
  searchQuery,
  onSelectCategory,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
  variant,
}: DisciplineUpdatesFilterBarProps) {
  const copy = COPY[variant];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      {/* Top Filter Controls: Search & Reset */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="relative w-full max-w-md" role="search">
          <label htmlFor={copy.searchId} className="sr-only">
            {copy.searchLabel}
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={copy.searchId}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={copy.placeholder}
            className="w-full rounded-full border border-border bg-background py-2 pl-10 pr-10 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-3" role="group" aria-label="Filter by category">
        {CATEGORIES[variant].map((cat) => (
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
