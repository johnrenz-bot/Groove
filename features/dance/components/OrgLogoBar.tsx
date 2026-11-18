'use client';

import React, { useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';
import type { League } from '@/lib/dance/contracts';
import type { LeagueScopeFilter } from '@/lib/dance/contracts';
import { cn } from '@/components/shared/cn';

interface OrgLogoBarProps {
  /** Leagues visible after scope + search filtering (status === 'approved'). */
  leagues: League[];
  selectedOrg: string;
  onSelectOrg: (orgId: string) => void;
  scope: LeagueScopeFilter;
  onScopeChange: (scope: LeagueScopeFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** Crews per league id (from the verified FEATURED_CREWS leagueIds). */
  crewCounts: Record<string, number>;
  /** Upcoming events per league id (matched via registry match tokens). */
  eventCounts: Record<string, number>;
}

const SCOPE_OPTIONS: Array<{ value: LeagueScopeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'international', label: 'International' },
  { value: 'philippines', label: 'Philippines' },
];

export function OrgLogoBar({
  leagues,
  selectedOrg,
  onSelectOrg,
  scope,
  onScopeChange,
  query,
  onQueryChange,
  crewCounts,
  eventCounts,
}: OrgLogoBarProps) {
  const visibleCount = leagues.length;
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  // When the active chip changes (or mounts), keep it in view inside the
  // horizontally scrolled row without jumping the whole page.
  useEffect(() => {
    const chip = activeChipRef.current;
    if (!chip) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chip.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  }, [selectedOrg, scope, query]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      onQueryChange('');
    }
  };

  const hasActiveFilter = scope !== 'all' || query.trim() !== '';

  return (
    <section
      aria-labelledby="filter-by-league-title"
      className="mb-8 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          id="filter-by-league-title"
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Filter by League
        </span>

        {/* Scope toggle */}
        <div
          role="group"
          aria-label="Filter leagues by scope"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1"
        >
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onScopeChange(option.value)}
              aria-pressed={scope === option.value}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                scope === option.value
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search within leagues */}
      <div className="relative mt-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor="league-search" className="sr-only">
          Search leagues
        </label>
        <input
          id="league-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search leagues — e.g. “HHI”, “Red Bull”, “DanceSport”…"
          autoComplete="off"
          spellCheck={false}
          className="h-10 w-full rounded-xl border border-border bg-muted/30 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query.trim() !== '' && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear league search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Result count, announced politely */}
      <p className="mt-2 text-[11px] text-muted-foreground" aria-live="polite">
        {visibleCount === 1 ? '1 league' : `${visibleCount} leagues`}
        {scope !== 'all' ? ` · ${SCOPE_OPTIONS.find((o) => o.value === scope)?.label}` : ''}
        {query.trim() ? ` · “${query.trim()}”` : ''}
      </p>

      {/* Horizontally scrolled chip row with scroll-snap */}
      <div
        className="mt-3 flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch]"
        role="group"
        aria-label="Filter dispatches by league"
      >
        <button
          type="button"
          onClick={() => onSelectOrg('all')}
          aria-pressed={selectedOrg === 'all'}
          ref={selectedOrg === 'all' ? activeChipRef : undefined}
          className={cn(
            'inline-flex shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
            selectedOrg === 'all'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          All Leagues
        </button>

        {leagues.map((league) => {
          const isSelected = selectedOrg === league.id;
          const crews = crewCounts[league.id] ?? 0;
          const events = eventCounts[league.id] ?? 0;
          const count = crews + events;
          return (
            <button
              key={league.id}
              type="button"
              onClick={() => onSelectOrg(isSelected ? 'all' : league.id)}
              aria-pressed={isSelected}
              ref={isSelected ? activeChipRef : undefined}
              title={`${league.name} — ${crews} crew${crews === 1 ? '' : 's'} · ${events} upcoming`}
              className={cn(
                'inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isSelected
                  ? 'border-transparent bg-accent text-accent-foreground shadow-sm'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {isSelected ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-accent-text/60"
                  aria-hidden="true"
                />
              )}
              <span>{league.shortName}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    isSelected
                      ? 'bg-black/20 text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                  aria-hidden="true"
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {visibleCount === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            No leagues match “{query.trim()}”. Try a shorter search or clear it.
          </p>
        )}
      </div>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={() => {
            onScopeChange('all');
            onQueryChange('');
          }}
          className="mt-2 text-[11px] font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reset scope and search
        </button>
      )}
    </section>
  );
}

