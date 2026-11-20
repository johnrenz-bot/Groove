'use client';

/**
 * Shared community view for the three "beat" disciplines: singing, acting,
 * and theater. The pages are structurally identical — the only differences
 * are the API base, the org registry, the filter vocabulary, the roster and
 * craft sections, and a handful of copy strings, all held in SECTION_ORDER
 * below. Dance keeps its own view (its league registry drives extra state).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { SectionHeader } from './SectionHeader.tsx';
import { DisciplineOrgLogoBar } from './DisciplineOrgLogoBar.tsx';
import { DisciplineUpdatesFilterBar } from './DisciplineUpdatesFilterBar.tsx';
import { DisciplineUpdateCard } from './DisciplineUpdateCard.tsx';
import { DisciplineUpcomingEventsSection, type EventTimeframe } from './DisciplineUpcomingEventsSection.tsx';
import { DanceUpdatesSkeletonGrid } from './DanceSkeletons.tsx';
import type { DisciplineUpdateRecord } from '@/features/discipline/types';
import { isUpcomingEvent } from '@/features/discipline/services/disciplineService';
import type { DanceOrg } from '@/lib/dance/types';
import { SINGING_ORGANIZATIONS, VERIFIED_SINGING_ORGS } from '../../singing/data/singingOrgs.ts';
import { ACTING_ORGANIZATIONS, VERIFIED_ACTING_ORGS } from '../../acting/data/actingOrgs.ts';
import { THEATER_ORGANIZATIONS, VERIFIED_THEATER_ORGS } from '../../theater/data/theaterOrgs.ts';
import { OrgLogoCarouselClient } from './OrgLogoCarouselClient.tsx';
import { PerformingArtsNewsHubGuide } from '@/features/performing-arts/components/PerformingArtsNewsHubGuide';
import { DisciplinePageHeader } from '@/features/performing-arts/components/DisciplinePageHeader';
import { DisciplineHighlights } from '@/features/performing-arts/components/DisciplineHighlights';
import { AttributionFooter } from '@/features/performing-arts/components/AttributionFooter';
import { FeaturedVocalistsRoster } from '../../singing/components/FeaturedVocalistsRoster.tsx';
import { VocalTechniqueSection } from '../../singing/components/VocalTechniqueSection.tsx';
import { FeaturedActorsRoster } from '../../acting/components/FeaturedActorsRoster.tsx';
import { ActingCraftSection } from '../../acting/components/ActingCraftSection.tsx';
import { FeaturedTheaterCompaniesRoster } from '../../theater/components/FeaturedTheaterCompaniesRoster.tsx';
import { StageProductionCraftSection } from '../../theater/components/StageProductionCraftSection.tsx';
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

type BeatId = 'singing' | 'acting' | 'theater';
type RosterComponent = React.ComponentType;
type CraftComponent = React.ComponentType;

interface BeatViewConfig {
  id: BeatId;
  breadcrumb: string;
  apiBase: string;
  verifiedLabel: string;
  orgStatLabel: string;
  orgsTotal: number;
  organizations: readonly { id: string }[];
  verifiedOrgs: DanceOrg[];
  eyebrowLatest: string;
  latestIntro: string;
  emptyTitle: string;
  emptyDescription: string;
  attributionLabel: string;
  attributionText: string;
  Roster: RosterComponent;
  Craft: CraftComponent;
  rosterComment: string;
  craftComment: string;
}

const BEATS: Record<BeatId, BeatViewConfig> = {
  singing: {
    id: 'singing',
    breadcrumb: 'Singing',
    apiBase: '/api/singing',
    verifiedLabel: 'Editorial-verified against official choral, conservatory, and competition sources',
    orgStatLabel: 'Ensembles',
    orgsTotal: SINGING_ORGANIZATIONS.length - 1,
    organizations: SINGING_ORGANIZATIONS,
    verifiedOrgs: VERIFIED_SINGING_ORGS,
    eyebrowLatest: 'Real-Time Vocal Discovery & Reporting',
    latestIntro: 'Compiled from verified choral foundations, conservatories, and competition committees.',
    emptyTitle: 'No vocal dispatches match these filters',
    emptyDescription: 'There are no singing updates matching the selected category, choir, or region. Try adjusting your filters.',
    attributionLabel: 'Singing community attribution',
    attributionText:
      'Logos, choral names, and trademarks belong to their respective owners. Groove is an independent directory and is not affiliated with or endorsed by these choral organizations.',
    Roster: FeaturedVocalistsRoster,
    Craft: VocalTechniqueSection,
    rosterComment: 'Featured Vocal Ensembles Roster',
    craftComment: 'Vocal Technique, Warm-Ups & Training Hub',
  },
  acting: {
    id: 'acting',
    breadcrumb: 'Acting',
    apiBase: '/api/acting',
    verifiedLabel: 'Editorial-verified against official theater companies and guild sources',
    orgStatLabel: 'Companies',
    orgsTotal: ACTING_ORGANIZATIONS.length - 1,
    organizations: ACTING_ORGANIZATIONS,
    verifiedOrgs: VERIFIED_ACTING_ORGS,
    eyebrowLatest: 'Real-Time Casting & Audition Reporting',
    latestIntro: 'Compiled from legitimate theater companies, film guilds, and conservatory audition calls.',
    emptyTitle: 'No acting notices match these filters',
    emptyDescription: 'There are no audition notices matching the selected category, studio, or region. Try adjusting your filters.',
    attributionLabel: 'Acting community attribution',
    attributionText:
      'Logos, company names, and guild trademarks belong to their respective owners. Groove is an independent directory and is not affiliated with or endorsed by these acting organizations.',
    Roster: FeaturedActorsRoster,
    Craft: ActingCraftSection,
    rosterComment: 'Featured Company Roster',
    craftComment: 'Acting Craft & Training Hub',
  },
  theater: {
    id: 'theater',
    breadcrumb: 'Theater',
    apiBase: '/api/theater',
    verifiedLabel: 'Editorial-verified against official production companies and festival sources',
    orgStatLabel: 'Companies',
    orgsTotal: THEATER_ORGANIZATIONS.length - 1,
    organizations: THEATER_ORGANIZATIONS,
    verifiedOrgs: VERIFIED_THEATER_ORGS,
    eyebrowLatest: 'Real-Time Theater Discovery & Reporting',
    latestIntro: 'Compiled from legitimate Philippine theater companies, the CCP, and international production houses.',
    emptyTitle: 'No theater productions match these filters',
    emptyDescription: 'There are no dispatches matching the selected category, company, or region. Try adjusting your filters.',
    attributionLabel: 'Theater community attribution',
    attributionText:
      'Logos, company names, and producer trademarks belong to their respective owners. Groove is an independent directory and is not affiliated with or endorsed by these theater organizations.',
    Roster: FeaturedTheaterCompaniesRoster,
    Craft: StageProductionCraftSection,
    rosterComment: 'Featured Theater Companies Roster',
    craftComment: 'Stage & Production Craft Hub',
  },
};

interface DisciplineCommunityViewProps {
  /** Which beat discipline to render. */
  variant: BeatId;
  initialOrgs?: DanceOrg[];
}

