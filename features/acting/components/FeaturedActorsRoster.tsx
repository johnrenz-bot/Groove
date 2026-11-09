'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FeaturedRosterSelector } from '@/features/performing-arts/components/FeaturedRosterSelector';
import { FEATURED_ACTING_COMPANIES, type ActingCompany } from '../data/actors';
import { ActorDossierCard } from './ActorDossierCard';

function findCompanyFromUrl(): ActingCompany | null {
  if (typeof window === 'undefined') return null;
  const slug = new URLSearchParams(window.location.search).get('company');
  if (!slug) return null;
  return FEATURED_ACTING_COMPANIES.find((company) => company.slug === slug) ?? null;
}

export function FeaturedActorsRoster() {
  const [selectedCompany, setSelectedCompany] = useState<ActingCompany>(
    FEATURED_ACTING_COMPANIES[0]
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

  const handleSelectCompany = useCallback((company: ActingCompany) => {
    setSelectedCompany(company);
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('company', company.slug);
    const newQuery = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`
    );
  }, []);

  const handleSelectById = useCallback(
    (id: string) => {
      const company = FEATURED_ACTING_COMPANIES.find((item) => item.id === id);
      if (company) handleSelectCompany(company);
    },
    [handleSelectCompany]
  );

  return (
    <section
      id="featured-actors"
      aria-labelledby="featured-actors-title"
      className="scroll-mt-24 bg-[var(--crew-bg-page)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Verified acting company dossiers & landmark productions"
          title={
            <span id="featured-actors-title">
              Featured{' '}
              <span className="font-normal italic text-[var(--crew-text-muted)]">
                Actors, Acting Groups &amp; Screen Artists
              </span>
            </span>
          }
          description="CCP resident companies, PETA, Repertory Philippines, and Cinemalaya alumni. Production dossiers, master artist rosters, and Gawad Buhay award records."
        />

        <FeaturedRosterSelector
          items={FEATURED_ACTING_COMPANIES.map((company) => ({
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
          idPrefix="company"
          label="Select a company"
          tablistLabel="Featured acting companies"
        />

        <div className="mt-8" role="region" aria-label={`${selectedCompany.name} dossier`}>
          <ActorDossierCard company={selectedCompany} />
        </div>
      </div>
    </section>
  );
}

export default FeaturedActorsRoster;
