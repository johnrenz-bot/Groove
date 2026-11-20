'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/features/discipline/components/SectionHeader';
import { OrgLogoBar } from './OrgLogoBar.tsx';
import { UpdatesFilterBar } from './UpdatesFilterBar.tsx';
import { UpdateCard } from './UpdateCard.tsx';
import { UpcomingEventsSection, type EventTimeframe } from './UpcomingEventsSection.tsx';
import { FeaturedCrewsRoster } from './FeaturedCrewsRoster.tsx';
import { DanceUpdatesSkeletonGrid } from '@/features/discipline/components/DanceSkeletons';
import type { DanceUpdateRecord } from '../services/danceService.ts';
import { isUpcomingEvent } from '../services/danceService.ts';

import { leagueToDanceOrg } from '../data/danceOrgs.ts';
import { PUBLIC_LEAGUES, leagueForOrganization, lastSyncedAt } from '../data/leagues.ts';
import { OrgLogoCarouselClient } from '@/features/discipline/components/OrgLogoCarouselClient';
import { FEATURED_CREWS } from '../data/crews.ts';
import type { LeagueScopeFilter } from '@/lib/dance/contracts';
import { PerformingArtsNewsHubGuide } from '@/features/performing-arts/components/PerformingArtsNewsHubGuide';
import { DisciplinePageHeader } from '@/features/performing-arts/components/DisciplinePageHeader';
import { DisciplineHighlights } from '@/features/performing-arts/components/DisciplineHighlights';
import { AttributionFooter } from '@/features/performing-arts/components/AttributionFooter';
import {
  DISCIPLINE_PAGES,
  type DisciplineHighlight,
} from '@/features/performing-arts/data/disciplineMeta';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  SearchX,
  Sparkles,
  ChevronRight as ChevronRightSmall,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Breadcrumb for the dance community page.
 * Community / Performing Arts / Dance
 */
function Breadcrumb() {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <li>
          <Link
            href="/users"
            className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Community
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRightSmall className="h-3.5 w-3.5 text-muted-foreground/60" />
        </li>
        <li>
          <Link
            href="/performing-arts-philippines"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Performing Arts
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRightSmall className="h-3.5 w-3.5 text-muted-foreground/60" />
        </li>
        <li>
          <span className="font-semibold text-foreground">Dance</span>
        </li>
      </ol>
    </nav>
  );
}

/** The league registry (features/dance/data/leagues.ts) is the single source
 *  of truth for the marquee and chips — no external props required. */
