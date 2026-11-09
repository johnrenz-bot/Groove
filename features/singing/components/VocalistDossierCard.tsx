'use client';

import React from 'react';
import type { VocalEnsemble } from '../data/vocalists';
import { PerformingArtsDossierCard } from '@/features/performing-arts/components/PerformingArtsDossierCard';

interface VocalistDossierCardProps {
  ensemble: VocalEnsemble;
}

export function VocalistDossierCard({ ensemble }: VocalistDossierCardProps) {
  return (
    <PerformingArtsDossierCard
      entity={ensemble}
      kindLabel="Ensemble"
      panelPrefix="ensemble"
      pagePath="/community/performing-arts/singing"
      discipline="singing"
      labels={{
        honours: 'Choral milestones',
        people: 'Key directors & leaders',
        recaps: 'Showcase & recaps',
        officialSite: 'Official ensemble site',
      }}
    />
  );
}

export default VocalistDossierCard;
