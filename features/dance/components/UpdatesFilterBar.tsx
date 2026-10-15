'use client';

import React from 'react';
import { Search, X, Globe, Languages } from 'lucide-react';
import { CATEGORIES } from '@/lib/dance/constants';
import { cn } from '@/components/shared/cn';

interface UpdatesFilterBarProps {
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

export function UpdatesFilterBar({
  region,
  category,
  searchQuery,
  language,
  onSelectRegion,
  onSelectCategory,
  onSearchChange,
  onToggleLanguage,
  onClearFilters,
  hasActiveFilters,
}: UpdatesFilterBarProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      {/* Top Filter Controls: Search & Region & Language */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="relative w-full max-w-md" role="search">
          <label htmlFor="dance-update-search" className="sr-only">
            Search competitions, crews, and cities
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="dance-update-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search competitions, crews, cities..."
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

        {/* Region & Language Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Region Tabs (All vs Philippines vs International) */}
          <div className="flex items-center rounded-full border border-border bg-muted/20 p-1" role="group" aria-label="Filter by region">
            <button
              type="button"
              onClick={() => onSelectRegion('all')}
              aria-pressed={region === 'all'}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                region === 'all'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onSelectRegion('philippines')}
              aria-pressed={region === 'philippines'}
              className={cn(
                'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                region === 'philippines'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>🇵🇭 PH</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectRegion('international')}
              aria-pressed={region === 'international'}
              className={cn(
                'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                region === 'international'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Globe className="h-3 w-3" aria-hidden="true" />
              <span>Intl</span>
            </button>
          </div>

          {/* Language Toggle (English vs Tagalog summary) */}
          <div className="flex items-center rounded-full border border-border bg-muted/20 p-1" role="group" aria-label="Summary language">
            <span className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <button
              type="button"
              onClick={() => onToggleLanguage('en')}
              aria-pressed={language === 'en'}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                language === 'en'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onToggleLanguage('tl')}
              aria-pressed={language === 'tl'}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                language === 'tl'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Tagalog / Filipino summaries"
            >
              Tagalog (TL)
            </button>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-danger hover:underline"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pt-1" role="group" aria-label="Filter by category">
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isActive}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isActive
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
