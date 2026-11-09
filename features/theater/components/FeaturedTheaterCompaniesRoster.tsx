'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FeaturedRosterSelector } from '@/features/performing-arts/components/FeaturedRosterSelector';
import { FEATURED_THEATER_COMPANIES, type TheaterCompany } from '../data/theaterCompanies';
import { TheaterCompanyDossierCard } from './TheaterCompanyDossierCard';

function findCompanyFromUrl(): TheaterCompany | null {
  if (typeof window === 'undefined') return null;
  const slug = new URLSearchParams(window.location.search).get('theater-company');
  if (!slug) return null;
  return FEATURED_THEATER_COMPANIES.find((company) => company.slug === slug) ?? null;
}

export function FeaturedTheaterCompaniesRoster() {
  const [selectedCompany, setSelectedCompany] = useState<TheaterCompany>(
    FEATURED_THEATER_COMPANIES[0]
  );

  useEffect(() => {
    const syncFromUrl = () => {
      const company = findCompanyFromUrl();
      if (company) setSelectedCompany(company);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const handleSelectCompany = useCallback((company: TheaterCompany) => {
    setSelectedCompany(company);
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('theater-company', company.slug);
    const newQuery = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`
    );
  }, []);

  const handleSelectById = useCallback(
    (id: string) => {
      const company = FEATURED_THEATER_COMPANIES.find((item) => item.id === id);
      if (company) handleSelectCompany(company);
    },
    [handleSelectCompany]
  );

  return (
    <section
      id="featured-theater"
      aria-labelledby="featured-theater-title"
      className="scroll-mt-24 bg-[var(--crew-bg-page)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Historic production houses & theatrical institutions"
          title={
            <span id="featured-theater-title">
              Featured{' '}
              <span className="font-normal italic text-[var(--crew-text-muted)]">
                Theater Companies, Stage Actors &amp; Productions
              </span>
            </span>
          }
          description="PETA, Repertory Philippines, Tanghalang Pilipino, Virgin Labfest, Atlantis Theatrical, and 9 Works. Production dossiers, Gawad Buhay award records, and creative team rosters."
        />

        <FeaturedRosterSelector
          items={FEATURED_THEATER_COMPANIES.map((company) => ({
            id: company.id,
            name: company.name,
            country: company.country,
            flag: company.flag,
            division: company.division,
            image: company.image,
            logo: company.logo,
          }))}
          selectedId={selectedCompany.id}
          onSelect={handleSelectById}
          idPrefix="theater"
          label="Select a theater company"
          tablistLabel="Featured theater companies"
        />

        <div className="mt-8" role="region" aria-label={`${selectedCompany.name} dossier`}>
          <TheaterCompanyDossierCard company={selectedCompany} />
        </div>
      </div>
    </section>
  );
}

export default FeaturedTheaterCompaniesRoster;
