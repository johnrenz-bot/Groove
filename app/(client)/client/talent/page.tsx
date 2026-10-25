'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Image as ImageIcon,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { ShowcaseShell } from '@/features/showcase/components/ShowcaseShell';
import { useBackgroundMusic } from '@/features/showcase/hooks/useBackgroundMusic';
import { MusicMiniPlayer } from '@/features/showcase/components/MusicMiniPlayer';
import { communityOf } from '@/features/community/utils/community';
import BookingModal from '@/features/appointments/components/BookingModal';
import CoachAIAssistantModal from '@/components/shared/CoachAIAssistantModal';
import { CoachCard } from '@/components/shared/CoachCard';
import { FullCoach, Profile } from '@/lib/types';
import { bookingGate } from '@/features/verification/services/verification';
import { VerificationRequiredNotice } from '@/features/verification/components/VerificationRequiredNotice';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
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

/**
 * The top of the budget slider. One constant, used for the initial value, for
 * "is this filtered?" and for Reset.
 */
const DEFAULT_MAX_PRICE = 3000;

/**
 * Placeholder path for the AFTER gallery image.
 *
 * Drop the screenshot at `public/image/talent/coach-directory-after.png` and it
 * appears automatically. Until then the modal shows a designed placeholder
 * instead of a broken image; no generated artwork or invented coach data ships
 * with the page.
 */
