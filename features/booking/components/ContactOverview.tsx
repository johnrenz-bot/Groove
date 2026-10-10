'use client';

/**
 * CONTACT OVERVIEW — who you are talking to, and what you two have booked.
 *
 * Replaces the old inline "Partner Details" `<aside>` in /messages. The old one
 * showed a name, a role, a hardcoded location and a Full Profile button. This
 * shows, from real rows: identity + presence, role-aware context, and the shared
 * booking history — because the whole reason to open this panel from a
 * conversation is to answer "who is this and what have we agreed".
 *
 * ROLE-AWARE BY CONSTRUCTION
 *   What is worth showing depends on who is looking. A coach wants the client's
 *   skill level and discipline; a client wants the coach's specialties and rate.
 *   Both come from the SAME booking row (appointments.experience / talent /
 *   purpose) and the same counterpart profile, so the panel is told the viewer's
 *   role and derives the rest. Nothing is duplicated per role.
 *
 * PORTAL + DISMISSAL
 *   Rendered through `createPortal` into `document.body`. Without that it is
 *   clipped by the thread's `overflow-y-auto` ancestor on mobile and can end up
 *     behind the sticky header — the panel is an overlay, so it has to live at
 *     the top of the stacking order rather than wherever its parent happens to
 *     sit. z-100 is above the header (z-30) and the sheets (z-60).
 *
 *   Three ways out, all wired: the X button, a click on the backdrop, and
 *   Escape. Escape is handled on `document` rather than on the panel so it works
 *   regardless of where focus happens to be, and the body scroll is locked while
 *   it is open so the page behind cannot move under it.
 *
 * RESPONSIVE
 *   `sm:` and up it is a centred dialog. Below `sm` it becomes a bottom sheet —
 *   full width, anchored to the bottom, scrollable — which is the shape a phone
 *   can actually use with a thumb. Both are the same markup and the same data.
 */

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  FileSignature,
  MapPin,
  Music2,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getInitials, parseGenres } from '@/lib/utils';
import { statusMeta } from '@/features/presence/utils/presence';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { agreementStatusView, sessionDateFor } from '@/features/booking/services/agreementStatus';
import {
  agreementReference,
  formatDate,
  formatMoney,
  type ConversationAgreement,
} from '@/features/booking/services/bookingAgreement';
import type { Profile } from '@/lib/types';

const GOLD = '#f2b84b';

/**
 * A subscribe function that never fires.
 *
 * `useSyncExternalStore` needs one, but the "store" here is a constant: this
 * component is either in a browser or it is not, and that never changes during
 * a session. Returning a no-op unsubscribe says exactly that.
 */
const subscribeNothing = () => () => {};

/** The appointment columns the overview needs. */
interface OverviewBooking {
  id: number;
  appointment_id: number | null;
  status: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  is_online: boolean | null;
  session_type: string | null;
  talent: string | null;
  experience: string | null;
  purpose: string | null;
  rate: number | null;
}

interface OverviewCoach {
  talents: string | null;
  genres: string | null;
  service_fee: number | null;
}

interface OverviewData {
  bookings: OverviewBooking[];
  coach: OverviewCoach | null;
  rating: number | null;
  ratingCount: number;
  latestAgreement: ConversationAgreement | null;
}

