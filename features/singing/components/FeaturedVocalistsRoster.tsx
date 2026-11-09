'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FeaturedRosterSelector } from '@/features/performing-arts/components/FeaturedRosterSelector';
import { FEATURED_VOCAL_ENSEMBLES, type VocalEnsemble } from '../data/vocalists';
import { VocalistDossierCard } from './VocalistDossierCard';

function findEnsembleFromUrl(): VocalEnsemble | null {
  if (typeof window === 'undefined') return null;
  const slug = new URLSearchParams(window.location.search).get('ensemble');
  if (!slug) return null;
  return FEATURED_VOCAL_ENSEMBLES.find((ensemble) => ensemble.slug === slug) ?? null;
}

export function FeaturedVocalistsRoster() {
  const [selectedEnsemble, setSelectedEnsemble] = useState<VocalEnsemble>(
    FEATURED_VOCAL_ENSEMBLES[0]
  );

  useEffect(() => {
    const syncFromUrl = () => {
      const ensemble = findEnsembleFromUrl();
      if (ensemble) setSelectedEnsemble(ensemble);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const handleSelectEnsemble = useCallback((ensemble: VocalEnsemble) => {
    setSelectedEnsemble(ensemble);
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('ensemble', ensemble.slug);
    const newQuery = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`
    );
  }, []);

  const handleSelectById = useCallback(
    (id: string) => {
      const ensemble = FEATURED_VOCAL_ENSEMBLES.find((item) => item.id === id);
      if (ensemble) handleSelectEnsemble(ensemble);
    },
    [handleSelectEnsemble]
  );

  return (
    <section
      id="featured-ensembles"
      aria-labelledby="featured-ensembles-title"
      className="scroll-mt-24 bg-[var(--crew-bg-page)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Verified choral dossiers & competition records"
          title={
            <span id="featured-ensembles-title">
              Featured{' '}
              <span className="font-normal italic text-[var(--crew-text-muted)]">
                Singers, Choirs &amp; Vocal Groups
              </span>
            </span>
          }
          description="World Grand Prix winners, UNESCO Artists for Peace, and the Philippines' most celebrated vocal ensembles. Only verified competition results and officially published media."
        />

        <FeaturedRosterSelector
          items={FEATURED_VOCAL_ENSEMBLES.map((ensemble) => ({
            id: ensemble.id,
            name: ensemble.name,
            country: ensemble.country,
            flag: ensemble.flag,
            division: ensemble.division,
            image: ensemble.image,
            logo: ensemble.logo,
          }))}
          selectedId={selectedEnsemble.id}
          onSelect={handleSelectById}
          idPrefix="ensemble"
          label="Select an ensemble"
          tablistLabel="Featured vocal ensembles"
        />

        <div className="mt-8" role="region" aria-label={`${selectedEnsemble.name} dossier`}>
          <VocalistDossierCard ensemble={selectedEnsemble} />
        </div>
      </div>
    </section>
  );
}

export default FeaturedVocalistsRoster;
