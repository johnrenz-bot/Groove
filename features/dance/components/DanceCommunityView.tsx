'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DanceCommunityHero } from './DanceCommunityHero';
import { OrgLogoBar } from './OrgLogoBar';
import { UpdatesFilterBar } from './UpdatesFilterBar';
import { UpdateCard } from './UpdateCard';
import { UpcomingEventsSection } from './UpcomingEventsSection';
import { FeaturedCrewsRoster } from './FeaturedCrewsRoster';
import { DanceUpdatesSkeletonGrid } from './DanceSkeletons';
import type { DanceUpdateRecord } from '../services/danceService';
import { ORGANIZATIONS } from '@/lib/dance/constants';
import type { DanceOrg } from '@/lib/dance/types';
import { OrgLogoCarouselClient } from './OrgLogoCarouselClient';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronRight as ChevronRightSmall,
} from 'lucide-react';

/**
 * Breadcrumb for the dance community page.
 * Community / Performing Arts / Dance
 */
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
          <span className="font-semibold text-foreground">Dance</span>
        </li>
      </ol>
    </nav>
  );
}

interface DanceCommunityViewProps {
  initialOrgs?: DanceOrg[];
}

export function DanceCommunityView({ initialOrgs }: DanceCommunityViewProps) {
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

  // Sync state to URL params cleanly
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
      if (selectedOrg !== 'all') params.set('org', selectedOrg);
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

      // Determine last updated time from latest update
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
      console.error('Failed to load dance updates:', err);
      setError('Unable to load latest dance updates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [region, category, selectedOrg, searchQuery, page]);

  // Fetch Upcoming Events
  const fetchUpcomingEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch('/api/dance/events/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Initial load & when filters change
  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  useEffect(() => {
    fetchUpcomingEvents();
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
    setSearchQuery('');
    setPage(1);
  };

  // Distinct federations count from tracked organizations
  const federationsCount = useMemo(() => ORGANIZATIONS.length, []);

  return (
    <div className="space-y-0 pb-12">
      {/* 0. Breadcrumb: Community / Performing Arts / Dance */}
      <Breadcrumb />

      {/* 1. Hero Banner matching Groove theme */}
      <DanceCommunityHero
        totalUpdatesCount={total}
        totalEventsCount={upcomingEvents.length}
        federationsCount={federationsCount}
        lastUpdated={lastUpdated}
      />

      {/* 1b. Official League Logo Carousel */}
      <OrgLogoCarouselClient orgs={initialOrgs ?? []} />

      {/* 2. Organization Logo Filter Bar */}
      <OrgLogoBar selectedOrg={selectedOrg} onSelectOrg={handleSelectOrg} />

      {/* 3. Upcoming Events Showcase Carousel / Grid */}
      <UpcomingEventsSection events={upcomingEvents} loading={eventsLoading} />

      {/* 4. Latest Updates Section */}
      <section id="latest-updates" className="scroll-mt-24 py-8">
        {/* Section Heading */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="g-eyebrow mb-2">Real-Time Discovery &amp; Reporting</span>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Latest <span className="font-normal italic text-muted-foreground">Updates</span>
            </h2>
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{updates.length}</span> of{' '}
            <span className="font-semibold text-accent-text">{total}</span> verified dispatches
          </div>
        </div>

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
        <div className="mt-6">
          {loading ? (
            <DanceUpdatesSkeletonGrid count={6} />
          ) : error ? (
            <div className="rounded-2xl border border-danger/40 bg-card p-8 text-center shadow-sm">
              <AlertCircle className="mx-auto h-8 w-8 text-danger" />
              <p className="mt-3 text-sm font-semibold text-foreground">{error}</p>
              <button
                type="button"
                onClick={() => fetchUpdates()}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : updates.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
              <Sparkles className="mx-auto h-8 w-8 text-accent-text" />
              <h3 className="mt-3 text-base font-bold text-foreground">
                No dispatches match criteria
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
                There are no updates matching the selected category, league, or region. Try adjusting your filters.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-5 rounded-full border border-border bg-muted/40 px-5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {updates.map((update) => (
                <UpdateCard key={update.id} update={update} language={language} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3 border-t border-divider pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <span className="px-3 text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{' '}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong disabled:opacity-30"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* 5. Featured Crews & Match Recaps Roster */}
      <FeaturedCrewsRoster />
    </div>
  );
}
