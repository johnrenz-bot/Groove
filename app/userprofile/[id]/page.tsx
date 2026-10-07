'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  MessageSquare,
  Star,
  Sparkles,
  Bot,
  CheckCircle2,
  Calendar,
  Image as ImageIcon,
  ArrowLeft,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { AppHeader } from '@/components/shared/Navbar';
import BookingModal from '@/features/appointments/components/BookingModal';
import CoachAIAssistantModal from '@/components/shared/CoachAIAssistantModal';
import { FullCoach, Profile, Feedback, CommunityPost } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { parseGenres } from '@/lib/utils';
import { bookingGate, coachBookingGate } from '@/features/verification/services/verification';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { VerificationRequiredNotice } from '@/features/verification/components/VerificationRequiredNotice';
import { statusMeta } from '@/features/presence/utils/presence';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { SignedMedia, useSignedMedia } from '@/features/community/components/SignedMedia';
import { FollowButton } from '@/components/shared/FollowButton';
import { fetchFollowCounts, type FollowCounts } from '@/lib/profileFollows';

/**
 * One media tile on the public profile.
 *
 * Its own component because `useSignedMedia` is a hook, and the list is built
 * with `.map()`, where hooks cannot be called. Signing is therefore per tile
 * here — acceptable because a public profile shows one member's posts, and the
 * batched path is used on the two profile grids that list many.
 */
function PublicMedia({ post }: { post: CommunityPost }) {
  const { urls, broken } = useSignedMedia([post.media_path]);
  if (!post.media_path) return null;
  return (
    <SignedMedia
      path={post.media_path}
      urls={urls}
      broken={broken}
      alt={post.caption || `${post.author?.firstname ?? 'Member'} showcase media`}
    />
  );
}

/**
 * Live availability for the profile being viewed.
 *
 * A client component of its own: this page is a client component already, but the
 * presence value has to come from the shared realtime store, and a hook cannot be
 * called conditionally or inside JSX.
 */