export function DanceCommunityView() {
  // Filter states initialize directly from the URL on mount. Reading them in a
  // lazy initializer avoids a second render (and a duplicate fetch) that the
  // old "set state in an effect" pass caused.
  const [region, setRegion] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return new URLSearchParams(window.location.search).get('region') || 'all';
  });
  const [category, setCategory] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return new URLSearchParams(window.location.search).get('category') || 'all';
  });
  const [selectedOrg, setSelectedOrg] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    const params = new URLSearchParams(window.location.search);
    // ?league= is the canonical param; ?org= is read for backwards compatibility.
    return params.get('league') || params.get('org') || 'all';
  });
  const [leagueScope, setLeagueScope] = useState<LeagueScopeFilter>(() => {
    if (typeof window === 'undefined') return 'all';
    const scope = new URLSearchParams(window.location.search).get('scope');
    return scope === 'international' || scope === 'philippines' ? scope : 'all';
  });
  const [leagueQuery, setLeagueQuery] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') || '';
  });
  const [language, setLanguage] = useState<'en' | 'tl'>(() => {
    if (typeof window === 'undefined') return 'en';
    const lang = new URLSearchParams(window.location.search).get('lang');
    return lang === 'tl' ? 'tl' : 'en';
  });
  const [page, setPage] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const p = Number(new URLSearchParams(window.location.search).get('page'));
    return p > 0 ? p : 1;
  });

  // Data States
  const [updates, setUpdates] = useState<DanceUpdateRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DanceUpdateRecord[]>([]);
  const [pastEvents, setPastEvents] = useState<DanceUpdateRecord[]>([]);
  const [eventTimeframe, setEventTimeframe] = useState<EventTimeframe>('upcoming');
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // "Last synced" reflects the newest verification stamp in the verified league
  // registry — the editorial source the page is built from.
  const lastUpdated = useMemo(() => {
    try {
      return new Date(lastSyncedAt()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently verified';
    }
  }, []);

  // Sync state to URL params cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Start from the current query so roster deep links (?crew, ?ensemble,
    // ?company, ?theater-company) and any unrelated parameter survive.
    const params = new URLSearchParams(window.location.search);
    if (region !== 'all') params.set('region', region); else params.delete('region');
    if (category !== 'all') params.set('category', category); else params.delete('category');
    params.delete('org'); // legacy param, superseded by ?league=
    if (selectedOrg !== 'all') params.set('league', selectedOrg); else params.delete('league');
    if (leagueScope !== 'all') params.set('scope', leagueScope); else params.delete('scope');
    if (searchQuery.trim()) params.set('q', searchQuery.trim()); else params.delete('q');
    if (language !== 'en') params.set('lang', language); else params.delete('lang');
    if (page > 1) params.set('page', String(page)); else params.delete('page');

    const newQuery = params.toString();
    const newUrl = newQuery
      ? `${window.location.pathname}?${newQuery}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, [region, category, selectedOrg, leagueScope, searchQuery, language, page]);

  // Check if any filter is active
  const hasActiveFilters =
    region !== 'all' || category !== 'all' || selectedOrg !== 'all' || searchQuery.trim() !== '';

  // Fetch Updates
  const fetchUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (region !== 'all') params.set('region', region);
      if (category !== 'all') params.set('category', category);
      if (selectedOrg !== 'all') params.set('league', selectedOrg);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`/api/dance/updates?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      setUpdates(data.updates || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load dance updates:', err);
      setError('Unable to load latest dance updates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [region, category, selectedOrg, searchQuery, page]);

  // Fetch Upcoming Events + derive past events from the same verified feed.
  // Past is computed with the shared `isUpcomingEvent` rule (today stays
  // visible until end-of-day in Asia/Manila; missing/invalid dates are never
  // treated as upcoming), so the rail and the card badges cannot disagree.
  const fetchUpcomingEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOrg !== 'all') params.set('league', selectedOrg);
      const query = params.toString();
      const res = await fetch(`/api/dance/events/upcoming${query ? `?${query}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming events:', err);
    } finally {
      setEventsLoading(false);
    }

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (selectedOrg !== 'all') params.set('league', selectedOrg);
      const res = await fetch(`/api/dance/updates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const all: DanceUpdateRecord[] = data.updates || [];
        const past = all.filter((u) => {
          if (!u.event_date) return false;
          const when = new Date(u.event_date);
          if (Number.isNaN(when.getTime())) return false;
          if (!['event', 'competition', 'workshop'].includes(u.category)) return false;
          return !isUpcomingEvent(u);
        });
        setPastEvents(past);
      }
    } catch (err) {
      console.error('Failed to derive past events:', err);
    }
  }, [selectedOrg]);

  // Initial load & when filters change. The timer keeps the effect body free of
  // synchronous state updates and coalesces rapid filter changes into one fetch.
  useEffect(() => {
    const timer = window.setTimeout(fetchUpdates, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUpdates]);

  useEffect(() => {
    const timer = window.setTimeout(fetchUpcomingEvents, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUpcomingEvents]);

  // Reset pagination when filters change
  const handleSelectRegion = (reg: string) => {
    setRegion(reg);
    setPage(1);
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const handleSelectOrg = (orgId: string) => {
    setSelectedOrg(orgId);
    setPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleClearFilters = () => {
    setRegion('all');
    setCategory('all');
    setSelectedOrg('all');
    setLeagueScope('all');
    setLeagueQuery('');
    setSearchQuery('');
    setPage(1);
  };

  /**
   * The four top cards route into the existing live feed rather than opening a
   * second, static collection. `filter` is the same category/search the filter
   * bar already understands, so no new API surface is introduced.
   */
  const handleHighlightSelect = (item: DisciplineHighlight) => {
    handleSelectCategory(item.filter.category ?? 'all');
    handleSearchChange(item.filter.query ?? '');
    const target = document.getElementById('latest-updates');
    if (!target) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  // Distinct federations count from tracked organizations
  const federationsCount = useMemo(() => PUBLIC_LEAGUES.length, []);

  // Leagues visible under the active scope + search. Approved only — the
  // public marquee and chips never render needs-info entries.
  const visibleLeagues = useMemo(() => {
    const q = leagueQuery.trim().toLowerCase();
    return PUBLIC_LEAGUES.filter((league) => {
      if (leagueScope !== 'all' && league.scope !== leagueScope) return false;
      if (!q) return true;
      const hay = `${league.name} ${league.shortName} ${league.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [leagueScope, leagueQuery]);

  const visibleOrgs = useMemo(
    () => visibleLeagues.map((league, index) => leagueToDanceOrg(league, index)),
    [visibleLeagues]
  );

  // Counts per league chip: verified crews tied to the league + upcoming
  // events whose org text resolves to it (registry token match, never guessed).
  const crewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const crew of FEATURED_CREWS) {
      for (const leagueId of crew.leagueIds) {
        counts[leagueId] = (counts[leagueId] ?? 0) + 1;
      }
    }
    return counts;
  }, []);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const evt of upcomingEvents) {
      const league = leagueForOrganization(evt.organization ?? null);
      if (league) counts[league.id] = (counts[league.id] ?? 0) + 1;
    }
    return counts;
  }, [upcomingEvents]);

  const pageMeta = DISCIPLINE_PAGES.dance;

  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      {/* 0. Breadcrumb: Community / Performing Arts / Dance */}
      <Breadcrumb />

      {/* 1. Slim page header: title, audience, verification, counters, actions */}
      <DisciplinePageHeader
        eyebrow={pageMeta.eyebrow}
        title={pageMeta.title}
        accent={pageMeta.titleAccent}
        audience={pageMeta.audience}
        verifiedLabel="Editorial-verified against official league and federation sources"
        lastUpdated={lastUpdated}
        stats={[
          { label: 'Leagues', value: federationsCount },
          { label: 'Upcoming', value: upcomingEvents.length },
          { label: 'Dispatches', value: total },
        ]}
        primaryCta={{
          label: pageMeta.primaryCtaLabel,
          href: pageMeta.primaryCtaHref,
        }}
        secondaryCta={{
          label: pageMeta.findCoachesLabel,
          href: pageMeta.findCoachesHref,
        }}
        secondaryIcon={Sparkles}
      />

      {/* 2. Main content cards, immediately below the header */}
      <DisciplineHighlights items={pageMeta.highlights} onSelect={handleHighlightSelect} />

      {/* 3. Official League Logo Carousel */}
      <OrgLogoCarouselClient
        orgs={visibleOrgs}
        totalLeagues={PUBLIC_LEAGUES.length}
      />

      {/* 4. League filter bar: scope toggle, search, chips with counts */}
      <OrgLogoBar
        leagues={visibleLeagues}
        selectedOrg={selectedOrg}
        onSelectOrg={handleSelectOrg}
        scope={leagueScope}
        onScopeChange={setLeagueScope}
        query={leagueQuery}
        onQueryChange={setLeagueQuery}
        crewCounts={crewCounts}
        eventCounts={eventCounts}
      />

      {/* 5. Upcoming / Past Events Showcase Grid */}
      <UpcomingEventsSection
        events={upcomingEvents}
        pastEvents={pastEvents}
        loading={eventsLoading}
        timeframe={eventTimeframe}
        onTimeframeChange={setEventTimeframe}
        selectedOrg={selectedOrg}
        onClearFilters={handleClearFilters}
      />

      {/* 6. Latest Updates Section */}
      <section id="latest-updates" aria-labelledby="latest-updates-title" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Real-Time Discovery & Reporting"
          title={
            <span id="latest-updates-title">
              Latest <span className="font-normal text-muted-foreground">Updates</span>
            </span>
          }
          meta={
            <p>
              Showing <span className="font-semibold text-foreground">{updates.length}</span> of{' '}
              <span className="font-semibold text-accent-text">{total}</span> verified dispatches
            </p>
          }
        />
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Compiled from public sources. Always check the official source for final details.
        </p>

        {/* Filters Bar */}
        <div className="mt-6">
          <UpdatesFilterBar
            region={region}
            category={category}
            searchQuery={searchQuery}
            language={language}
            onSelectRegion={handleSelectRegion}
            onSelectCategory={handleSelectCategory}
            onSearchChange={handleSearchChange}
            onToggleLanguage={setLanguage}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Updates Feed Grid */}
        <div className="mt-6" aria-live="polite" aria-busy={loading}>
          {loading ? (
            <DanceUpdatesSkeletonGrid count={6} />
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-danger/40 bg-card p-8 text-center shadow-sm sm:p-10"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-danger/30 bg-danger-soft text-danger">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">{error}</p>
              <button
                type="button"
                onClick={() => fetchUpdates()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </button>
            </div>
          ) : updates.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
              title="No dispatches match these filters"
              description="There are no updates matching the selected category, league, or region. Try adjusting your filters."
              action={
                hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    Reset all filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {updates.map((update) => (
                <UpdateCard key={update.id} update={update} language={language} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <nav aria-label="Updates pages" className="mt-10 flex items-center justify-center gap-3 border-t border-divider pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev
            </button>

            <span className="px-3 text-xs tabular-nums text-muted-foreground" aria-current="page">
              Page <span className="font-semibold text-foreground">{page}</span> of{' '}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>

      {/* 7. Featured Crews & Match Recaps Roster */}
      <FeaturedCrewsRoster leagueId={selectedOrg} scope={leagueScope} onScopeChange={setLeagueScope} />

      {/* 8. Performing Arts News Hub Guide, Editorial Standards & Safety Disclaimer */}
      <PerformingArtsNewsHubGuide discipline="dance" />

      {/* Page attribution footer — not a duplicate of the site footer */}
      <AttributionFooter label="Dance community attribution">
        Logos, names, and trademarks belong to their respective owners. Groove is an independent
        directory and is not affiliated with or endorsed by these organizations.
      </AttributionFooter>
    </div>
  );
}

