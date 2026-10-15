'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/components/shared/cn';
import { FEATURED_CREWS, type DanceCrew } from '../data/crews';
import { SectionHeader } from './SectionHeader';
import { CrewChips } from './CrewChips';
import { CrewDossierCard } from './CrewDossierCard';

export function FeaturedCrewsRoster() {
  const [selectedCrew, setSelectedCrew] = useState<DanceCrew>(FEATURED_CREWS[0]);
  const [regionFilter, setRegionFilter] = useState<'all' | 'ph' | 'intl'>('all');

  // Sync with URL params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const crewParam = params.get('crew');
    const regionParam = params.get('region') as 'all' | 'ph' | 'intl' | null;

    if (regionParam && ['all', 'ph', 'intl'].includes(regionParam)) {
      setRegionFilter(regionParam);
    }

    if (crewParam) {
      const crew = FEATURED_CREWS.find((c) => c.slug === crewParam);
      if (crew) {
        setSelectedCrew(crew);
      }
    }
  }, []);

  // Update URL when selection changes
  const handleSelectCrew = useCallback((crew: DanceCrew) => {
    setSelectedCrew(crew);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('crew', crew.slug);
      const newQuery = params.toString();
      const newUrl = newQuery
        ? `${window.location.pathname}?${newQuery}${window.location.hash}`
        : `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  const handleRegionFilterChange = useCallback((filter: 'all' | 'ph' | 'intl') => {
    setRegionFilter(filter);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (filter !== 'all') {
        params.set('region', filter);
      } else {
        params.delete('region');
      }
      const newQuery = params.toString();
      const newUrl = newQuery
        ? `${window.location.pathname}?${newQuery}${window.location.hash}`
        : `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  return (
    <section
      id="featured-crews"
      aria-labelledby="featured-crews-title"
      className="scroll-mt-24 bg-[#0A0A0A]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader
          eyebrow="Verified crew dossiers & match records"
          title={
            <span id="featured-crews-title">
              Featured <span className="font-normal italic text-[#A39B87]">Crews & Athletes</span>
            </span>
          }
          description="World Champion franchise teams and Philippine battle contenders. Only verified competition results and official media."
        />

        {/* Crew Selector Chips with Region Filter */}
        <CrewChips
          crews={FEATURED_CREWS}
          selectedCrew={selectedCrew}
          onSelectCrew={handleSelectCrew}
          regionFilter={regionFilter}
          onRegionFilterChange={handleRegionFilterChange}
        />

        {/* Active Crew Dossier Card */}
        <div className="mt-8" role="region" aria-label={`${selectedCrew.name} dossier`}>
          <CrewDossierCard crew={selectedCrew} />
        </div>
      </div>
    </section>
  );
}

export default FeaturedCrewsRoster;