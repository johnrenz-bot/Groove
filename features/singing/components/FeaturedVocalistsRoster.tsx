'use client';

import React, { useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FEATURED_VOCAL_ENSEMBLES, type VocalEnsemble } from '../data/vocalists';
import { VocalistDossierCard } from './VocalistDossierCard';
import { cn } from '@/components/shared/cn';

export function FeaturedVocalistsRoster() {
  const [selectedEnsemble, setSelectedEnsemble] = useState<VocalEnsemble>(
    FEATURED_VOCAL_ENSEMBLES[0]
  );

  return (
    <section id="featured-ensembles" aria-labelledby="featured-ensembles-title" className="scroll-mt-24">
      <SectionHeader
        eyebrow="World-Class Vocal Ensembles & Master Chorales"
        title={
          <span id="featured-ensembles-title">
            Featured <span className="font-normal italic text-muted-foreground">Ensembles &amp; Vocalists</span>
          </span>
        }
        description="European Grand Prix winners and international Choir of the World champions. Verified performance records and choral dossiers."
      />

      {/* Ensemble Selector Chips */}
      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Select featured choral ensemble">
        {FEATURED_VOCAL_ENSEMBLES.map((ens) => {
          const isSelected = selectedEnsemble.id === ens.id;
          return (
            <button
              key={ens.id}
              type="button"
              onClick={() => setSelectedEnsemble(ens)}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isSelected
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground'
              )}
            >
              <span>{ens.flag}</span>
              <span>{ens.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Dossier Card */}
      <div className="mt-6" role="region" aria-label={`${selectedEnsemble.name} dossier`}>
        <VocalistDossierCard ensemble={selectedEnsemble} />
      </div>
    </section>
  );
}
