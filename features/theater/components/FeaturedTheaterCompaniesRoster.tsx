'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FEATURED_THEATER_COMPANIES, type TheaterCompany } from '../data/theaterCompanies';
import { TheaterCompanyDossierCard } from './TheaterCompanyDossierCard';
import { ChevronLeft, ChevronRight, Globe, Flag } from 'lucide-react';
import { cn } from '@/components/shared/cn';

const regionOptions = [
  { value: 'all', label: 'All', icon: Globe },
  { value: 'ph', label: 'PH', icon: Flag },
  { value: 'intl', label: 'Intl', icon: Globe },
] as const;

export function FeaturedTheaterCompaniesRoster() {
  const [selectedCompany, setSelectedCompany] = useState<TheaterCompany>(
    FEATURED_THEATER_COMPANIES[0]
  );
  const [regionFilter, setRegionFilter] = useState<'all' | 'ph' | 'intl'>('all');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const chipsRef = React.useRef<HTMLDivElement>(null);

  const filteredCompanies = React.useMemo(() => {
    if (regionFilter === 'all') return FEATURED_THEATER_COMPANIES;
    if (regionFilter === 'ph')
      return FEATURED_THEATER_COMPANIES.filter((c) => c.country === 'Philippines');
    return FEATURED_THEATER_COMPANIES.filter((c) => c.country !== 'Philippines');
  }, [regionFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const regionParam = params.get('theater-region') as 'all' | 'ph' | 'intl' | null;
    const compParam = params.get('theater-company');
    if (regionParam && ['all', 'ph', 'intl'].includes(regionParam)) setRegionFilter(regionParam);
    if (compParam) {
      const found = FEATURED_THEATER_COMPANIES.find((c) => c.slug === compParam);
      if (found) setSelectedCompany(found);
    }
  }, []);

  const handleSelectCompany = useCallback((comp: TheaterCompany) => {
    setSelectedCompany(comp);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('theater-company', comp.slug);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    }
  }, []);

  const handleRegionChange = useCallback(
    (filter: 'all' | 'ph' | 'intl') => {
      setRegionFilter(filter);
      const nextList =
        filter === 'all'
          ? FEATURED_THEATER_COMPANIES
          : filter === 'ph'
          ? FEATURED_THEATER_COMPANIES.filter((c) => c.country === 'Philippines')
          : FEATURED_THEATER_COMPANIES.filter((c) => c.country !== 'Philippines');
      if (nextList.length > 0 && !nextList.some((c) => c.id === selectedCompany.id)) {
        setSelectedCompany(nextList[0]);
      }
    },
    [selectedCompany]
  );

  useEffect(() => {
    if (chipsRef.current) {
      const sel = chipsRef.current.querySelector('[aria-selected="true"]');
      if (sel) sel.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedCompany.id, regionFilter]);

  const scrollLeft = useCallback(() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' }), []);
  const scrollRight = useCallback(() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' }), []);

  return (
    <section
      id="featured-theater"
      aria-labelledby="featured-theater-title"
      className="scroll-mt-24 bg-[var(--crew-bg-page)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader
          eyebrow="Historic production houses & theatrical institutions"
          title={
            <span id="featured-theater-title">
              Featured <span className="font-normal italic text-[var(--crew-text-muted)]">Theater Companies, Stage Actors & Productions</span>
            </span>
          }
          description="PETA, Repertory Philippines, Tanghalang Pilipino, Virgin Labfest, Atlantis Theatrical, and 9 Works. Production dossiers, Gawad Buhay award records, and creative team rosters."
        />

        {/* Region Filter Toggle */}
        <div role="group" aria-label="Filter theater companies by region" className="flex items-center justify-between mt-8 mb-4">
          <div className="inline-flex items-center gap-1 rounded-full bg-[var(--crew-bg-tile)] border crew-bd p-1">
            {regionOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRegionChange(value as 'all' | 'ph' | 'intl')}
                aria-pressed={regionFilter === value}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]',
                  regionFilter === value
                    ? 'bg-[var(--crew-accent-gold)] text-[var(--crew-bg-page)] shadow-sm'
                    : 'text-[var(--crew-text-muted)] hover:bg-[var(--crew-bg-hover)] hover:text-[var(--crew-text-primary)]'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Company Chips Row */}
        <div
          ref={scrollRef}
          className="relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--crew-bg-page)] to-transparent z-10"
            aria-hidden="true"
          />
          <div
            ref={chipsRef}
            role="tablist"
            aria-label="Featured theater companies"
            className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {filteredCompanies.map((comp) => {
              const isSelected = selectedCompany.id === comp.id;
              const initials = comp.name
                .split(/\s+/)
                .map((w) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();
              return (
                <button
                  key={comp.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`theater-panel-${comp.id}`}
                  id={`theater-tab-${comp.id}`}
                  onClick={() => handleSelectCompany(comp)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 min-h-[44px] text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)] snap-start',
                    isSelected
                      ? 'bg-[var(--crew-accent-gold)] text-[var(--crew-bg-page)] shadow-sm ring-1 ring-[color:var(--crew-accent-gold)]'
                      : 'bg-[var(--crew-bg-tile)] text-[var(--crew-text-body)] border crew-bd hover:bg-[var(--crew-bg-hover)] hover:crew-bd-hover hover:text-[var(--crew-text-primary)]'
                  )}
                >
                  {comp.logo?.verified && comp.logo.url ? (
                    <img
                      src={comp.logo.url}
                      alt=""
                      className="h-4 w-4 rounded-full object-contain ring-1 ring-[color:var(--crew-border)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[var(--crew-border)] text-[var(--crew-accent-gold)] text-[10px] font-bold"
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                  )}
                  <span className="whitespace-nowrap">{comp.name}</span>
                </button>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--crew-bg-page)] to-transparent z-10"
            aria-hidden="true"
          />
        </div>

        {/* Scroll arrows */}
        <div className="hidden md:flex items-center justify-end gap-2 mt-2 mb-6">
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll theater companies left"
            className="rounded-full p-2 bg-[var(--crew-bg-tile)] border crew-bd text-[var(--crew-text-muted)] hover:bg-[var(--crew-bg-hover)] hover:crew-bd-hover hover:text-[var(--crew-text-primary)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll theater companies right"
            className="rounded-full p-2 bg-[var(--crew-bg-tile)] border crew-bd text-[var(--crew-text-muted)] hover:bg-[var(--crew-bg-hover)] hover:crew-bd-hover hover:text-[var(--crew-text-primary)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Active Dossier Card */}
        <div role="region" aria-label={`${selectedCompany.name} dossier`}>
          <TheaterCompanyDossierCard company={selectedCompany} />
        </div>
      </div>
    </section>
  );
}

export default FeaturedTheaterCompaniesRoster;
