'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Image as ImageIcon,
  Search,
  X,
} from 'lucide-react';
import { ShowcaseShell } from '@/features/showcase/components/ShowcaseShell';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/components/shared/cn';
import { DirectoryTabs, type DirectoryTabValue } from '@/components/directory/DirectoryTabs';
import { DirectoryFilters } from '@/components/directory/DirectoryFilters';
import { MobileFiltersSheet } from '@/components/directory/MobileFiltersSheet';
import { useDirectoryFilters } from '@/components/directory/useDirectoryFilters';

/**
 * The community tab id must match the sidebar's `#directory` / `#showcase`
 * hash links. Coaches tab = directory (default), community = showcase.
 */
const TAB_TO_HASH: Record<DirectoryTabValue, string> = {
  coaches: 'directory',
  community: 'showcase',
};
const HASH_TO_TAB: Record<string, DirectoryTabValue> = {
  directory: 'coaches',
  showcase: 'community',
};

const PREVIEW_GALLERY_SRC = '/image/talent/coach-directory-after.png';

export default function ClientTalentPage() {
  const [activeTab, setActiveTab] = useState<DirectoryTabValue>('coaches');
  const [coaches, setCoaches] = useState<FullCoach[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  /** The signed-in client's discipline, source of their community. */
  const [myTalent, setMyTalent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Modals
  const [selectedCoachForBooking, setSelectedCoachForBooking] = useState<FullCoach | null>(null);
  const [selectedCoachForAI, setSelectedCoachForAI] = useState<FullCoach | null>(null);
  const [gateNotice, setGateNotice] = useState(false);
  const [previewGalleryOpen, setPreviewGalleryOpen] = useState(false);
  const [previewImageStatus, setPreviewImageStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  );

  // One hook owns the whole filter state (search, discipline, location, fee)
  const directoryFilters = useDirectoryFilters();
  const { searchQuery, discipline, location, maxFee, resetAll } = directoryFilters;

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

  // Deep-link the tabs + honor ?q= / ?discipline= / ?location= / ?maxFee=.
  // The hash is read so sidebar links like /client/talent#directory still land
  // on the right tab; params hydrate the filters through the shared hook.
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      const tab = HASH_TO_TAB[hash];
      if (tab) setActiveTab(tab);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const setTab = useCallback((tab: DirectoryTabValue) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${TAB_TO_HASH[tab]}`);
  }, []);

  // Filter coaches
  const filteredCoaches = useMemo(() => coaches.filter((coach) => {
    const fullName = `${coach.firstname} ${coach.lastname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());

    const coachTalents = coach.coach_profile?.talents || '';
    const matchesTalent =
      discipline === 'All' || coachTalents.toLowerCase().includes(discipline.toLowerCase());

    const coachCity = coach.city_name || coach.address_summary || '';
    const matchesCity =
      location === 'All' || coachCity.toLowerCase().includes(location.toLowerCase());

    /**
     * A coach with no published `service_fee` is not priced at a hard-coded
     * number: an unstated rate is not an unaffordable one, so they always
     * pass the budget filter.
     */
    const fee = coach.coach_profile?.service_fee ?? null;
    const matchesPrice = fee === null || fee <= maxFee;

    return matchesSearch && matchesTalent && matchesCity && matchesPrice;
  }), [coaches, searchQuery, discipline, location, maxFee]);

  const isFiltered = directoryFilters.isFiltered;

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
            <DirectoryTabs value={activeTab} onChange={setTab} />

            <button
              type="button"
              onClick={openPreviewGallery}
              aria-haspopup="dialog"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-white/5 bg-[#161616] px-4 text-xs font-semibold text-foreground transition-all hover:-translate-y-px hover:border-white/10 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ImageIcon className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
              Preview Gallery
            </button>
          </div>
        }
      />

      {activeTab === 'coaches' ? (
        <div
          id="directory"
          role="tabpanel"
          aria-labelledby="directory-tab-coaches"
          className="space-y-5"
        >
          {/* Sticky filter bar — never covers the header or the sidebar */}
          <DirectoryFilters
            filters={directoryFilters}
            resultCount={filteredCoaches.length}
            totalCount={coaches.length}
            onOpenMobileSheet={() => setMobileFiltersOpen(true)}
          />

          {/* Verification Notice if client account is blocked from booking */}
          {gateNotice && !loading && (
            <VerificationRequiredNotice gate={bookingGate(currentUser)} />
          )}

          {/* Coach Grid — skeletons while loading; the filter bar stays visible */}
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
              description="Try broadening the discipline chips, the location or the fee ceiling."
              action={
                isFiltered ? (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Clear filters</span>
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
        /* Community Showcase tab — the same ShowcaseShell the coach route uses. */
        <div
          id="showcase"
          role="tabpanel"
          aria-labelledby="directory-tab-community"
        >
          <ShowcaseShell
            role="client"
            eyebrow="Community Showcase · San Jose del Monte"
            currentUser={currentUser}
            memberCommunity={communityOf(currentUser, myTalent)}
            loading={loading}
          />
        </div>
      )}

      {/* Mobile filter sheet — search stays visible in the bar behind it */}
      <MobileFiltersSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        discipline={discipline}
        setDiscipline={directoryFilters.setDiscipline}
        location={location}
        setLocation={directoryFilters.setLocation}
        maxFee={maxFee}
        setMaxFee={directoryFilters.setMaxFee}
        onReset={resetAll}
        resultCount={filteredCoaches.length}
        totalCount={coaches.length}
      />

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
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/80 text-accent-text shadow-[var(--shadow-sm)]">
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
          <figcaption className="flex flex-col gap-1   bg-card px-4 py-3 text-[11px] leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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

