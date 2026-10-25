'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { FEATURED_VOCAL_ENSEMBLES, type VocalEnsemble } from '../data/vocalists';
import { VocalistDossierCard } from './VocalistDossierCard';
import { ChevronLeft, ChevronRight, Globe, Flag } from 'lucide-react';
import { cn } from '@/components/shared/cn';

const regionOptions = [
  { value: 'all', label: 'All', icon: Globe },
  { value: 'ph', label: 'PH', icon: Flag },
  { value: 'intl', label: 'Intl', icon: Globe },
] as const;

export function FeaturedVocalistsRoster() {
  const [selectedEnsemble, setSelectedEnsemble] = useState<VocalEnsemble>(
    FEATURED_VOCAL_ENSEMBLES[0]
  );
  const [regionFilter, setRegionFilter] = useState<'all' | 'ph' | 'intl'>('all');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const chipsRef = React.useRef<HTMLDivElement>(null);

  const filteredEnsembles = React.useMemo(() => {
    if (regionFilter === 'all') return FEATURED_VOCAL_ENSEMBLES;
    if (regionFilter === 'ph')
      return FEATURED_VOCAL_ENSEMBLES.filter((e) => e.country === 'Philippines');
    return FEATURED_VOCAL_ENSEMBLES.filter((e) => e.country !== 'Philippines');
  }, [regionFilter]);

  // Sync URL params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const regionParam = params.get('singing-region') as 'all' | 'ph' | 'intl' | null;
    const ensParam = params.get('ensemble');
    if (regionParam && ['all', 'ph', 'intl'].includes(regionParam)) setRegionFilter(regionParam);
    if (ensParam) {
      const found = FEATURED_VOCAL_ENSEMBLES.find((e) => e.slug === ensParam);
      if (found) setSelectedEnsemble(found);
    }
  }, []);

  const handleSelectEnsemble = useCallback((ens: VocalEnsemble) => {
    setSelectedEnsemble(ens);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('ensemble', ens.slug);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    }
  }, []);

  const handleRegionChange = useCallback(
    (filter: 'all' | 'ph' | 'intl') => {
      setRegionFilter(filter);
      const nextList =
        filter === 'all'
          ? FEATURED_VOCAL_ENSEMBLES
          : filter === 'ph'
          ? FEATURED_VOCAL_ENSEMBLES.filter((e) => e.country === 'Philippines')
          : FEATURED_VOCAL_ENSEMBLES.filter((e) => e.country !== 'Philippines');
      if (nextList.length > 0 && !nextList.some((e) => e.id === selectedEnsemble.id)) {
        setSelectedEnsemble(nextList[0]);
      }
    },
    [selectedEnsemble]
  );

  // Scroll selected chip into view
  useEffect(() => {
    if (chipsRef.current) {
      const sel = chipsRef.current.querySelector('[aria-selected="true"]');
      if (sel) sel.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedEnsemble.id, regionFilter]);

  const scrollLeft = useCallback(() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' }), []);
  const scrollRight = useCallback(() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' }), []);

  return (
    <section
      id="featured-ensembles"
      aria-labelledby="featured-ensembles-title"
      className="scroll-mt-24 bg-[var(--crew-bg-page)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader
          eyebrow="Verified choral dossiers & competition records"
          title={
            <span id="featured-ensembles-title">
              Featured <span className="font-normal italic text-[var(--crew-text-muted)]">Singers, Choirs & Vocal Groups</span>
            </span>
          }
          description="World Grand Prix winners, UNESCO Artists for Peace, and Philippine's most celebrated vocal ensembles. Only verified competition results and official media."
        />

        {/* Region Filter Toggle */}
        <div role="group" aria-label="Filter ensembles by region" className="flex items-center justify-between mt-8 mb-4">
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

        {/* Ensemble Chips Row */}
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
            aria-label="Featured vocal ensembles"
            className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {filteredEnsembles.map((ens) => {
              const isSelected = selectedEnsemble.id === ens.id;
              return (
                <button
                  key={ens.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`ensemble-panel-${ens.id}`}
                  id={`ensemble-tab-${ens.id}`}
                  onClick={() => handleSelectEnsemble(ens)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 min-h-[44px] text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)] snap-start',
                    isSelected
                      ? 'bg-[var(--crew-accent-gold)] text-[var(--crew-bg-page)] shadow-sm ring-1 ring-[color:var(--crew-accent-gold)]'
                      : 'bg-[var(--crew-bg-tile)] text-[var(--crew-text-body)] border crew-bd hover:bg-[var(--crew-bg-hover)] hover:crew-bd-hover hover:text-[var(--crew-text-primary)]'
                  )}
                >
                  <span aria-hidden="true">{ens.flag}</span>
                  <span className="whitespace-nowrap">{ens.name}</span>
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
            aria-label="Scroll ensembles left"
            className="rounded-full p-2 bg-[var(--crew-bg-tile)] border crew-bd text-[var(--crew-text-muted)] hover:bg-[var(--crew-bg-hover)] hover:crew-bd-hover hover:text-[var(--crew-text-primary)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll ensembles right"
            className="rounded-full p-2 bg-[var(--crew-bg-tile)] border crew-bd text-[var(--crew-text-muted)] hover:bg-[var(--crew-bg-hover)] hover:crew-bd-hover hover:text-[var(--crew-text-primary)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Active Dossier Card */}
        <div role="region" aria-label={`${selectedEnsemble.name} dossier`}>
          <VocalistDossierCard ensemble={selectedEnsemble} />
        </div>
      </div>
    </section>
  );
}

export default FeaturedVocalistsRoster;
