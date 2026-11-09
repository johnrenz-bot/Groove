'use client';

import React from 'react';
import type { TheaterCompany } from '../data/theaterCompanies';
import { PerformingArtsDossierCard } from '@/features/performing-arts/components/PerformingArtsDossierCard';

interface TheaterCompanyDossierCardProps {
  company: TheaterCompany;
}

export function TheaterCompanyDossierCard({ company }: TheaterCompanyDossierCardProps) {
  return (
    <PerformingArtsDossierCard
      entity={company}
      kindLabel="Company"
      panelPrefix="theater"
      pagePath="/community/performing-arts/theater"
      discipline="theater"
      labels={{
        honours: 'Theatrical honors',
        people: 'Creative directors & designers',
        recaps: 'Historic premieres',
        officialSite: 'Official production site',
      }}
    />
  );
}

export default TheaterCompanyDossierCard;