const PREVIEW_GALLERY_SRC = '/image/talent/coach-directory-after.png';

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
  /**
   * `DEFAULT_MAX_PRICE` is the unfiltered state, and both the initial value and
   * `isFiltered` below are derived from it. They used to be two different
   * literals — the slider started at 3000 while `isFiltered` compared against
   * 5000 — so the page reported itself as filtered on first paint and the
   * "Reset filters" control was permanently on screen until the user pressed it.
   */
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_MAX_PRICE);

  // Modals
  const [selectedCoachForBooking, setSelectedCoachForBooking] = useState<FullCoach | null>(null);
  const [selectedCoachForAI, setSelectedCoachForAI] = useState<FullCoach | null>(null);
  const [gateNotice, setGateNotice] = useState(false);
  const [previewGalleryOpen, setPreviewGalleryOpen] = useState(false);
  const [previewImageStatus, setPreviewImageStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  );

  // Background Music for /client/talent with auto-play and browser compliance
  const music = useBackgroundMusic({
    currentUser,
    community: communityOf(currentUser, myTalent),
  });

  const loadCoachesAndProfile = useCallback(async () => {
    try {
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
    const timer = window.setTimeout(() => {
      void loadCoachesAndProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCoachesAndProfile]);

  /**
   * Deep-link the tabs.
   *
   * The header's Dashboard menu has two distinct entries — "Showcase" and "Find
   * Coaches" — and this route is BOTH of them: it is one page with two tabs.
   * Without this, both links would open the same tab and the menu would be
   * lying about where it takes you.
   *
   * A hash rather than a query param deliberately: `useSearchParams()` opts a
   * client page out of static rendering unless it is wrapped in a Suspense
   * boundary, and a nav change should not cost this route that. A hash needs no
   * framework support at all.
   */
  useEffect(() => {
    const applyHashAndParams = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'showcase') setActiveTab('community');
      else if (hash === 'directory') setActiveTab('coaches');

      const params = new URLSearchParams(window.location.search);
      const talentParam = params.get('talent') || params.get('discipline');
      if (talentParam) {
        const match = DISCIPLINE_PRESETS.find(
          (p) =>
            p.id.toLowerCase() === talentParam.toLowerCase() ||
            p.label.toLowerCase().includes(talentParam.toLowerCase())
        );
        if (match) {
          setSelectedTalent(match.id);
          setActiveTab('coaches');
        }
      }
    };
    applyHashAndParams();
    window.addEventListener('hashchange', applyHashAndParams);
    return () => window.removeEventListener('hashchange', applyHashAndParams);
  }, []);

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

    /**
     * A coach with no published `service_fee` used to be priced at a hard-coded
     * ₱500 by `?? 500`, so the budget slider silently filtered real coaches out
     * of the directory on the strength of a number nobody entered. An unstated
     * rate is not an unaffordable one: coaches without a published fee always
     * pass the budget filter, and the card shows "—" instead of an invented
     * figure.
     */
    const fee = coach.coach_profile?.service_fee ?? null;
    const matchesPrice = fee === null || fee <= maxPrice;

    return matchesSearch && matchesTalent && matchesCity && matchesPrice;
  });

  const activeFilterCount = [
    searchQuery.trim() !== '',
    selectedTalent !== 'All',
    selectedCity !== 'All',
    maxPrice < DEFAULT_MAX_PRICE,
  ].filter(Boolean).length;

  const isFiltered = activeFilterCount > 0;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTalent('All');
    setSelectedCity('All');
    setMaxPrice(DEFAULT_MAX_PRICE);
  };

  const openPreviewGallery = () => {
    setPreviewImageStatus('loading');
    setPreviewGalleryOpen(true);
  };

  return (
    <>
      <PageHeader
        className="mb-5"
        eyebrow="Talents & Community Directory · San Jose del Monte"
        title={
          <>
            Discover &amp; Connect With Top <span className="text-accent-text">Coaches</span>
          </>
        }
        description="Find verified performing arts instructors for dance choreography, vocal training, stage acting, and theater in Bulacan."
        action={
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            <div
              role="tablist"
              aria-label="Directory sections"
              className="flex w-full items-center gap-1 rounded-full border border-border bg-card p-1 shadow-[var(--shadow-sm)] sm:w-fit"
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
                      'inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none sm:px-4',
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

            <button
              type="button"
              onClick={openPreviewGallery}
              aria-haspopup="dialog"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px hover:border-accent-border hover:bg-accent-soft/30 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              Preview Gallery
            </button>
          </div>
        }
      />

      {/* Floating player. Rendered OUTSIDE the tab switch so music controls stay
          mounted and playback keeps running while the member browses coaches. */}
      <MusicMiniPlayer music={music} />

      {activeTab === 'coaches' ? (
        <div className="space-y-6">
          {/* Filter Bar & Controls */}
          <Panel className="overflow-hidden">
            <PanelHeader
              icon={<SlidersHorizontal className="h-4 w-4" />}
              title="Refine the directory"
              infoShort="Filter coaches by name, discipline, location and session fee."
              info="Narrow the directory by name, discipline, city and maximum session fee. Quick-filter pills mirror the discipline selector. A coach with no published rate always passes the budget filter rather than being treated as unaffordable."
              action={
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                    isFiltered
                      ? 'border-accent-border bg-accent-soft/40 text-accent-text'
                      : 'border-border bg-muted/50 text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isFiltered ? 'bg-accent' : 'bg-muted-foreground/50'
                    )}
                    aria-hidden="true"
                  />
                  {isFiltered ? `${activeFilterCount} active` : 'All coaches'}
                </span>
              }
            />
            <PanelBody className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
                {/* Search */}
                <div>
                  <label htmlFor="coach-search" className="g-label">
                    <span className="inline-flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      Search Coach
                    </span>
                  </label>
                  <div className="group relative">
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent-text"
                      aria-hidden="true"
                    />
                    <input
                      id="coach-search"
                      type="text"
                      placeholder="Search coach by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="g-input pl-10 pr-10"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Talent Category Select */}
                <div>
                  <label htmlFor="talent-category" className="g-label">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      Discipline
                    </span>
                  </label>
                  <select
                    id="talent-category"
                    value={selectedTalent}
                    onChange={(e) => setSelectedTalent(e.target.value)}
                    className="g-input cursor-pointer"
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
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      Location
                    </span>
                  </label>
                  <select
                    id="location-filter"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="g-input cursor-pointer"
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
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="price-filter" className="g-label mb-0">
                      <span className="inline-flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                        Max Session Fee
                      </span>
                    </label>
                    <span className="rounded-full border border-accent-border/60 bg-accent-soft/30 px-2 py-0.5 text-[11px] font-bold tabular-nums text-accent-text">
                      ₱{maxPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-11 items-center rounded-lg border border-input bg-card px-3 transition-colors hover:border-border-strong focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--ring)]">
                    <input
                      id="price-filter"
                      type="range"
                      min="300"
                      max="5000"
                      step="100"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      aria-valuetext={`₱${maxPrice.toLocaleString()}`}
                      className="w-full cursor-pointer accent-[var(--accent)]"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-medium tabular-nums text-subtle-foreground">
                    <span>₱300</span>
                    <span>₱5,000</span>
                  </div>
                </div>
              </div>

              {/* Quick Discipline Pills & Result Counter */}
              <div className="flex flex-col gap-3 border-t border-divider pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                    Quick Filter
                  </span>
                  {DISCIPLINE_PRESETS.map((preset) => {
                    const isSelected = selectedTalent === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedTalent(preset.id)}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                          isSelected
                            ? 'border-accent-border bg-accent text-accent-foreground shadow-sm'
                            : 'border-border bg-muted/50 text-muted-foreground hover:-translate-y-px hover:border-accent-border/60 hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isSelected ? 'bg-accent-foreground/80' : 'bg-muted-foreground/50'
                          )}
                          aria-hidden="true"
                        />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex h-8 w-fit cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-all hover:border-accent-border hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset filters</span>
                  </button>
                )}
              </div>
            </PanelBody>
          </Panel>

          {/* Directory Count Header */}
          <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Showing{' '}
              <strong className="font-semibold text-foreground">
                {filteredCoaches.length}
              </strong>{' '}
              of <strong className="font-semibold text-foreground">{coaches.length}</strong>{' '}
              {coaches.length === 1 ? 'coach' : 'coaches'}
              {isFiltered && (
                <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-accent-border/50 bg-accent-soft/20 px-2 py-0.5 text-[10px] font-semibold text-accent-text">
                  Filtered
                </span>
              )}
            </p>
            <p className="text-[11px] font-medium text-subtle-foreground">
              Coach directory · San Jose del Monte, Bulacan
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
                  className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-card p-5 aspect-[3/4] sm:aspect-[4/5] min-h-[26rem]"
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
            <div
              id="coach-results"
              className="g-stagger grid scroll-mt-28 grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3"
            >
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
        /* The Community Showcase tab shares the coach showcase's shell, so both
           routes get the identical compact header, player, modal, two-column
           split and talent selector. The player itself is mounted above the tab
           switch so it survives a switch to the coach directory. */
        <ShowcaseShell
          role="client"
          eyebrow="Community Showcase · San Jose del Monte"
          currentUser={currentUser}
          memberCommunity={communityOf(currentUser, myTalent)}
          loading={loading}
          music={music}
          hideMusicPlayer
        />
      )}

      <Modal
        open={previewGalleryOpen}
        onClose={() => setPreviewGalleryOpen(false)}
        title="Preview Gallery"
        description="A closer look at the modernized coach directory."
        size="3xl"
        animated
        bodyClassName="p-3 sm:p-4"
        footer={
          <Button size="sm" onClick={() => setPreviewGalleryOpen(false)}>
            Close preview
          </Button>
        }
      >
        <figure className="overflow-hidden rounded-2xl border border-border bg-muted/30">
          <div className="relative h-[clamp(240px,58vh,620px)] w-full overflow-hidden bg-[radial-gradient(circle_at_top,_var(--accent-soft),transparent_65%)]">
            {previewImageStatus !== 'error' && (
              <Image
                src={PREVIEW_GALLERY_SRC}
                alt="AFTER preview of the modernized coach directory"
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px"
                className={cn(
                  'object-cover object-top transition-opacity duration-300',
                  previewImageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setPreviewImageStatus('loaded')}
                onError={() => setPreviewImageStatus('error')}
              />
            )}

            {previewImageStatus !== 'loaded' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center sm:p-8">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border/40 bg-card/80 text-accent-text shadow-[var(--shadow-sm)]">
                  <ImageIcon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="max-w-md">
                  <p className="text-sm font-semibold text-foreground">
                    Your AFTER preview goes here
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Add the image at{' '}
                    <code className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] text-foreground">
                      public/image/talent/coach-directory-after.png
                    </code>
                    . It will appear automatically in this frame.
                  </p>
                </div>
              </div>
            )}
          </div>
          <figcaption className="flex flex-col gap-1 border-t border-divider bg-card px-4 py-3 text-[11px] leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>AFTER example · modernized coach directory</span>
            <span className="text-subtle-foreground">Click the backdrop or press Esc to close.</span>
          </figcaption>
        </figure>
      </Modal>

      {/* Booking Modal */}
      {selectedCoachForBooking && (
        <BookingModal
          coach={selectedCoachForBooking}
          isOpen={!!selectedCoachForBooking}
          onClose={() => setSelectedCoachForBooking(null)}
          onSuccess={() => {
            // Refresh the directory without unmounting the dialog: the modal
            // now shows its own success state, and closing is the client's
            // decision, not a side effect of the parent clearing selection.
            void loadCoachesAndProfile();
          }}
        />
      )}

      {/* AI Assistant Modal */}
      {selectedCoachForAI && (
        <CoachAIAssistantModal
          coachContext={{
            id: selectedCoachForAI.id,
            fullName: `${selectedCoachForAI.firstname} ${selectedCoachForAI.lastname}`.trim(),
            talents: selectedCoachForAI.coach_profile?.talents || '',
            genres: selectedCoachForAI.coach_profile?.genres || '',
            serviceFee: selectedCoachForAI.coach_profile?.service_fee || null,
            duration: selectedCoachForAI.coach_profile?.duration || '',
            bio: selectedCoachForAI.bio || '',
            location: selectedCoachForAI.city_name || 'San Jose del Monte, Bulacan',
            photoUrl: selectedCoachForAI.photo_url || null,
          }}
          isOpen={!!selectedCoachForAI}
          onClose={() => setSelectedCoachForAI(null)}
        />
      )}
    </>
  );
}
