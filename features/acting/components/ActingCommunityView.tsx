'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { ActingOrgLogoBar } from './ActingOrgLogoBar';
import { ActingUpdatesFilterBar } from './ActingUpdatesFilterBar';
import { ActingUpdateCard } from './ActingUpdateCard';
import { ActingUpcomingEventsSection, type EventTimeframe } from './ActingUpcomingEventsSection';
import { FeaturedActorsRoster } from './FeaturedActorsRoster';
import { ActingCraftSection } from './ActingCraftSection';
import { DanceUpdatesSkeletonGrid } from '@/features/dance/components/DanceSkeletons';
import type { DanceUpdateRecord } from '@/features/dance/services/danceService';
import { isUpcomingEvent } from '@/features/dance/services/danceService';
import type { DanceOrg } from '@/lib/dance/types';
import { VERIFIED_ACTING_ORGS, ACTING_ORGANIZATIONS } from '../data/actingOrgs';
import { OrgLogoCarouselClient } from '@/features/dance/components/OrgLogoCarouselClient';
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
import { EmptyState } from '@/components/shared/EmptyState';

function Breadcrumb() {
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
          <span className="font-semibold text-foreground">Acting</span>
        </li>
      </ol>
    </nav>
  );
}

interface ActingCommunityViewProps {
  initialOrgs?: DanceOrg[];
}

export function ActingCommunityView({ initialOrgs = VERIFIED_ACTING_ORGS }: ActingCommunityViewProps) {
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
  const [updates, setUpdates] = useState<DanceUpdateRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DanceUpdateRecord[]>([]);
  const [pastEvents, setPastEvents] = useState<DanceUpdateRecord[]>([]);
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
    const params = new URLSearchParams();
    if (region !== 'all') params.set('region', region);
    if (category !== 'all') params.set('category', category);
    if (selectedOrg !== 'all') params.set('org', selectedOrg);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (language !== 'en') params.set('lang', language);
    if (page > 1) params.set('page', String(page));

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

      const res = await fetch(`/api/acting/updates?${params.toString()}`);
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
      console.error('Failed to load acting updates:', err);
      setError('Unable to load latest acting updates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [region, category, selectedOrg, searchQuery, page]);

  // Fetch Upcoming Events
  const fetchUpcomingEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch('/api/acting/events/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming acting events:', err);
    } finally {
      setEventsLoading(false);
    }

    try {
      const res = await fetch('/api/acting/updates?limit=50');
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
      console.error('Failed to derive past acting events:', err);
    }
  }, []);

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

  const orgsCount = useMemo(() => ACTING_ORGANIZATIONS.length - 1, []);
  const pageMeta = DISCIPLINE_PAGES.acting;

  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <Breadcrumb />

      {/* Slim page header: title, audience, verification, counters, actions */}
      <DisciplinePageHeader
        eyebrow={pageMeta.eyebrow}
        title={pageMeta.title}
        accent={pageMeta.titleAccent}
        audience={pageMeta.audience}
        verifiedLabel="Editorial-verified against official theater companies and guild sources"
        lastUpdated={lastUpdated}
        stats={[
          { label: 'Companies', value: orgsCount },
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

      <OrgLogoCarouselClient
        orgs={initialOrgs && initialOrgs.length > 0 ? initialOrgs : VERIFIED_ACTING_ORGS}
      />

      <ActingOrgLogoBar selectedOrg={selectedOrg} onSelectOrg={handleSelectOrg} />

      <ActingUpcomingEventsSection
        events={upcomingEvents}
        pastEvents={pastEvents}
        loading={eventsLoading}
        timeframe={eventTimeframe}
        onTimeframeChange={setEventTimeframe}
        selectedOrg={selectedOrg}
        onClearFilters={handleClearFilters}
      />

      <section id="latest-updates" aria-labelledby="latest-updates-title" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Real-Time Casting & Audition Reporting"
          title={
            <span id="latest-updates-title">
              Latest <span className="font-normal italic text-muted-foreground">Casting &amp; Auditions</span>
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
          Compiled from legitimate theater companies, film guilds, and conservatory audition calls.
        </p>

        <div className="mt-6">
          <ActingUpdatesFilterBar
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
              title="No acting notices match these filters"
              description="There are no audition notices matching the selected category, studio, or region. Try adjusting your filters."
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
                <ActingUpdateCard key={update.id} update={update} language={language} />
              ))}
            </div>
          )}
        </div>

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

      {/* 5. Featured Acting Ensembles Roster */}
      <FeaturedActorsRoster />

      {/* 6. Acting Craft, Monologues & Audition Prep Hub */}
      <ActingCraftSection />

      {/* 7. Industry Information Guide, Source Verification & Safety Advisory */}
      <PerformingArtsNewsHubGuide discipline="acting" />

      {/* Page attribution footer */}
      <AttributionFooter label="Acting community attribution">
        Logos, company names, and guild trademarks belong to their respective owners. Groove is an
        independent directory and is not affiliated with or endorsed by these acting organizations.
      </AttributionFooter>
    </div>
  );
}
