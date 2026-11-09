'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FEATURED_CREWS, type DanceCrew } from '../data/crews';
import { SectionHeader } from './SectionHeader';
import { CrewChips } from './CrewChips';
import { CrewDossierCard } from './CrewDossierCard';

function findCrewFromUrl(): DanceCrew | null {
  if (typeof window === 'undefined') return null;
  const slug = new URLSearchParams(window.location.search).get('crew');
  if (!slug) return null;
  return FEATURED_CREWS.find((crew) => crew.slug === slug) ?? null;
}

export function FeaturedCrewsRoster() {
  const [selectedCrew, setSelectedCrew] = useState<DanceCrew>(FEATURED_CREWS[0]);

  // Read the deep link once on mount, then follow browser back/forward so a
  // shared ?crew= URL and the visible dossier can never disagree.
  useEffect(() => {
    const syncFromUrl = () => {
      const crew = findCrewFromUrl();
      if (crew) setSelectedCrew(crew);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // Only the roster's own parameter is touched. Update-feed filters such as
  // ?region, ?category and ?org belong to the page and must survive a crew
  // selection.
  const handleSelectCrew = useCallback((crew: DanceCrew) => {
    setSelectedCrew(crew);
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('crew', crew.slug);
    const newQuery = params.toString();
    const newUrl = newQuery
      ? `${window.location.pathname}?${newQuery}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  return (
    <section
      id="featured-crews"
      aria-labelledby="featured-crews-title"
      className="scroll-mt-24 bg-[var(--crew-bg-page)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Verified crew dossiers & match records"
          title={
            <span id="featured-crews-title">
              Featured{' '}
              <span className="font-normal italic text-[var(--crew-text-muted)]">
                Crews &amp; Athletes
              </span>
            </span>
          }
          description="World Champion franchise teams and Philippine battle contenders. Only verified competition results and officially published team media."
        />

        <CrewChips
          crews={FEATURED_CREWS}
          selectedCrew={selectedCrew}
          onSelectCrew={handleSelectCrew}
        />

        <div className="mt-8" role="region" aria-label={`${selectedCrew.name} dossier`}>
          <CrewDossierCard crew={selectedCrew} />
        </div>
      </div>
    </section>
  );
}

export default FeaturedCrewsRoster;
