'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import CommunityFeed from '@/components/community/CommunityFeed';
import { communityOf } from '@/lib/community';
import BookingModal from '@/components/appointments/BookingModal';
import CoachAIAssistantModal from '@/components/shared/CoachAIAssistantModal';
import { CoachCard } from '@/components/shared/CoachCard';
import { TalentCoachAssistant } from '@/components/client/TalentCoachAssistant';
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
  // Shown above the grid when this client's own account blocks booking, so the
  // reason is visible without having to click a card and fail.
  const [gateNotice, setGateNotice] = useState(false);

  const fetchCoachesAndProfile = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // The community lives in client_profiles.talent, not on profiles, so the
        // detail row is joined here rather than fetched separately.
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
          // Derived once here rather than re-fetched by the feed: the feed needs
          // it to scope every query, and it is already in hand.
          setMyTalent(detail.client_profile?.talent ?? null);
        }
      }

      // Fetch all verified coaches
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

  /**
   * The coach whose assistant is featured on this page.
   *
   * Ordered by `created_at` ascending so it is stable across renders, and it
   * matches the server's own default in `/api/ai/coach-assistant` — so the card
   * and the facts sent to the model always refer to the same person, even before
   * an id is sent. `coach_profile` is already joined by the query above.
   */
  const featuredCoach: FullCoach | null =
    [...coaches].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0] ??
    null;

  return (
    <>
      <PageHeader
        eyebrow="Talents & Community Directory"
        title={
          <>
            Discover &amp; Connect With Top <span className="text-accent-text">Coaches</span>
          </>
        }
        description="Find verified coaches for dance choreography, vocal training, stage acting, and musical theater in San Jose del Monte, Bulacan."
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
          {/* Filter bar */}
          <Card padding="md">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
              {/* Search */}
              <div className="relative">
                <label htmlFor="coach-search" className="g-label">
                  Search
                </label>
                <Search
                  className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="coach-search"
                  type="text"
                  placeholder="Search coach by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="g-input g-input-has-icon"
                />
              </div>

              {/* Talent category */}
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
                  <option value="All">All Talents (Dance, Vocal, Acting...)</option>
                  <option value="Dance">Dance &amp; Choreography</option>
                  <option value="Singing">Singing &amp; Vocal</option>
                  <option value="Acting">Acting &amp; Theater</option>
                  <option value="Theater">Musical Theater</option>
                </select>
              </div>

              {/* Location (San Jose del Monte) */}
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
                <label htmlFor="price-filter" className="g-label">
                  Maximum session fee
                </label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-input bg-card px-3.5">
                  <span className="shrink-0 text-xs font-bold tabular-nums text-accent-text">
                    ₱{maxPrice}
                  </span>
                  <input
                    id="price-filter"
                    type="range"
                    min="200"
                    max="5000"
                    step="100"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full cursor-pointer accent-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Coach assistant — a section within the talent page, above the
              directory. The directory remains the page's primary purpose; this
              sits under the filters and above the grid rather than replacing
              or modal-blocking anything. */}
          {!loading && filteredCoaches.length > 0 && featuredCoach && (
            <TalentCoachAssistant coach={featuredCoach} />
          )}

          {/* Why booking is unavailable, if it is */}
          {gateNotice && !loading && (
            <VerificationRequiredNotice gate={bookingGate(currentUser)} />
          )}

          {/* Coach grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="g-skeleton aspect-[3/4] rounded-[20px]" />
              ))}
            </div>
          ) : filteredCoaches.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No coaches match your filters"
              description="Try adjusting the talent category, location, or price range."
            />
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {filteredCoaches.map((coach) => (
                <CoachCard
                  key={coach.id}
                  coach={coach}
                  className="w-full max-w-[340px] justify-self-center"
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
