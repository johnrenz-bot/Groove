'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SINGING_ORGANIZATIONS } from '../../singing/data/singingOrgs.ts';
import { ACTING_ORGANIZATIONS } from '../../acting/data/actingOrgs.ts';
import { THEATER_ORGANIZATIONS } from '../../theater/data/theaterOrgs.ts';

/** Registry rows are tiny static records and the shapes are interchangeable. */
interface OrgEntry {
  id: string;
  label: string;
  fullName: string;
  site?: string;
}

const REGISTRIES = {
  singing: SINGING_ORGANIZATIONS as readonly OrgEntry[],
  acting: ACTING_ORGANIZATIONS as readonly OrgEntry[],
  theater: THEATER_ORGANIZATIONS as readonly OrgEntry[],
} as const;

interface DisciplineOrgLogoBarProps {
  selectedOrg: string;
  onSelectOrg: (orgId: string) => void;
  /** Which discipline's organization registry to render. */
  variant: 'singing' | 'acting' | 'theater';
}

const COPY = {
  singing: {
    headingId: 'filter-by-org-title',
    heading: 'Filter by Vocal Organization / Ensemble',
    hint: 'Select an organization to filter dispatches',
    groupAria: 'Filter dispatches by organization',
  },
  acting: {
    headingId: 'filter-by-studio-title',
    heading: 'Filter by Acting Guild / Studio',
    hint: 'Select an organization to filter audition notices',
    groupAria: 'Filter dispatches by acting organization',
  },
  theater: {
    headingId: 'filter-by-company-title',
    heading: 'Filter by Theater Company / Producer',
    hint: 'Select a company to filter performance updates',
    groupAria: 'Filter dispatches by theater organization',
  },
} as const;

export function DisciplineOrgLogoBar({ selectedOrg, onSelectOrg, variant }: DisciplineOrgLogoBarProps) {
  const copy = COPY[variant];
  const organizations = REGISTRIES[variant];

  return (
    <section aria-labelledby={copy.headingId} className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span id={copy.headingId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {copy.heading}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline-block">
          {copy.hint}
        </span>
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 pt-0.5" role="group" aria-label={copy.groupAria}>
        {organizations.map((org) => {
          const isSelected =
            selectedOrg.toLowerCase() === org.id.toLowerCase() ||
            (org.id === 'all' && selectedOrg === 'all') ||
            selectedOrg.toLowerCase() === org.label.toLowerCase();

          return (
            <button
              key={org.id}
              type="button"
              onClick={() => onSelectOrg(org.id === 'all' ? 'all' : (isSelected ? 'all' : org.id))}
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
