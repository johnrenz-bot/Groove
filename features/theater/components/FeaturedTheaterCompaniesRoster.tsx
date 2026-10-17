'use client';

import React, { useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FEATURED_THEATER_COMPANIES, type TheaterCompany } from '../data/theaterCompanies';
import { TheaterCompanyDossierCard } from './TheaterCompanyDossierCard';
import { cn } from '@/components/shared/cn';

export function FeaturedTheaterCompaniesRoster() {
  const [selectedCompany, setSelectedCompany] = useState<TheaterCompany>(
    FEATURED_THEATER_COMPANIES[0]
  );

  return (
    <section id="featured-theater" aria-labelledby="featured-theater-title" className="scroll-mt-24">
      <SectionHeader
        eyebrow="Historic Production Houses &amp; Musical Producers"
        title={
          <span id="featured-theater-title">
            Featured <span className="font-normal italic text-muted-foreground">Theater Companies</span>
          </span>
        }
        description="PETA, Repertory Philippines, Tanghalang Pilipino, and the Virgin Labfest. Production dossiers and creative team rosters."
      />

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Select featured theater company">
        {FEATURED_THEATER_COMPANIES.map((comp) => {
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
        <TheaterCompanyDossierCard company={selectedCompany} />
      </div>
    </section>
  );
}