export function ContactOverview({
  open,
  onClose,
  viewer,
  partner,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  /** The signed-in member. Supplies the role and the id used for "you". */
  viewer: Profile;
  /** The person being viewed. */
  partner: Profile;
  currentUserId: string;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presence = usePresence(partner.id, partner.status);
  const isCoachViewing = viewer.role === 'coach';

  /* `loading` starts false and is derived: it is true whenever there is nothing
     to show yet for the CURRENT partner. Storing it as its own boolean meant an
     effect had to flip it on every open, which is a state-setting call in an
     effect body (react-hooks/set-state-in-effect). Deriving it means the panel
     shows its skeleton on the very first paint after opening, with no extra
     render pass and no chance of showing a previous partner's data first. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const isForCurrentPartner = loadedFor === partner.id;
  const loading = !isForCurrentPartner;

  const load = useCallback(async () => {
    try {
      const supabase = createClient();

      /* Every booking between these two people, both role directions, so the
         counts are the shared history rather than one direction of it. */
      const { data: bookingRows, error: bookingErr } = await supabase
        .from('appointments')
        .select(
          `id, appointment_id, status, date, start_time, end_time, location,
           is_online, session_type, talent, experience, purpose, rate`
        )
        .or(
          `and(client_id.eq.${currentUserId},coach_id.eq.${partner.id}),` +
            `and(client_id.eq.${partner.id},coach_id.eq.${currentUserId})`
        )
        .order('date', { ascending: false });

      if (bookingErr) throw bookingErr;

      const bookings = (bookingRows ?? []) as unknown as OverviewBooking[];

      /* Coach-side facts, only when a coach is being viewed. Selected rather
         than joined so a client viewing a client does not pay for it. */
      let coach: OverviewCoach | null = null;
      if (partner.role === 'coach') {
        const { data: coachRow } = await supabase
          .from('coach_profiles')
          .select('talents, genres, service_fee')
          .eq('id', partner.id)
          .maybeSingle();
        coach = (coachRow as OverviewCoach | null) ?? null;
      }

      /* The average rating, from the same feedbacks the public profile uses.
         Averaged here rather than fetched as a precomputed column because there
         is no such column and adding one would be a migration for a number two
         rows of arithmetic produces. */
      let rating: number | null = null;
      let ratingCount = 0;
      if (partner.role === 'coach') {
        const { data: reviews } = await supabase
          .from('feedbacks')
          .select('rating')
          .eq('coach_id', partner.id);
        const ratings = (reviews ?? [])
          .map((r) => (r as { rating: number | null }).rating)
          .filter((n): n is number => typeof n === 'number');
        ratingCount = ratings.length;
        rating = ratings.length
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : null;
      }

      /* The newest agreement, for the "latest agreement" line. Its status comes
         from the SAME agreementStatusView the cards use, so this panel cannot
         report a different status for a booking the card is showing. */
      const { data: agreementRows } = await supabase
        .from('agreements')
        .select('*, booking:appointment_id(id, status, date, start_time, end_time, location, session_type, is_online)')
        .or(
          `and(client_id.eq.${currentUserId},coach_id.eq.${partner.id}),` +
            `and(client_id.eq.${partner.id},coach_id.eq.${currentUserId})`
        )
        .order('id', { ascending: false })
        .limit(1);

      const latestAgreement =
        ((agreementRows ?? []) as unknown as ConversationAgreement[])[0] ?? null;

      setData({ bookings, coach, rating, ratingCount, latestAgreement });
      setLoadedFor(partner.id);
      setError(null);
    } catch (err) {
      // Marked as loaded even on failure: the panel then renders its error state
      // instead of an endless skeleton. `loading` is derived from this flag, so
      // an un-marked failure would spin forever.
      setLoadedFor(partner.id);
      setError(
        err instanceof Error ? err.message : 'Could not load their details right now.'
      );
    }
  }, [currentUserId, partner.id, partner.role]);

  /* Reload each time the panel is opened, so a booking made in another tab is
     reflected without closing and reopening it.

     Deferred through a timer for the same reason as the thread: `load` ends in
     setState, and calling it in the effect body is a cascading render
     (react-hooks/set-state-in-effect). The `open` dependency is what makes the
     refresh happen on open; the timer also means a burst of open/close/open
     collapses to one fetch. */
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  /* Escape to close + body scroll lock. On `document` so it works wherever focus
     is; the lock so the page behind a full-screen mobile sheet cannot move. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  /* Only portal once mounted: `document` does not exist during SSR, and a portal
     rendered on the server would throw.

     `useSyncExternalStore` rather than a mount effect with setState: this is
     genuinely "is the client environment available?", which is an external-store
     question, and the hook answers it without scheduling a second render pass
     (which is what setMounted(true) in an effect did, and what
     react-hooks/set-state-in-effect flags). The server snapshot is `false` and
     the client snapshot is `true`, so hydration matches on the first paint and
     the portal appears immediately rather than after a frame. */
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );

  const derived = useMemo(() => {
    if (!data) return null;
    const bookings = data.bookings;

    const completed = bookings.filter((b) => b.status === 'completed').length;
    const active = ['pending', 'accepted', 'agreement_required', 'confirmed'];
    const upcoming = bookings.filter(
      (b) =>
        active.includes(b.status ?? '') &&
        Boolean(b.date) &&
        new Date(b.date as string) >= new Date(new Date().toDateString())
    );
    const next = upcoming.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0] ?? null;

    /* The most recent booking, which is where "latest session goal" comes from.
       Any status counts — a goal recorded at request time is still the goal, and
       a client with one cancelled request still told the coach what they wanted. */
    const latest = bookings[0] ?? null;

    return { bookings, completed, upcoming: upcoming.length, next, latest };
  }, [data]);

  if (!open || !mounted) return null;

  const presenceMeta = statusMeta(presence);
  // `Presence` is exactly 'online' | 'away' | 'busy' | 'offline'. Only 'online'
  // gets the filled dot; away and busy are real states a member can be in, but
  // they are not "reachable now", which is what this dot claims.
  const isOnline = presence === 'online';

  const location = [partner.city_name, partner.province_name].filter(Boolean).join(', ');
  const genreList = data?.coach ? parseGenres(data.coach.genres) : [];
  const latestStatus =
    data?.latestAgreement && data.latestAgreement.booking
      ? agreementStatusView(
          data.latestAgreement,
          currentUserId,
          data.latestAgreement.booking
        )
      : null;

  const panel = (
    <div
      className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      {/* Backdrop. A click anywhere outside the panel closes it — the panel
          stops propagation so its own clicks do not. */}
      <button
        type="button"
        aria-label="Close contact overview"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-[2px]"
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Contact overview for ${partner.firstname}`}
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        {/* Grab bar — visual affordance for the mobile sheet. */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted sm:hidden"
        />

        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-divider px-5 py-4">
          <h2 className="text-sm font-bold tracking-[-0.01em] text-foreground">
            Contact Overview
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact overview"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="g-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loading && (
            <div role="status" className="space-y-4" aria-live="polite">
              <Skeleton />
              <Skeleton />
              <Skeleton />
              <span className="sr-only">Loading contact details…</span>
            </div>
          )}

          {!loading && error && (
            <p
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
            >
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              {/* ── Identity ── */}
              <div className="flex items-center gap-3.5">
                <span className="relative shrink-0">
                  <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-lg font-bold text-accent-text">
                    {partner.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={partner.photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(partner.firstname, partner.lastname)
                    )}
                  </span>
                  {/* Presence dot is driven by the realtime store, the same
                      value the thread header uses, so the two cannot disagree. */}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card ${
                      isOnline ? 'bg-success' : 'bg-muted-foreground/50'
                    }`}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-foreground">
                      {partner.firstname} {partner.lastname}
                    </p>
                    {partner.account_verified && (
                      <BadgeCheck
                        className="h-4 w-4 shrink-0 text-success"
                        aria-label="Verified"
                      />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-text">
                      {partner.role === 'coach' ? 'Coach' : 'Client'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        isOnline
                          ? 'border-success/30 bg-success-soft text-success'
                          : 'border-border bg-muted text-muted-foreground'
                      }`}
                      title={presenceMeta.hint}
                    >
                      {presenceMeta.label}
                    </span>
                  </div>
                  {partner.username && (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      @{partner.username}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Location + bio ── */}
              {(location || partner.bio) && (
                <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-3.5">
                  {location && (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text"
                        aria-hidden="true"
                      />
                      <span className="break-words">{location}</span>
                    </p>
                  )}
                  {partner.bio && (
                    <p className="text-[11px] leading-relaxed text-foreground/90">
                      {partner.bio}
                    </p>
                  )}
                </div>
              )}

              {/* ── Role-aware detail ── */}
              {isCoachViewing ? (
                <DetailGroup title="Client details" icon={<Target className="h-3.5 w-3.5" />}>
                  <DetailRow
                    label="Skill level"
                    value={derived?.latest?.experience ?? null}
                    empty="Not stated yet"
                  />
                  <DetailRow
                    label="Discipline"
                    value={derived?.latest?.talent ?? null}
                    empty="Not stated yet"
                  />
                  <DetailRow
                    label="Latest session goal"
                    value={derived?.latest?.purpose ?? null}
                    empty="Not stated yet"
                  />
                </DetailGroup>
              ) : partner.role === 'coach' ? (
                <DetailGroup
                  title="Coach details"
                  icon={<Music2 className="h-3.5 w-3.5" />}
                >
                  <DetailRow label="Specialties" value={data?.coach?.talents ?? null} empty="Not stated yet" />
                  <DetailRow
                    label="Genres"
                    value={genreList.length ? genreList.join(', ') : null}
                    empty="Not stated yet"
                  />
                  <DetailRow
                    label="Rate"
                    value={
                      data?.coach?.service_fee != null
                        ? `${formatMoney(data.coach.service_fee)} / session`
                        : null
                    }
                    empty="Not published"
                  />
                  <DetailRow
                    label="Rating"
                    value={
                      data?.rating != null
                        ? `${data.rating} / 5 (${data.ratingCount} review${
                            data.ratingCount === 1 ? '' : 's'
                          })`
                        : null
                    }
                    empty="No reviews yet"
                  />
                </DetailGroup>
              ) : null}

              {/* ── Shared activity ── */}
              <DetailGroup title="Shared activity" icon={<CalendarDays className="h-3.5 w-3.5" />}>
                {derived && derived.bookings.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Total" value={derived.bookings.length} />
                      <Stat label="Completed" value={derived.completed} />
                      <Stat label="Upcoming" value={derived.upcoming} />
                    </div>

                    {derived.next && (
                      <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-text">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          Next session
                        </p>
                        <p className="text-xs font-semibold text-foreground">
                          {formatDate(derived.next.date)}
                          {derived.next.start_time
                            ? ` · ${derived.next.start_time}`
                            : ''}
                        </p>
                        <p className="break-words text-[11px] text-muted-foreground">
                          {derived.next.is_online
                            ? 'Online session'
                            : derived.next.location || 'Location not stated'}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-3.5 py-4 text-center text-[11px] text-muted-foreground">
                    No sessions together yet.
                  </p>
                )}
              </DetailGroup>

              {/* ── Latest agreement ── */}
              {data?.latestAgreement && latestStatus && (
                <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-3.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-text">
                    <FileSignature className="h-3 w-3" aria-hidden="true" />
                    Latest agreement
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {agreementReference(data.latestAgreement)}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {sessionDateFor(
                        data.latestAgreement,
                        data.latestAgreement.booking
                      )
                        ? formatDate(
                            sessionDateFor(
                              data.latestAgreement,
                              data.latestAgreement.booking
                            )
                          )
                        : 'Date not recorded'}
                    </span>
                  </p>
                  {/* Same derivation as the cards, so this line and the card in
                      the thread can never report different statuses. */}
                  <p className="text-[11px] font-semibold text-foreground">
                    {latestStatus.message}
                  </p>
                  <Link
                    href={`/contracts/${data.latestAgreement.id}`}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-[11px] font-bold text-muted-foreground transition hover:border-border-strong hover:text-foreground"
                  >
                    View Full Agreement
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Actions ── */}
        <footer className="shrink-0 space-y-2 border-t border-divider px-5 py-4">
          <Link
            href={`/userprofile/${partner.id}`}
            style={{ backgroundColor: GOLD }}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl text-xs font-bold text-black shadow-sm transition hover:brightness-105"
          >
            View Profile
          </Link>
          <Link
            href={isCoachViewing ? '/coach/appointments' : '/client/appointments'}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-bold text-muted-foreground transition hover:border-border-strong hover:text-foreground"
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            View Bookings
          </Link>
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

/* ── Small presentational pieces ──────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2.5" aria-hidden="true">
      <div className="h-16 w-16 rounded-full bg-muted" />
      <div className="h-3.5 w-2/5 rounded bg-muted" />
      <div className="h-3 w-3/5 rounded bg-muted/70" />
    </div>
  );
}

function DetailGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-subtle-foreground">
        <span className="text-accent-text">{icon}</span>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/** A label/value row that renders an explicit placeholder rather than nothing. */
function DetailRow({
  label,
  value,
  empty,
}: {
  label: string;
  value: string | null | undefined;
  empty: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={`min-w-0 break-words text-right font-semibold ${
          value ? 'text-foreground' : 'font-normal text-subtle-foreground'
        }`}
      >
        {value || empty}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-2 py-2.5 text-center">
      <p className="text-base font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export default ContactOverview;
