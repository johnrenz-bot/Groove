'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DanceCommunityHero } from './DanceCommunityHero';
import { OrgLogoBar } from './OrgLogoBar';
import { UpdatesFilterBar } from './UpdatesFilterBar';
import { UpdateCard } from './UpdateCard';
import { UpcomingEventsSection } from './UpcomingEventsSection';
import { FeaturedCrewsRoster } from './FeaturedCrewsRoster';
import { DanceUpdatesSkeletonGrid } from './DanceSkeletons';
import type { DanceUpdateRecord } from '../services/danceService';
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export function DanceCommunityView() {
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

  return (
    <div className="min-h-screen bg-[#050B10] text-white">
      {/* 1. Hero Banner */}
      <DanceCommunityHero
        totalUpdatesCount={total || 18}
        totalEventsCount={upcomingEvents.length || 6}
      />

      {/* 2. Organization Logo Bar */}
      <OrgLogoBar selectedOrg={selectedOrg} onSelectOrg={handleSelectOrg} />

      {/* 3. Upcoming Events Showcase Carousel / Grid */}
      <UpcomingEventsSection events={upcomingEvents} loading={eventsLoading} />

      {/* 4. Latest Updates Section */}
      <section id="latest-updates" className="py-16">
        <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
          {/* Section Heading */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 bg-[#C8102E]" />
                <span className="font-mono text-xs font-black uppercase tracking-widest text-[#C6F10E]">
                  REAL-TIME DISCOVERY & REPORTING
                </span>
              </div>
              <h2 className="mt-1 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                LATEST <span className="text-[#C6F10E]">UPDATES</span>
              </h2>
            </div>
            <div className="font-mono text-xs text-[#93A3AF]">
              Showing <span className="font-bold text-white">{updates.length}</span> of{' '}
              <span className="font-bold text-[#C6F10E]">{total}</span> verified dispatches
            </div>
          </div>

          {/* Filters Bar */}
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

          {/* Updates Feed */}
          <div className="mt-8">
            {loading ? (
              <DanceUpdatesSkeletonGrid count={6} />
            ) : error ? (
              <div className="border border-[#C8102E]/40 bg-[#0A141C] p-8 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-[#C8102E]" />
                <p className="mt-3 font-mono text-sm font-bold text-white">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchUpdates()}
                  className="mt-4 inline-flex items-center gap-2 border border-white/20 bg-[#050B10] px-4 py-2 font-mono text-xs font-bold uppercase text-white hover:border-[#C6F10E] hover:text-[#C6F10E]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  RETRY
                </button>
              </div>
            ) : updates.length === 0 ? (
              <div className="border border-white/10 bg-[#0A141C] p-12 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-[#C6F10E]" />
                <h3 className="mt-3 font-mono text-base font-black uppercase text-white">
                  NO DISPATCHES MATCH CRITERIA
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs text-[#93A3AF]">
                  There are no updates matching the selected category, league, or region. Try adjusting your filters.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="mt-5 border border-[#C8102E] bg-[#C8102E] px-5 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-[#E01334]"
                  >
                    RESET ALL FILTERS
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
            <div className="mt-12 flex items-center justify-center gap-3 border-t border-white/10 pt-8 font-mono">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 border border-white/10 bg-[#0A141C] px-4 py-2 text-xs font-bold uppercase text-white transition hover:border-[#C6F10E] disabled:opacity-30 disabled:hover:border-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                PREV
              </button>

              <span className="px-3 text-xs text-[#93A3AF]">
                PAGE <span className="font-bold text-white">{page}</span> OF{' '}
                <span className="font-bold text-[#C6F10E]">{totalPages}</span>
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 border border-white/10 bg-[#0A141C] px-4 py-2 text-xs font-bold uppercase text-white transition hover:border-[#C6F10E] disabled:opacity-30 disabled:hover:border-white/10"
              >
                NEXT
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 5. Featured Crews & Match Recaps Roster */}
      <FeaturedCrewsRoster />
    </div>
  );
}