function PublicPresence({ user }: { user: { id: string; status?: string | null } }) {
  const presence = usePresence(user.id, user.status);
  const meta = statusMeta(presence);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      title={`Status: ${meta.label} — ${meta.hint}`}
    >
      <span className={`g-presence-dot g-presence-dot--${presence}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default function UserProfileViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [targetUser, setTargetUser] = useState<FullCoach | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  // Live follow counts for the profile being viewed. `null` until the first read
  // resolves so the header never claims "0 followers" before it has looked.
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  // Set when booking is attempted while blocked, so the explanation appears
  // instead of the modal opening on a form that cannot be submitted.
  const [showBookingBlock, setShowBookingBlock] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(myProfile);
      }

      // Fetch target profile
      const { data: targetData, error } = await supabase
        .from('profiles')
        .select(`*, coach_profile:coach_profiles(*)`)
        .eq('id', resolvedParams.id)
        .single();

      if (error || !targetData) {
        console.error('Profile not found:', error);
        return;
      }

      // If coach, fetch reviews
      if (targetData.role === 'coach') {
        const { data: reviews } = await supabase
          .from('feedbacks')
          .select(`*, user:user_id(*)`)
          .eq('coach_id', targetData.id)
          .order('created_at', { ascending: false });

        const avgRating = reviews?.length
          ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
          : 5.0;

        setTargetUser({
          ...targetData,
          rating: Number(avgRating.toFixed(1)),
          rating_count: reviews?.length || 0,
        });
        setFeedbacks(reviews || []);
      } else {
        setTargetUser(targetData);
      }

      // Fetch posts
      const { data: userPosts } = await supabase
        .from('community_posts')
        .select('*')
        .eq('author_id', targetData.id)
        .order('created_at', { ascending: false });

      setPosts(userPosts || []);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Follower / following counts for the profile being viewed. Reads
  // public.profile_follows once the profile has resolved, because it needs
  // targetUser.id.
  //
  // This sits ABOVE the `if (loading)` and `if (!targetUser)` early returns on
  // purpose. A hook called after a conditional return is a rules-of-hooks
  // violation, and in practice it throws when the profile resolves on the
  // second render and the hook order changes. The `?.id` guard inside handles
  // the not-yet-loaded case, so no early return is needed.
  //
  // Deferred through a timer so this is not a state-setting call sitting
  // directly in an effect body.
  useEffect(() => {
    if (!targetUser?.id) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchFollowCounts(targetUser.id).then((c) => {
        if (cancelled) return;
        // A missing table leaves this null, which renders as an em dash. Showing
        // "0 followers" because the table is absent would be a lie.
        if (c.missingTable) return;
        setFollowCounts({ followers: c.followers, following: c.following });
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [targetUser?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="g-spin h-8 w-8 text-accent" aria-hidden="true" />
        <span className="sr-only">Loading profile</span>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="g-card flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-sm text-muted-foreground">User profile not found.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isCoach = targetUser.role === 'coach';
  const cp = targetUser.coach_profile;
  // Your own public profile has nothing to follow, so the button is not rendered
  // at all rather than rendered disabled.
  const isOwnProfile = Boolean(currentUser?.id && currentUser.id === targetUser.id);

  // Booking needs both sides verified. On this page the viewer is always a
  // client, so the two checks are the viewer's own account and the coach.
  const viewerGate = bookingGate(currentUser);
  const coachGate = coachBookingGate(targetUser);
  const bookingBlocked = !viewerGate.allowed || !coachGate.allowed;
  const bookingBlockGate = !viewerGate.allowed
    ? viewerGate
    : {
        allowed: false as const,
        reason:
          'This coach has not completed identity verification, so bookings cannot be accepted yet. Please choose a verified coach.',
        ctaHref: null,
      };
  // coach_profiles.genres is a TEXT column holding JSON
  // `{ skill, genres: [...] }`. Splitting it on commas rendered the raw
  // JSON as a pill; parseGenres returns the names only.
  const genreList = parseGenres(cp?.genres);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <AppHeader
        userRole={currentUser?.role === 'coach' ? 'coach' : 'client'}
        userProfile={currentUser}
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-8 md:px-8 md:pt-10">
        <button
          onClick={() => router.back()}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>

        {/* ── Identity header ── */}
        <header className="g-card overflow-hidden">
          {/* A quiet accent wash instead of a violet/pink gradient — one hue. */}
          <div
            aria-hidden="true"
            className="h-24 bg-gradient-to-r from-accent-soft via-accent-soft/60 to-transparent"
          />

          <div className="relative -mt-14 flex flex-col items-center gap-5 px-6 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-[var(--shadow-md)]">
                {targetUser.photo_url ? (
                  <img
                    src={targetUser.photo_url}
                    alt={targetUser.firstname}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold uppercase text-accent-text">
                    {targetUser.firstname?.[0]}
                    {targetUser.lastname?.[0]}
                  </span>
                )}
              </div>

              <div className="space-y-2 pb-1">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground">
                    {isCoach ? 'Coach ' : ''}
                    {targetUser.firstname} {targetUser.lastname}
                  </h1>
                  <span className="g-pill-accent text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {isCoach ? cp?.talents || 'Coach' : 'Performer'}
                  </span>
                  <VerifiedBadge verified={targetUser.account_verified} size="sm" />
                  {/* Live availability, beside the verified tick so both facts
                      about this account are readable in one glance. */}
                  <PublicPresence user={targetUser} />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground md:justify-start">
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                    <span>{targetUser.city_name || targetUser.address_summary || 'San Jose del Monte'}</span>
                  </p>

                  {/* Follower / following counts, derived from
                      public.profile_follows at read time. `null` until the first
                      read lands, which renders as an em dash rather than a
                      misleading 0. */}
                  {followCounts && (
                    <span className="flex items-center gap-1.5">
                      <span>
                        <strong className="font-bold tabular-nums text-foreground">
                          {followCounts.followers}
                        </strong>{' '}
                        {followCounts.followers === 1 ? 'follower' : 'followers'}
                      </span>
                      <span aria-hidden="true" className="text-subtle-foreground">
                        &middot;
                      </span>
                      <span>
                        <strong className="font-bold tabular-nums text-foreground">
                          {followCounts.following}
                        </strong>{' '}
                        following
                      </span>
                    </span>
                  )}

                  {isCoach && (
                    <div className="flex items-center gap-1 font-semibold text-warning">
                      <Star className="h-3.5 w-3.5 fill-warning" aria-hidden="true" />
                      <span>{targetUser.rating}</span>
                      <span className="font-normal text-subtle-foreground">
                        ({targetUser.rating_count} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions for viewers */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {/* Follow / Following. Real rows in public.profile_follows; hidden
                  entirely on your own profile because there is nothing to
                  follow. `onChanged` re-reads the counts so the numbers beside
                  the location update in the same paint as the button. */}
              {!isOwnProfile && (
                <FollowButton
                  profileId={targetUser.id}
                  shape="pill"
                  onChanged={setFollowCounts}
                />
              )}

              <Link
                href="/messages"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Message
              </Link>

              {isCoach && (
                <>
                  <button
                    onClick={() => setAiOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-info/30 bg-info-soft px-4 py-2 text-xs font-semibold text-info transition-colors hover:bg-info/20"
                  >
                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                    Ask AI
                  </button>

                  {bookingBlocked ? (
                    <button
                      onClick={() => setShowBookingBlock(true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft px-5 py-2 text-xs font-bold text-warning transition-colors hover:bg-warning-soft/70"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      Verify to book
                    </button>
                  ) : (
                    <button
                      onClick={() => setBookingOpen(true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-xs font-bold text-accent-foreground shadow-[var(--shadow-accent)] transition-colors hover:bg-accent-hover"
                    >
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      Book Session
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        {/* Why booking is unavailable, when it was attempted and is blocked. */}
        {showBookingBlock && bookingBlocked && (
          <VerificationRequiredNotice gate={bookingBlockGate} />
        )}

        {/* Content Breakdown */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {/* Bio */}
            <section className="g-card space-y-3 p-6">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-foreground">
                <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
                About {targetUser.firstname}
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {targetUser.bio ||
                  (isCoach
                    ? 'Professional performing arts coach on Groove.'
                    : 'Performer and artist on Groove.')}
              </p>

              {genreList.length > 0 && (
                <div className="space-y-2 border-t border-divider pt-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                    Genres / Specialties
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {genreList.map((g, idx) => (
                      <span key={`${g}-${idx}`} className="g-pill">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Media Showcase */}
            <section className="g-card space-y-4 p-6">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-foreground">
                <ImageIcon className="h-4 w-4 text-success" aria-hidden="true" />
                Media &amp; Performance Showcase
              </h2>

              {posts.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground">No media posts uploaded yet.</p>
              ) : (
                /* Same shared renderer as the client and coach profiles. It keeps
                   this grid's own 2-column layout while resolving the
                   private-bucket path to a signed URL. */
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {posts
                    .filter((post) => post.media_path)
                    .map((post) => (
                      <article
                        key={post.id}
                        className="g-card space-y-2 overflow-hidden p-2.5"
                      >
                        <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                          <PublicMedia post={post} />
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {post.caption}
                        </p>
                      </article>
                    ))}
                </div>
              )}
              {/* Posts with no media at all: the grid above would render empty
                  cards, which reads as broken media rather than "text only". */}
              {posts.length > 0 && posts.every((post) => !post.media_path) && (
                <p className="py-4 text-xs text-muted-foreground">
                  This member has {posts.length} post{posts.length === 1 ? '' : 's'} but none
                  include media.
                </p>
              )}
            </section>

            {/* Client Reviews if Coach */}
            {isCoach && (
              <section className="g-card space-y-4 p-6">
                <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-foreground">
                  <Star className="h-4 w-4 text-warning" aria-hidden="true" />
                  Student Reviews ({feedbacks.length})
                </h2>

                {feedbacks.length === 0 ? (
                  <p className="py-4 text-xs text-muted-foreground">No reviews yet for this coach.</p>
                ) : (
                  <div className="space-y-3">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="space-y-2 rounded-xl border border-divider bg-muted/40 p-4 text-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-foreground">
                            {fb.user?.firstname} {fb.user?.lastname}
                          </span>
                          <div className="flex items-center gap-1 font-bold text-warning">
                            <Star className="h-3 w-3 fill-warning" aria-hidden="true" />
                            <span>{fb.rating} / 5</span>
                          </div>
                        </div>
                        <p className="italic text-muted-foreground">&ldquo;{fb.comment}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right Sidebar Info */}
          <aside className="space-y-6">
            {isCoach && (
              <section className="g-card space-y-4 p-6 text-xs">
                <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">
                  Coaching Terms
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-accent-border bg-accent-soft px-3 py-3">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="text-sm font-bold text-accent-text">
                      ₱{cp?.service_fee ?? 500} / session
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-divider bg-muted/40 px-3 py-3">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-bold text-foreground">{cp?.duration || '1 Hour'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-divider bg-muted/40 px-3 py-3">
                    <span className="text-muted-foreground">Advance Notice:</span>
                    <span className="font-bold text-foreground">
                      {cp?.notice_hours ?? 24} hours
                    </span>
                  </div>
                </div>

                {bookingBlocked ? (
                  <button
                    onClick={() => setShowBookingBlock(true)}
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-warning/40 bg-warning-soft font-bold text-warning transition-colors hover:bg-warning-soft/70"
                  >
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                    Verify to book
                  </button>
                ) : (
                  <button
                    onClick={() => setBookingOpen(true)}
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-accent font-bold text-accent-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover"
                  >
                    Book Session Now
                  </button>
                )}
              </section>
            )}

            <section className="g-card space-y-3 p-6 text-xs">
              <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">Location</h2>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                <span>{targetUser.city_name || targetUser.address_summary || 'San Jose del Monte, Bulacan'}</span>
              </p>
            </section>
          </aside>
        </div>
      </main>

      {/* Booking Modal */}
      {isCoach && (
        <BookingModal
          coach={targetUser}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
        />
      )}

      {/* AI Assistant Modal */}
      {isCoach && (
        <CoachAIAssistantModal
          isOpen={aiOpen}
          onClose={() => setAiOpen(false)}
          coachContext={{
            fullName: `${targetUser.firstname} ${targetUser.lastname}`,
            role: 'Coach',
            talents: cp?.talents,
            genres: cp?.genres,
            bio: targetUser.bio,
            serviceFee: cp?.service_fee,
            duration: cp?.duration,
            address: targetUser.address_summary,
            contact: targetUser.contact,
            email: targetUser.email,
          }}
        />
      )}
    </div>
  );
}