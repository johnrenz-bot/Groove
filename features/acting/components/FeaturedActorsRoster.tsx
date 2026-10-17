'use client';

import React, { useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FEATURED_ACTING_COMPANIES, type ActingCompany } from '../data/actors';
import { ActorDossierCard } from './ActorDossierCard';
import { cn } from '@/components/shared/cn';

export function FeaturedActorsRoster() {
  const [selectedCompany, setSelectedCompany] = useState<ActingCompany>(
    FEATURED_ACTING_COMPANIES[0]
  );

  return (
    <section id="featured-actors" aria-labelledby="featured-actors-title" className="scroll-mt-24">
      <SectionHeader
        eyebrow="Premier Acting Companies & Conservatories"
        title={
          <span id="featured-actors-title">
            Featured <span className="font-normal italic text-muted-foreground">Acting Ensembles</span>
          </span>
        }
        description="Resident companies of the Cultural Center of the Philippines, PETA, and Repertory Philippines. Production dossiers and master artist rosters."
      />

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Select featured acting company">
        {FEATURED_ACTING_COMPANIES.map((comp) => {
          const isSelected = selectedCompany.id === comp.id;
          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => setSelectedCompany(comp)}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isSelected
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground'
              )}
            >
              <span>{comp.flag}</span>
              <span>{comp.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6" role="region" aria-label={`${selectedCompany.name} dossier`}>
        <ActorDossierCard company={selectedCompany} />
      </div>
    </section>
  );
}
