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
  Calendar,
  Image as ImageIcon,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Pencil,
  Cake,
  UserRound,
} from 'lucide-react';
import { AppHeader } from '@/components/shared/Navbar';
import BookingModal from '@/features/appointments/components/BookingModal';
import CoachAIAssistantModal from '@/components/shared/CoachAIAssistantModal';
import { FullCoach, Profile, Feedback, CommunityPost } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { parseGenres, getInitials } from '@/lib/utils';
import {
  ageFromBirthdate,
  formatFullName,
  formatLocation,
  formatMemberSince,
} from '@/lib/profileDisplay';
import { bookingGate, coachBookingGate } from '@/features/verification/services/verification';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { VerificationRequiredNotice } from '@/features/verification/components/VerificationRequiredNotice';
import { statusMeta } from '@/features/presence/utils/presence';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { ProfileMediaGrid } from '@/features/community/components/SignedMedia';
import { FollowButton } from '@/components/shared/FollowButton';
import { ProfileFollowList, type FollowSide } from '@/components/shared/ProfileFollowList';
import { PhilippineFlag } from '@/components/ui/PhilippineFlag';
import { fetchFollowCounts, type FollowCounts } from '@/lib/profileFollows';

/**
 * PRIVACY: the public profile reads ONLY this allowlist.
 *
 * The RLS policy on public.profiles is row-level (`FOR SELECT USING (true)`),
 * so email, contact phone, street and address_summary are all readable by any
 * client that selects them. This page must never ask for them: the target
 * profile query lists exactly the columns below (plus the coach's public
 * coaching fields) and the review query pulls only the reviewer's public
 * identity. Nothing here is enforced by hiding it in the UI — it is never
 * fetched in the first place.
 *
 * `birthdate` is the one addition, and it is deliberate. It is personal data,
 * so it is NOT displayed directly: lib/profileDisplay.ts converts it into a
 * whole-year age and renders only that. Fetching it lets the page show a real,
 * correctly-calculated age; not fetching it would mean either omitting age or
 * inventing it from the birth year alone. The precise date stays in the
 * network response and is never rendered.
 */
const TARGET_PROFILE_COLUMNS = `
  id, firstname, middlename, lastname, suffix, birthdate, username, photo_url,
  bio, role, status, custom_id,
  city_name, province_name, region_name, account_verified, created_at,
  coach_profile:coach_profiles(
    talents, genres, service_fee, duration, notice_hours, notice_days,
    payment_type, cancellation_method, portfolio_path
  ),
  client_profile:client_profiles(talent)
`;
const REVIEWER_COLUMNS =
  'id, firstname, lastname, username, photo_url, role, account_verified, city_name, province_name';

