'use client';

import React from 'react';
import { ORGANIZATIONS } from '@/lib/dance/constants';
import { cn } from '@/components/shared/cn';

interface OrgLogoBarProps {
  selectedOrg: string;
  onSelectOrg: (orgId: string) => void;
}

export function OrgLogoBar({ selectedOrg, onSelectOrg }: OrgLogoBarProps) {
  return (
    <section aria-labelledby="filter-by-league-title" className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span id="filter-by-league-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Filter by League
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline-block">
          Select an organization to filter dispatches
        </span>
      </div>

      {/* Horizontal pill list */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 pt-0.5" role="group" aria-label="Filter dispatches by organization">
        {/* ALL LEAGUES pill */}
        <button
          type="button"
          onClick={() => onSelectOrg('all')}
          aria-pressed={selectedOrg === 'all'}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
            selectedOrg === 'all'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          All Leagues
        </button>

        {ORGANIZATIONS.map((org) => {
          const isSelected =
            selectedOrg.toLowerCase() === org.id.toLowerCase() ||
            selectedOrg.toLowerCase() === org.label.toLowerCase();

          return (
            <button
              key={org.id}
              type="button"
              onClick={() => onSelectOrg(isSelected ? 'all' : org.id)}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isSelected
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={org.fullName}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isSelected ? 'bg-accent-foreground' : 'bg-accent-text/60'
                )}
                aria-hidden="true"
              />
              <span>{org.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
