'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FEATURED_CREWS, type Crew } from '../data/crews';
import { getLeagueById } from '../data/leagues';
import type { League } from '@/lib/dance/contracts';
export type { ScopeFilter };
import { cn } from '@/components/shared/cn';
import { SectionHeader } from './SectionHeader';
import { CrewChips } from './CrewChips';
import { CrewDossierCard } from './CrewDossierCard';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

import type { LeagueScopeFilter as ScopeFilter } from '@/lib/dance/contracts';

const SCOPE_OPTIONS: Array<{ value: ScopeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'international', label: 'International' },
  { value: 'philippines', label: 'Philippines' },
];

function findCrewFromUrl(): Crew | null {
  if (typeof window === 'undefined') return null;
  const slug = new URLSearchParams(window.location.search).get('crew');
  if (!slug) return null;
  return FEATURED_CREWS.find((crew) => crew.slug === slug) ?? null;
}

export function FeaturedCrewsRoster({
  leagueId,
  scope,
  onScopeChange,
}: {
  /** Controlled by the page so ?scope= is shared with the league filter. */
  leagueId?: string;
  scope: ScopeFilter;
  onScopeChange: (scope: ScopeFilter) => void;
}) {
  const [selectedCrew, setSelectedCrew] = useState<Crew>(() => findCrewFromUrl() ?? FEATURED_CREWS[0]);
  // True when the current selection came from a shared ?crew= deep link — in
  // that case the shared link must win over the visible (filtered) list.
  const deepLinkedRef = useRef<boolean>(findCrewFromUrl() !== null);

  const activeLeague: League | null = leagueId && leagueId !== 'all' ? getLeagueById(leagueId) : null;

  // Follow browser back/forward for ?crew= so a shared URL and the visible
  // dossier can never disagree.
  useEffect(() => {
    const syncFromUrl = () => {
      const crew = findCrewFromUrl();
      if (crew) setSelectedCrew(crew);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const visibleCrews = useMemo(
    () =>
      FEATURED_CREWS.filter((crew) => {
        if (scope !== 'all' && crew.scope !== scope) return false;
        if (activeLeague && !crew.leagueIds.includes(activeLeague.id)) return false;
        return true;
      }),
    [scope, activeLeague]
  );

  // When filters hide the selected crew, fall back to the first visible one.
  // A crew opened via shared ?crew= link is never swapped out from under.
  useEffect(() => {
    if (visibleCrews.length === 0) return;
    if (deepLinkedRef.current) return;
    if (!visibleCrews.some((crew) => crew.id === selectedCrew.id)) {
      setSelectedCrew(visibleCrews[0]);
    }
  }, [visibleCrews, selectedCrew.id]);

  const handleSelectCrew = useCallback((crew: Crew) => {
    setSelectedCrew(crew);
    deepLinkedRef.current = false;
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

        {/* Scope toggle + result count */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter crews by scope"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--crew-border)] bg-[var(--crew-bg-card)] p-1"
          >
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onScopeChange(option.value)}
                aria-pressed={scope === option.value}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crew-accent-gold)]',
                  scope === option.value
                    ? 'bg-[var(--crew-accent-gold)] text-[var(--crew-on-gold)] shadow-sm'
                    : 'text-[var(--crew-text-muted)] hover:text-[var(--crew-text)]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--crew-text-muted)]" aria-live="polite">
            {visibleCrews.length === 1 ? '1 crew' : `${visibleCrews.length} crews`}
            {activeLeague ? ` · ${activeLeague.shortName}` : ''}
          </p>
        </div>

        {visibleCrews.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
              title="No crews match these filters"
              description={
                activeLeague
                  ? `No verified crews tied to ${activeLeague.name} yet. Try a different league or scope.`
                  : 'Try a different scope.'
              }
              action={
                <button
                  type="button"
                  onClick={() => onScopeChange('all')}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  Reset scope
                </button>
              }
            />
          </div>
        ) : (
          <>
            <CrewChips
              crews={visibleCrews}
              selectedCrew={selectedCrew}
              onSelectCrew={handleSelectCrew}
            />

            <div className="mt-8" role="region" aria-label={`${selectedCrew.name} dossier`}>
              <CrewDossierCard crew={selectedCrew} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default FeaturedCrewsRoster;