/**
 * One label/value pair in the public "Details" list.
 *
 * Extracted so every row has the same icon, label and value rhythm — the
 * previous page had two hand-written lists that drifted apart in spacing and in
 * how they treated a missing value.
 */
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
        <span className="text-accent-text">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
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
  /* One flag, not two. Before this, `if (error || !targetData)` collapsed every
     failure into the same "not found" screen, so a network or RLS error told a
     visitor their friend does not exist. Now a missing row leaves `loadError`
     null (and therefore falls through to the not-found view), while a genuine
     failure sets it and gets its own message plus a retry. */
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  // Live follow counts for the profile being viewed. `null` until the first read
  // resolves so the header never claims "0 followers" before it has looked.
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  // Which follow list the header stats opened, while the modal is showing.
  const [listSide, setListSide] = useState<FollowSide | null>(null);
  // Set when booking is attempted while blocked, so the explanation appears
  // instead of the modal opening on a form that cannot be submitted.
  const [showBookingBlock, setShowBookingBlock] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
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

      /* Fetch target profile — PUBLIC columns only (see TARGET_PROFILE_COLUMNS).

         `maybeSingle()` rather than `single()`: `single()` treats "no row" as a
         406 failure, so every legitimate visit to a deleted or mistyped id logged
         a red console error for what is an ordinary, expected outcome.
         `maybeSingle()` returns `data: null, error: null` for zero rows, which
         is exactly the signal the not-found view needs — with no error to
         swallow and nothing false to report.

         A malformed (non-UUID) id is still an error, and still reported as one:
         that is a bad request, not a missing member. */
      const { data: targetData, error } = await supabase
        .from('profiles')
        .select(TARGET_PROFILE_COLUMNS)
        .eq('id', resolvedParams.id)
        .maybeSingle();

      /* `maybeSingle()` already reports "no such row" as a null row rather than
         an error, so reaching here with an error means the request itself
         genuinely failed — a malformed id, an RLS denial, a dropped connection.
         Reporting those as "profile not found" is what previously told visitors
         their friend did not exist when the truth was that the request failed. */
      if (error) {
        setLoadError(error.message);
        return;
      }
      // No row and no error: a real, ordinary not-found. `loadError` stays null,
      // which the view below reads as "this profile does not exist".
      if (!targetData) return;

      // If coach, fetch reviews
      if (targetData.role === 'coach') {
        const { data: reviews } = await supabase
          .from('feedbacks')
          .select(`*, user:user_id(${REVIEWER_COLUMNS})`)
          .eq('coach_id', targetData.id)
          .order('created_at', { ascending: false });

        const avgRating = reviews?.length
          ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
          : 5.0;

        setTargetUser({
          ...((targetData as unknown) as FullCoach),
          rating: Number(avgRating.toFixed(1)),
          rating_count: reviews?.length || 0,
        });
        setFeedbacks(reviews || []);
      } else {
        setTargetUser(targetData as unknown as FullCoach);
      }

      // Fetch posts
      const { data: userPosts } = await supabase
        .from('community_posts')
        .select('*')
        .eq('author_id', targetData.id)
        .order('created_at', { ascending: false });

      setPosts(userPosts || []);
    } catch (err) {
      // A thrown error is a failure of the request, never "no such member".
      setLoadError(err instanceof Error ? err.message : 'Could not load this profile.');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  // Deferred through a timer: `fetchProfile` sets state, and
  // react-hooks/set-state-in-effect rejects a state-setting call in an effect
  // body; one tick keeps the same behaviour without a cascading render.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProfile();
    }, 0);
    return () => window.clearTimeout(timer);
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
  // Re-read both counts for the viewed profile. `null` stays null (em dash)
  // if the table is missing; a real zero must never be shown as "—".
  const reloadFollowCounts = useCallback(async (id: string) => {
    const c = await fetchFollowCounts(id);
    if (c.missingTable) return;
    setFollowCounts({ followers: c.followers, following: c.following });
  }, []);

  useEffect(() => {
    if (!targetUser?.id) return;
    const timer = window.setTimeout(() => {
      void reloadFollowCounts(targetUser.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [targetUser?.id, reloadFollowCounts]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="g-spin h-8 w-8 text-accent" aria-hidden="true" />
        <span className="sr-only">Loading profile</span>
      </div>
    );
  }

  /* One component for both terminal states, told apart by a flag. They are the
     same shape on purpose: same card, same action. Only the icon, the heading
     and the explanation differ, because the difference that matters is *why*
     there is nothing to show. */
  if (!targetUser) {
    const isError = Boolean(loadError);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="g-card flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
          <span
            aria-hidden="true"
            className={`flex h-12 w-12 items-center justify-center rounded-full border ${
              isError
                ? 'border-warning/40 bg-warning-soft text-warning'
                : 'border-accent-border bg-accent-soft text-accent-text'
            }`}
          >
            {isError ? (
              <ShieldAlert className="h-5 w-5" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </span>

          <div>
            <h1 className="text-base font-bold tracking-[-0.01em] text-foreground">
              {isError ? 'Could not load this profile' : 'Profile not found'}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {isError
                ? 'Something went wrong while loading. Please try again in a moment.'
                : 'This member does not exist, or their profile is no longer available.'}
            </p>
            {/* The underlying message is surfaced only on failure, where it is
                the only thing that tells an operator what actually went wrong. */}
            {isError && loadError && (
              <p className="mt-2 break-words text-[11px] text-subtle-foreground">{loadError}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {isError && (
              <button
                onClick={() => void fetchProfile()}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                <Loader2 className="h-3.5 w-3.5" aria-hidden="true" />
                Try again
              </button>
            )}
            <Link
              href="/users"
              className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              Browse members
            </Link>
            <button
              onClick={() => router.back()}
              className="inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCoach = targetUser.role === 'coach';
  const cp = targetUser.coach_profile;
  const clp = (targetUser as unknown as { client_profile?: { talent?: string | null } | null })
    .client_profile;

  /* ── Derived display values ──────────────────────────────────────────────
     Everything below is computed once, from the row that was actually fetched
     for this URL id, so the header, the details list and the sidebar cannot
     disagree about who this is. */
  const displayName = formatFullName(targetUser);
  const locationText = formatLocation(targetUser);
  const age = ageFromBirthdate(targetUser.birthdate);
  const memberSince = formatMemberSince(targetUser.created_at);
  const initials = getInitials(targetUser.firstname, targetUser.lastname);

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
                    alt={`${displayName}'s profile photo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  /* Same initials helper the header, the search results and the
                     directory use, so a member with no photo looks identical
                     everywhere. It also guarantees a letter: the old inline
                     `firstname?.[0]` rendered nothing at all for a row whose
                     name was somehow empty. */
                  <span aria-hidden="true" className="text-2xl font-bold uppercase text-accent-text">
                    {initials}
                  </span>
                )}
              </div>

              <div className="space-y-2 pb-1">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  {/* The name itself carries no role prefix. "Coach John
                      Bandianon" reads as a title baked into the person's name,
                      which then repeats in the role pill directly beside it and
                      in every heading below. The role is stated once, in the
                      pill, where it is labelled as a role. */}
                  <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground">
                    {displayName}
                  </h1>
                  {/* The member's real primary talent, for both roles. This
                      used to be a hardcoded "Performer" for every client and
                      `cp.talents` for coaches, so a client's saved discipline
                      (client_profiles.talent) was never shown at all. */}
                  <span className="g-pill-accent text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {isCoach ? cp?.talents || 'Coach' : clp?.talent || 'Performer'}
                  </span>
                  <VerifiedBadge verified={targetUser.account_verified} size="sm" />
                  {/* Live availability, beside the verified tick so both facts
                      about this account are readable in one glance. */}
                  <PublicPresence user={targetUser} />
                </div>

                {/* Username and member ID: the two stable handles for this
                    account. Rendered only when they exist — an empty "@" chip is
                    worse than no chip. */}
                {(targetUser.username || targetUser.custom_id) && (
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:justify-start">
                    {targetUser.username && (
                      <span className="font-medium text-foreground">@{targetUser.username}</span>
                    )}
                    {targetUser.custom_id && (
                      <span className="tabular-nums text-subtle-foreground">
                        ID {targetUser.custom_id}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground md:justify-start">
                  {/* Location renders ONLY when the member actually saved one.
                      The previous fallback printed "San Jose del Monte,
                      Bulacan" for everyone, which asserted a home city for
                      accounts that had never chosen one. */}
                  {locationText && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      <span>{locationText}</span>
                    </p>
                  )}

                  {/* Age, derived from the birthdate at render time so it is
                      correct on every visit without a stored column. Absent
                      when the member has no birthdate on file. */}
                  {age !== null && (
                    <p className="flex items-center gap-1">
                      <Cake className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      <span>
                        {age} {age === 1 ? 'year' : 'years'} old
                      </span>
                    </p>
                  )}

                  {memberSince && (
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      <span>{memberSince}</span>
                    </p>
                  )}

                  {/* Platform mark: our country, next to the member's location.
                      Static — there is no country column, so the flag identifies
                      the platform, not the individual (same as the dashboards). */}
                  <p
                    title="Philippines"
                    aria-label="Philippines"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-xs"
                  >
                    <PhilippineFlag />
                    <span>Philippines</span>
                  </p>

                  {/* Follower / following counts, derived from
                      public.profile_follows at read time. `null` until the first
                      read lands, which renders as an em dash rather than a
                      misleading 0. Both numbers open the shared follow-list modal
                      in the matching tab. */}
                  {followCounts ? (
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <button
                        type="button"
                        onClick={() => setListSide('followers')}
                        aria-label={`${followCounts.followers} follower${followCounts.followers === 1 ? '' : 's'} — view list`}
                        className="group/stat cursor-pointer text-left"
                      >
                        <strong className="font-bold tabular-nums text-foreground transition-colors group-hover/stat:text-accent-text">
                          {followCounts.followers}
                        </strong>{' '}
                        <span className="transition-colors group-hover/stat:text-accent-text">
                          {followCounts.followers === 1 ? 'follower' : 'followers'}
                        </span>
                      </button>
                      <span aria-hidden="true" className="text-subtle-foreground">
                        &middot;
                      </span>
                      <button
                        type="button"
                        onClick={() => setListSide('following')}
                        aria-label={`${followCounts.following} following — view list`}
                        className="group/stat cursor-pointer text-left"
                      >
                        <strong className="font-bold tabular-nums text-foreground transition-colors group-hover/stat:text-accent-text">
                          {followCounts.following}
                        </strong>{' '}
                        <span className="transition-colors group-hover/stat:text-accent-text">following</span>
                      </button>
                    </span>
                  ) : null}

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

              {isOwnProfile && (
                <Link
                  href={isCoach ? '/coach/profile/edit' : '/client/profile/edit'}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-[var(--shadow-accent)] transition-colors hover:bg-accent-hover"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit Profile
                </Link>
              )}

              {!isOwnProfile && (
                <Link
                  href="/messages"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  Message
                </Link>
              )}

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
            {/* Bio + the public facts about this account.
                The bio is NOT defaulted to a sentence the member never wrote:
                "Professional performing arts coach on Groove." read as though
                the person had written it. When there is no bio, the card says so
                plainly and the structured facts below still carry the page. */}
            <section className="g-card space-y-3 p-6">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-foreground">
                <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
                About {targetUser.firstname}
              </h2>

              {targetUser.bio ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {targetUser.bio}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-subtle-foreground">
                  This member has not added a bio yet.
                </p>
              )}

              {/* Public details, in one consistent definition list. Only the
                  fields that actually have a value produce a row, so there are
                  no empty labels and no "—" standing in for data. */}
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-divider pt-4 sm:grid-cols-2">
                <DetailRow
                  icon={<UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
                  label="Account type"
                  value={isCoach ? 'Coach' : targetUser.role === 'admin' ? 'Administrator' : 'Client'}
                />
                {targetUser.username && (
                  <DetailRow
                    icon={<UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
                    label="Username"
                    value={`@${targetUser.username}`}
                  />
                )}
                {age !== null && (
                  <DetailRow
                    icon={<Cake className="h-3.5 w-3.5" aria-hidden="true" />}
                    label="Age"
                    value={`${age} ${age === 1 ? 'year' : 'years'} old`}
                  />
                )}
                {locationText && (
                  <DetailRow
                    icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                    label="Location"
                    value={locationText}
                  />
                )}
                {memberSince && (
                  <DetailRow
                    icon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />}
                    label="Member since"
                    value={memberSince.replace('Joined ', '')}
                  />
                )}
              </dl>

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

            {/* Media Showcase.
                `p-0` + `overflow-hidden` so the grid can sit flush against the
                card edges: Instagram's mosaic runs edge-to-edge, with only the
                heading inset. The heading keeps its own padding so the label is
                still aligned with the rest of the page. */}
            <section className="g-card overflow-hidden">
              <h2 className="flex items-center gap-2 px-6 pb-4 pt-6 text-base font-bold tracking-[-0.01em] text-foreground">
                <ImageIcon className="h-4 w-4 text-success" aria-hidden="true" />
                Media &amp; Performance Showcase
              </h2>

              {posts.length === 0 ? (
                <p className="px-6 pb-6 pt-0 text-xs text-muted-foreground">
                  No media posts uploaded yet.
                </p>
              ) : (
                /* The same shared grid the client and coach profiles use — five
                   flush square columns on desktop, zero gaps, `object-cover`
                   media. This surface used to carry its own duplicate 2-column
                   `aspect-video` markup, which is what made the three profiles
                   look like different products. */
                <ProfileMediaGrid
                  items={posts}
                  emptyState={
                    /* Posts with no media at all: the mosaic above renders
                       nothing, which reads as broken media rather than "text
                       only". */
                    <p className="px-6 pb-6 text-xs text-muted-foreground">
                      This member has {posts.length} post{posts.length === 1 ? '' : 's'} but none
                      include media.
                    </p>
                  }
                />
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

            {/* Location. Shown only when the member actually saved one.
                The old version fell back to a hardcoded "San Jose del Monte,
                Bulacan" AND to `address_summary`, which is street-level data
                deliberately kept out of the public allowlist — so this card both
                invented a location and had no honest fallback to use. Now: no
                saved location, no card. */}
            {locationText && (
              <section className="g-card space-y-3 p-6 text-xs">
                <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">
                  Location
                </h2>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                  <span>
                    <span className="block font-medium text-foreground">{locationText}</span>
                    <span className="mt-0.5 block text-subtle-foreground">Philippines</span>
                  </span>
                </p>
              </section>
            )}
          </aside>
        </div>
      </main>

      {/* Follow list modal — opens from the header stat buttons with the
          matching tab, and is the same component the dashboards use. */}
      <ProfileFollowList
        open={listSide !== null}
        side={listSide ?? 'followers'}
        profileId={targetUser.id}
        onClose={() => setListSide(null)}
        onChanged={() => void reloadFollowCounts(targetUser.id)}
      />

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
            fullName: displayName,
            role: 'Coach',
            talents: cp?.talents,
            genres: cp?.genres,
            bio: targetUser.bio,
            serviceFee: cp?.service_fee,
            duration: cp?.duration,
            /* `address_summary`, `contact` and `email` are intentionally NOT in
               TARGET_PROFILE_COLUMNS, so they are always undefined here. They
               were passed anyway, which made the assistant open on a coach's own
               page with three blank fields and no indication why. `locationText`
               is what the public page can actually know, so that is what it gets. */
            address: locationText || undefined,
            contact: undefined,
            email: undefined,
          }}
        />
      )}
    </div>
  );
}