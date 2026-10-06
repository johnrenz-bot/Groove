'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, RotateCcw, Filter, Users, Sparkles } from 'lucide-react';
import CommunityFeed from '@/components/community/CommunityFeed';
import { communityOf } from '@/lib/community';
import BookingModal from '@/components/appointments/BookingModal';
import CoachAIAssistantModal from '@/components/shared/CoachAIAssistantModal';
import { CoachCard } from '@/components/shared/CoachCard';
import { FullCoach, Profile } from '@/lib/types';
import { bookingGate } from '@/lib/verification';
import { VerificationRequiredNotice } from '@/components/verification/VerificationRequiredNotice';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/components/shared/cn';

const TABS = [
  { id: 'coaches', label: 'Coach Directory', emoji: '🎭' },
  { id: 'community', label: 'Community Showcase', emoji: '🌟' },
] as const;

const DISCIPLINE_PRESETS = [
  { id: 'All', label: 'All Coaches' },
  { id: 'Dance', label: 'Dance & Choreography' },
  { id: 'Singing', label: 'Singing & Vocal' },
  { id: 'Acting', label: 'Acting & Theater' },
  { id: 'Theater', label: 'Musical Theater' },
] as const;

export default function ClientTalentPage() {
  const [activeTab, setActiveTab] = useState<'coaches' | 'community'>('coaches');
  const [coaches, setCoaches] = useState<FullCoach[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  /** The signed-in client's discipline, source of their community. */
  const [myTalent, setMyTalent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTalent, setSelectedTalent] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [maxPrice, setMaxPrice] = useState<number>(3000);

  // Modals
  const [selectedCoachForBooking, setSelectedCoachForBooking] = useState<FullCoach | null>(null);
  const [selectedCoachForAI, setSelectedCoachForAI] = useState<FullCoach | null>(null);
  const [gateNotice, setGateNotice] = useState(false);

  const fetchCoachesAndProfile = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, client_profile:client_profiles(talent)')
          .eq('id', user.id)
          .single();
        if (data) {
          const detail = data as Profile & {
            client_profile?: { talent?: string | null } | null;
          };
          setCurrentUser(detail);
          setMyTalent(detail.client_profile?.talent ?? null);
        }
      }

      // Fetch all coaches
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          coach_profile:coach_profiles(*)
        `)
        .eq('role', 'coach');

      if (error) throw error;
      setCoaches((data as FullCoach[]) || []);
    } catch (err) {
      console.error('Error loading coaches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoachesAndProfile();
  }, [fetchCoachesAndProfile]);

  // Filter coaches
  const filteredCoaches = coaches.filter((coach) => {
    const fullName = `${coach.firstname} ${coach.lastname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());

    const coachTalents = coach.coach_profile?.talents || '';
    const matchesTalent =
      selectedTalent === 'All' || coachTalents.toLowerCase().includes(selectedTalent.toLowerCase());

    const coachCity = coach.city_name || coach.address_summary || '';
    const matchesCity =
      selectedCity === 'All' || coachCity.toLowerCase().includes(selectedCity.toLowerCase());

    const fee = coach.coach_profile?.service_fee ?? 500;
    const matchesPrice = fee <= maxPrice;

    return matchesSearch && matchesTalent && matchesCity && matchesPrice;
  });

  const isFiltered =
    searchQuery.trim() !== '' || selectedTalent !== 'All' || selectedCity !== 'All' || maxPrice < 5000;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTalent('All');
    setSelectedCity('All');
    setMaxPrice(5000);
  };

  return (
    <>
      <PageHeader
        eyebrow="Talents & Community Directory · San Jose del Monte"
        title={
          <>
            Discover &amp; Connect With Top <span className="text-accent-text">Coaches</span>
          </>
        }
        description="Find verified performing arts instructors for dance choreography, vocal training, stage acting, and theater in Bulacan."
        action={
          <div
            role="tablist"
            aria-label="Directory sections"
            className="flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1 shadow-[var(--shadow-sm)]"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition',
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-[var(--shadow-sm)]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span aria-hidden="true">{tab.emoji}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      {activeTab === 'coaches' ? (
        <div className="space-y-6">
          {/* Filter Bar & Controls */}
          <Card padding="md" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
              {/* Search */}
              <div className="relative">
                <label htmlFor="coach-search" className="g-label">
                  Search Coach
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    id="coach-search"
                    type="text"
                    placeholder="Search coach by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="g-input pl-10 pr-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Talent Category Select */}
              <div>
                <label htmlFor="talent-category" className="g-label">
                  Discipline
                </label>
                <select
                  id="talent-category"
                  value={selectedTalent}
                  onChange={(e) => setSelectedTalent(e.target.value)}
                  className="g-input"
                >
                  <option value="All">All Disciplines</option>
                  <option value="Dance">Dance &amp; Choreography</option>
                  <option value="Singing">Singing &amp; Vocal</option>
                  <option value="Acting">Acting &amp; Theater</option>
                  <option value="Theater">Musical Theater</option>
                </select>
              </div>

              {/* Location Select */}
              <div>
                <label htmlFor="location-filter" className="g-label">
                  Location
                </label>
                <select
                  id="location-filter"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="g-input"
                >
                  <option value="All">All Locations in Bulacan</option>
                  <option value="San Jose del Monte">San Jose del Monte (Primary)</option>
                  <option value="Tungkong Mangga">Tungkong Mangga</option>
                  <option value="Muzon">Muzon</option>
                  <option value="Kaypian">Kaypian</option>
                  <option value="Graceville">Graceville</option>
                </select>
              </div>

              {/* Price range */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="price-filter" className="g-label mb-0">
                    Max Session Fee
                  </label>
                  <span className="text-xs font-bold tabular-nums text-accent-text">
                    ₱{maxPrice.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex h-10 items-center rounded-xl border border-input bg-card px-3">
                  <input
                    id="price-filter"
                    type="range"
                    min="300"
                    max="5000"
                    step="100"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full cursor-pointer accent-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            {/* Quick Discipline Pills & Result Counter */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Filter:
                </span>
                {DISCIPLINE_PRESETS.map((preset) => {
                  const isSelected = selectedTalent === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedTalent(preset.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer',
                        isSelected
                          ? 'border border-accent-border bg-accent text-accent-foreground shadow-sm'
                          : 'border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-text hover:underline cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </Card>

          {/* Directory Count Header */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              Showing <strong className="font-semibold text-foreground">{filteredCoaches.length}</strong> verified {filteredCoaches.length === 1 ? 'coach' : 'coaches'} in Bulacan
            </p>
          </div>

          {/* Verification Notice if client account is blocked from booking */}
          {gateNotice && !loading && (
            <VerificationRequiredNotice gate={bookingGate(currentUser)} />
          )}

          {/* Coach Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-card p-5 aspect-[3/4] sm:aspect-[4/5] min-h-[480px]"
                >
                  <div className="flex justify-between items-start">
                    <div className="g-skeleton h-6 w-24 rounded-full" />
                    <div className="g-skeleton h-6 w-16 rounded-full" />
                  </div>
                  <div className="space-y-3">
                    <div className="g-skeleton h-6 w-28 rounded-full" />
                    <div className="g-skeleton h-7 w-3/4 rounded-md" />
                    <div className="g-skeleton h-4 w-1/2 rounded-md" />
                    <div className="g-skeleton h-10 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCoaches.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No coaches found matching your criteria"
              description="Try broadening your discipline selection, adjusting price thresholds, or resetting filters."
              action={
                isFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear All Filters</span>
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {filteredCoaches.map((coach) => (
                <CoachCard
                  key={coach.id}
                  coach={coach}
                  onBook={(c) => setSelectedCoachForBooking(c)}
                  onBlockedBook={() => setGateNotice(true)}
                  onAskAI={(c) => setSelectedCoachForAI(c)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <CommunityFeed
          currentUser={currentUser}
          community={communityOf(currentUser, myTalent)}
        />
      )}

      {/* Booking Modal */}
      {selectedCoachForBooking && (
        <BookingModal
          coach={selectedCoachForBooking}
          isOpen={!!selectedCoachForBooking}
          onClose={() => setSelectedCoachForBooking(null)}
          onSuccess={() => {
            fetchCoachesAndProfile();
            setSelectedCoachForBooking(null);
          }}
        />
      )}

      {/* AI Assistant Modal */}
      {selectedCoachForAI && (
        <CoachAIAssistantModal
          coachContext={{
            id: selectedCoachForAI.id,
            fullName: `${selectedCoachForAI.firstname} ${selectedCoachForAI.lastname}`,
            talents: selectedCoachForAI.coach_profile?.talents || '',
            genres: selectedCoachForAI.coach_profile?.genres || '',
            hourlyRate: selectedCoachForAI.coach_profile?.service_fee || 500,
            bio: selectedCoachForAI.bio || '',
            location: selectedCoachForAI.city_name || 'San Jose del Monte, Bulacan',
          }}
          isOpen={!!selectedCoachForAI}
          onClose={() => setSelectedCoachForAI(null)}
        />
      )}
    </>
  );
}
