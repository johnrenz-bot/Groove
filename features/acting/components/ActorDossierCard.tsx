'use client';

import React from 'react';
import type { ActingCompany } from '../data/actors';
import { PerformingArtsDossierCard } from '@/features/performing-arts/components/PerformingArtsDossierCard';

interface ActorDossierCardProps {
  company: ActingCompany;
}

export function ActorDossierCard({ company }: ActorDossierCardProps) {
  return (
    <PerformingArtsDossierCard
      entity={company}
      kindLabel="Company"
      panelPrefix="company"
      pagePath="/community/performing-arts/acting"
      discipline="acting"
      labels={{
        honours: 'Dramatic honors',
        people: 'Directors & master actors',
        recaps: 'Landmark productions',
        officialSite: 'Official company site',
      }}
    />
  );
}

export default ActorDossierCard;
