'use client';

import React, { useCallback } from 'react';
import { FeaturedRosterSelector } from '@/features/performing-arts/components/FeaturedRosterSelector';
import type { Crew } from '@/lib/dance/contracts';

interface CrewChipsProps {
  crews: Crew[];
  selectedCrew: Crew;
  onSelectCrew: (crew: Crew) => void;
}

/**
 * Dance keeps its own wrapper so the page's API stays `CrewChips`, but the
 * card rail itself is the shared performing-arts selector. That is what keeps
 * the four discipline pages visually identical.
 */
export function CrewChips({ crews, selectedCrew, onSelectCrew }: CrewChipsProps) {
  const handleSelect = useCallback(
    (id: string) => {
      const crew = crews.find((item) => item.id === id);
      if (crew) onSelectCrew(crew);
    },
    [crews, onSelectCrew]
  );

  return (
    <FeaturedRosterSelector
      items={crews.map((crew) => ({
        id: crew.id,
        name: crew.name,
        country: crew.country,
        flag: crew.flag,
        division: crew.division ?? '',
        image:
          crew.heroImageUrl != null
            ? { url: crew.heroImageUrl, alt: `${crew.name} — official team photo` }
            : null,
        logo: crew.logo ? { url: crew.logo.url, verified: crew.logo.verified } : null,
      }))}
      selectedId={selectedCrew.id}
      onSelect={handleSelect}
      idPrefix="crew"
      label="Select a crew"
      tablistLabel="Featured crews"
    />
  );
}

export default CrewChips;

