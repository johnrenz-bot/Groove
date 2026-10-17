'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { TheaterCommunityHero } from './TheaterCommunityHero';
import { SectionHeader } from '@/features/dance/components/SectionHeader';
import { TheaterOrgLogoBar } from './TheaterOrgLogoBar';
import { TheaterUpdatesFilterBar } from './TheaterUpdatesFilterBar';
import { TheaterUpdateCard } from './TheaterUpdateCard';
import { TheaterUpcomingEventsSection, type EventTimeframe } from './TheaterUpcomingEventsSection';
import { FeaturedTheaterCompaniesRoster } from './FeaturedTheaterCompaniesRoster';
import { StageProductionCraftSection } from './StageProductionCraftSection';
import { DanceUpdatesSkeletonGrid } from '@/features/dance/components/DanceSkeletons';
import type { DanceUpdateRecord } from '@/features/dance/services/danceService';
import { isUpcomingEvent } from '@/features/dance/services/danceService';
import type { DanceOrg } from '@/lib/dance/types';
import { VERIFIED_THEATER_ORGS, THEATER_ORGANIZATIONS } from '../data/theaterOrgs';
import { OrgLogoCarouselClient } from '@/features/dance/components/OrgLogoCarouselClient';
import { PerformingArtsNewsHubGuide } from '@/features/performing-arts/components/PerformingArtsNewsHubGuide';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  SearchX,
  ChevronRight as ChevronRightSmall,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

function Breadcrumb() {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
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
          <span className="font-semibold text-foreground">Theater</span>
        </li>
      </ol>
    </nav>
  );
}

interface TheaterCommunityViewProps {
  initialOrgs?: DanceOrg[];
}

export function TheaterCommunityView({ initialOrgs = VERIFIED_THEATER_ORGS }: TheaterCommunityViewProps) {
  // Filter States
  const [region, setRegion] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'tl'>('en');
  const [page, setPage] = useState<number>(1);

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

  // Read initial parameters from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const regParam = params.get('region');
    const catParam = params.get('category');
    const orgParam = params.get('org');
    const qParam = params.get('q');
    const langParam = params.get('lang');
    const pageParam = params.get('page');

    if (regParam) setRegion(regParam);
    if (catParam) setCategory(catParam);
    if (orgParam) setSelectedOrg(orgParam);
    if (qParam) setSearchQuery(qParam);
    if (langParam === 'en' || langParam === 'tl') setLanguage(langParam);
    if (pageParam && Number(pageParam) > 0) setPage(Number(pageParam));
  }, []);

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

      const res = await fetch(`/api/theater/updates?${params.toString()}`);
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
    } catch (err: any) {
      console.error('Failed to load theater updates:', err);
      setError('Unable to load latest theater updates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [region, category, selectedOrg, searchQuery, page]);

  // Fetch Upcoming Events
  const fetchUpcomingEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch('/api/theater/events/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming theater productions:', err);
    } finally {
      setEventsLoading(false);
    }

    try {
      const res = await fetch('/api/theater/updates?limit=50');
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
      console.error('Failed to derive past theater events:', err);
    }
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  useEffect(() => {
    fetchUpcomingEvents();
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

  const orgsCount = useMemo(() => THEATER_ORGANIZATIONS.length - 1, []);

  return (
    <div className="space-y-10 pb-12 sm:space-y-12">
      <Breadcrumb />

      <TheaterCommunityHero
        totalUpdatesCount={total}
        totalEventsCount={upcomingEvents.length}
        federationsCount={orgsCount}
        lastUpdated={lastUpdated}
      />

      <OrgLogoCarouselClient
        orgs={initialOrgs && initialOrgs.length > 0 ? initialOrgs : VERIFIED_THEATER_ORGS}
      />
      <p className="mx-auto -mt-6 max-w-3xl text-center text-[11px] leading-relaxed text-muted-foreground">
        Logos, company names, and producer trademarks belong to their respective owners. Groove is an independent
        directory and is not affiliated with or endorsed by these theater organizations.
      </p>

      <TheaterOrgLogoBar selectedOrg={selectedOrg} onSelectOrg={handleSelectOrg} />

      <TheaterUpcomingEventsSection
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
          eyebrow="Real-Time Theater Discovery & Reporting"
          title={
            <span id="latest-updates-title">
              Latest <span className="font-normal italic text-muted-foreground">Theater Dispatches</span>
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
          Compiled from legitimate Philippine theater companies, the CCP, and international production houses.
        </p>

        <div className="mt-6">
          <TheaterUpdatesFilterBar
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
              title="No theater productions match these filters"
              description="There are no dispatches matching the selected category, company, or region. Try adjusting your filters."
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
                <TheaterUpdateCard key={update.id} update={update} language={language} />
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

      {/* 5. Featured Theater Companies Roster */}
      <FeaturedTheaterCompaniesRoster />

      {/* 6. Stage Production, Scripts & Direction Craft Hub */}
      <StageProductionCraftSection />

      {/* 7. Industry Information Guide, Source Verification & Safety Advisory */}
      <PerformingArtsNewsHubGuide discipline="theater" />

      {/* Page attribution footer */}
      <footer aria-label="Theater community attribution" className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm sm:p-6">
        <p className="mx-auto max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
          Logos, company names, and producer trademarks belong to their respective owners. Groove is an independent
          directory and is not affiliated with or endorsed by these theater organizations.
        </p>
      </footer>
    </div>
  );
}