export function DisciplineCommunityView({ variant, initialOrgs }: DisciplineCommunityViewProps) {
  const cfg = BEATS[variant];
  const orgsFallback = cfg.verifiedOrgs;
  const orgs = initialOrgs && initialOrgs.length > 0 ? initialOrgs : orgsFallback;

  // Filter States initialized directly from URL on mount
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
    return new URLSearchParams(window.location.search).get('org') || 'all';
  });
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
  const [updates, setUpdates] = useState<DisciplineUpdateRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DisciplineUpdateRecord[]>([]);
  const [pastEvents, setPastEvents] = useState<DisciplineUpdateRecord[]>([]);
  const [eventTimeframe, setEventTimeframe] = useState<EventTimeframe>('upcoming');
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('Recently verified');

  // Sync state to URL params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Start from the current query so roster deep links (?crew, ?ensemble,
    // ?company, ?theater-company) and any unrelated parameter survive.
    const params = new URLSearchParams(window.location.search);
    if (region !== 'all') params.set('region', region); else params.delete('region');
    if (category !== 'all') params.set('category', category); else params.delete('category');
    if (selectedOrg !== 'all') params.set('org', selectedOrg); else params.delete('org');
    if (searchQuery.trim()) params.set('q', searchQuery.trim()); else params.delete('q');
    if (language !== 'en') params.set('lang', language); else params.delete('lang');
    if (page > 1) params.set('page', String(page)); else params.delete('page');

    const newQuery = params.toString();
    const newUrl = newQuery
      ? `${window.location.pathname}?${newQuery}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, [region, category, selectedOrg, searchQuery, language, page]);

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
      if (selectedOrg !== 'all') params.set('org', selectedOrg);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`${cfg.apiBase}/updates?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      setUpdates(data.updates || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      if (data.updates && data.updates.length > 0 && data.updates[0].published_at) {
        try {
          const date = new Date(data.updates[0].published_at);
          setLastUpdated(
            date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        } catch {
          setLastUpdated('Recently verified');
        }
      }
    } catch (err) {
      console.error(`Failed to load ${cfg.id} updates:`, err);
      setError(`Unable to load latest ${cfg.id} updates. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [region, category, selectedOrg, searchQuery, page, cfg.apiBase, cfg.id]);

  // Fetch Upcoming Events
  const fetchUpcomingEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch(`${cfg.apiBase}/events/upcoming`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (err) {
      console.error(`Failed to fetch upcoming ${cfg.id} events:`, err);
    } finally {
      setEventsLoading(false);
    }

    try {
      const res = await fetch(`${cfg.apiBase}/updates?limit=50`);
      if (res.ok) {
        const data = await res.json();
        const all: DisciplineUpdateRecord[] = data.updates || [];
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
      console.error(`Failed to derive past ${cfg.id} events:`, err);
    }
  }, [cfg.apiBase, cfg.id]);

  // The timer keeps the effect body free of synchronous state updates and
  // coalesces rapid filter changes into one fetch.
  useEffect(() => {
    const timer = window.setTimeout(fetchUpdates, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUpdates]);

  useEffect(() => {
    const timer = window.setTimeout(fetchUpcomingEvents, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUpcomingEvents]);

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
    setSearchQuery('');
    setPage(1);
  };

  /**
   * Top cards route into the existing live feed. `filter` is the same category
   * and search the filter bar already understands, so no new API surface is
   * introduced.
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

  const pageMeta = DISCIPLINE_PAGES[cfg.id];

  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <Breadcrumb label={cfg.breadcrumb} />

      {/* Slim page header: title, audience, verification, counters, actions */}
      <DisciplinePageHeader
        eyebrow={pageMeta.eyebrow}
        title={pageMeta.title}
        accent={pageMeta.titleAccent}
        audience={pageMeta.audience}
        verifiedLabel={cfg.verifiedLabel}
        lastUpdated={lastUpdated}
        stats={[
          { label: cfg.orgStatLabel, value: cfg.orgsTotal },
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

      {/* Main content cards, immediately below the header */}
      <DisciplineHighlights items={pageMeta.highlights} onSelect={handleHighlightSelect} />

      {/* Official Organization Logo / Text-Pill Carousel */}
      <OrgLogoCarouselClient orgs={orgs} />

      {/* Organization Filter Bar */}
      <DisciplineOrgLogoBar selectedOrg={selectedOrg} onSelectOrg={handleSelectOrg} variant={cfg.id} />

      {/* Upcoming & Past Events Showcase Grid */}
      <DisciplineUpcomingEventsSection
        events={upcomingEvents}
        pastEvents={pastEvents}
        loading={eventsLoading}
        timeframe={eventTimeframe}
        onTimeframeChange={setEventTimeframe}
        selectedOrg={selectedOrg}
        onClearFilters={handleClearFilters}
        variant={cfg.id}
      />

      {/* Latest Updates Section */}
      <section id="latest-updates" aria-labelledby="latest-updates-title" className="scroll-mt-24">
        <SectionHeader
          eyebrow={cfg.eyebrowLatest}
          title={
            <span id="latest-updates-title">
              Latest <span className="font-normal text-muted-foreground">Dispatches</span>
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
          {cfg.latestIntro}
        </p>

        {/* Filters Bar */}
        <div className="mt-6">
          <DisciplineUpdatesFilterBar
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
            variant={cfg.id}
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
              title={cfg.emptyTitle}
              description={cfg.emptyDescription}
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
                <DisciplineUpdateCard key={update.id} update={update} language={language} variant={cfg.id} />
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

      {/* Featured Roster */}
      <cfg.Roster />

      {/* Craft & Training Hub */}
      <cfg.Craft />

      {/* Performing Arts News Hub Guide, Editorial Standards & Safety Disclaimer */}
      <PerformingArtsNewsHubGuide discipline={cfg.id} />

      <AttributionFooter label={cfg.attributionLabel}>
        {cfg.attributionText}
      </AttributionFooter>
    </div>
  );
}

function Breadcrumb({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
          <span className="font-semibold text-foreground">{label}</span>
        </li>
      </ol>
    </nav>
  );
}
