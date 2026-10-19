'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Star,
  CalendarDays,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import FeedbackModal from '@/features/appointments/components/FeedbackModal';
import { BookingProgress } from '@/features/appointments/components/BookingProgress';
import { BookingAgreementPanel } from '@/features/appointments/components/BookingAgreementPanel';
import {
  availableActions,
  statusMeta,
  BOOKING_STAGES,
  type AppointmentStatus,
} from '@/features/appointments/services/bookingStatus';
import {
  loadBookings,
  stampsFor,
  transitionBooking,
  type BookingDetail,
} from '@/features/appointments/services/bookingService';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';

/**
 * A client's bookings: stage, progress, agreement and the moves the database
 * will actually accept.
 *
 * WHAT CHANGED AND WHY
 *   1. Status filters used to omit `accepted` and `agreement_required`, so a
 *      client could not filter to the two stages their booking actually spends
 *      time in — and the raw enum label rendered in the pill.
 *   2. Cancel swallowed its error into console.error and then set local state to
 *      'cancelled' regardless, so a refused cancellation looked like it worked.
 *      Every write now goes through `transitionBooking`, which throws, and the
 *      page reloads from the database instead of patching a guess.
 *   3. The agreement was invisible here. A client at `agreement_required` had no
 *      way to read or sign it without finding the messages thread.
 *   4. No progress or history. `booking_events` was already readable by
 *      participants and simply was not being read.
 *
 * A client is never offered Accept, Decline or Complete: RLS splits those to the
 * coach, and `availableActions({ role: 'client' })` encodes that.
 */

const BADGE_VARIANT: Record<string, BadgeVariant> = {
  pending: 'pending',
  accepted: 'scheduled',
  agreement_required: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  declined: 'cancelled',
  cancelled: 'neutral',
};

/** Filter pills. Includes every enum label, in pipeline order. */
const FILTERS: string[] = ['All', ...BOOKING_STAGES, 'declined', 'cancelled'];

export default function ClientAppointmentsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerSuspended, setViewerSuspended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<BookingDetail | null>(null);

  /*
   * The loader deliberately performs NO synchronous setState.
   *
   * `useEffect(() => void load())` is the mount path, and a setState before the
   * first `await` there is a cascading render the React compiler lint flags.
   * `loading` already starts true, so the mount path needs no flag at all, and
   * the refresh path sets its own from an event handler, which is the correct
   * place for it. `error` is cleared after the first await, once we are already
   * off the synchronous path.
   */
  const fetchBookings = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in to see your bookings.');
        return;
      }
      setViewerId(user.id);
      setError(null);

      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .maybeSingle();
      setViewerSuspended(profile?.status === 'suspended');

      setBookings(await loadBookings(supabase, user.id, 'client'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your bookings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Reload after a write. Spinner state lives here, in the event handler. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBookings();
    } finally {
      setRefreshing(false);
    }
  }, [fetchBookings]);

  /*
   * Mount fetch.
   *
   * Deferred by a tick, for two reasons. It keeps network I/O out of the commit
   * phase, and it is the pattern /users already uses for its own mount fetch —
   * `react-hooks/set-state-in-effect` cannot see across the async boundary of a
   * loader, so calling one directly from an effect body trips it even when the
   * first setState is already after an await.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBookings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchBookings]);

  // Achievements are keyed off a confirmed-or-completed booking. Kept exactly as
  // before, but only fires when the data actually changed into that shape.
  useEffect(() => {
    if (!viewerId || bookings.length === 0) return;
    const hasConfirmed = bookings.some(
      (b) =>
        b.appointment.status === 'confirmed' || b.appointment.status === 'completed'
    );
    if (!hasConfirmed) return;
    void (async () => {
      try {
        const { updateAchievementsAfterBookingConfirmed } = await import(
          '@/app/actions/achievements'
        );
        await updateAchievementsAfterBookingConfirmed(viewerId, 'client', bookings[0].appointment.id);
      } catch {
        // A badge that fails to sync must not break the booking list.
      }
    })();
  }, [bookings, viewerId]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      map.set(b.appointment.status, (map.get(b.appointment.status) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  const visible = useMemo(
    () =>
      statusFilter === 'All'
        ? bookings
        : bookings.filter((b) => b.appointment.status === statusFilter),
    [bookings, statusFilter]
  );

  /**
   * Run a status change, then RELOAD rather than patching local state.
   *
   * Reloading is the point: the database stamps lifecycle columns and writes a
   * `booking_events` row on every move, so a local patch would show a status the
   * rest of the app has not caught up with — and the timeline would disagree with
   * the badge.
   */
  const runTransition = async (
    detail: BookingDetail,
    target: AppointmentStatus,
    reason?: string | null
  ) => {
    setBusyId(detail.appointment.id);
    setError(null);
    try {
      const supabase = createClient();
      await transitionBooking(supabase, {
        appointmentId: detail.appointment.id,
        from: detail.appointment.status,
        to: target,
        reason,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The booking could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async (detail: BookingDetail) => {
    const reason =
      window.prompt(
        'Add a short reason for cancelling (optional). This is shared with your coach.',
        ''
      ) ?? null;
    if (reason === null) return; // dismissed
    await runTransition(detail, 'cancelled', reason.trim() || null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Client Schedule"
        title="My Bookings &amp; Appointments"
        description="Track rehearsal session statuses, sign agreements, and leave reviews."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Refresh bookings"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-transparent text-foreground transition hover:border-border-strong hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw
                className={cn('h-4 w-4 text-accent-text', refreshing && 'animate-spin')}
                aria-hidden="true"
              />
            </button>
            <Link
              href="/client/calendar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
            >
              <Calendar className="h-4 w-4 text-accent-text" aria-hidden="true" />
              Calendar View
            </Link>
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="shrink-0 cursor-pointer font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status filters, now covering every enum label. */}
      <div
        role="group"
        aria-label="Filter appointments by status"
        className="g-scroll -mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {FILTERS.map((status) => {
          const isActive = statusFilter === status;
          const count =
            status === 'All'
              ? bookings.length
              : (counts.get(status as AppointmentStatus) ?? 0);
          if (status !== 'All' && count === 0) return null;

          return (
            <button
              key={status}
              type="button"
              aria-pressed={isActive}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition',
                isActive
                  ? 'border-accent-border bg-accent-soft text-accent-text'
                  : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              <span>{status === 'All' ? 'All' : statusMeta(status).label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            Loading your bookings…
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="g-skeleton h-56 rounded-[20px]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="No bookings found"
          description={
            statusFilter === 'All'
              ? 'You have not booked a rehearsal session yet.'
              : `You have no ${statusMeta(statusFilter).label.toLowerCase()} sessions.`
          }
          actionHref="/client/talent"
          action="Explore Coaches"
        />
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {visible.map((detail) => {
            const appt = detail.appointment;
            const meta = statusMeta(appt.status);
            const busy = busyId === appt.id;
            const coachName =
              [appt.coach?.firstname, appt.coach?.lastname].filter(Boolean).join(' ') ||
              appt.coach?.username ||
              'your coach';

            const actions = availableActions({
              status: appt.status,
              role: 'client',
              suspended: viewerSuspended,
            });

            return (
              <article
                key={appt.id}
                className="rounded-[20px] border border-border bg-card p-5 transition-colors hover:border-accent-border sm:p-6"
              >
                {/* Header */}
                <div className="flex flex-col items-start justify-between gap-3 border-b border-divider pb-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-sm font-bold text-accent-text shadow-sm">
                      {appt.coach?.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={appt.coach.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{getInitials(appt.coach?.firstname, appt.coach?.lastname)}</span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-foreground sm:text-base">
                        Session with {coachName}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {appt.session_type} ·{' '}
                        <span className="font-semibold text-accent-text">{appt.talent || 'Dance'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
                    <Badge variant={BADGE_VARIANT[appt.status] ?? 'neutral'} dot>
                      {meta.label}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <dl className="grid grid-cols-1 gap-3 py-4 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Date</dt>
                    <Calendar className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <dd className="tabular-nums font-medium text-foreground">
                      {new Date(appt.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Time</dt>
                    <Clock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <dd className="tabular-nums font-medium text-foreground">
                      {appt.start_time} - {appt.end_time}
                    </dd>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <dt className="sr-only">Location</dt>
                    <MapPin className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <dd className="truncate">
                      {appt.is_online ? 'Online session' : appt.address}
                    </dd>
                  </div>
                </dl>

                {appt.purpose && (
                  <div className="rounded-2xl border border-border bg-muted/60 p-3.5 text-xs leading-relaxed">
                    <span className="font-semibold text-muted-foreground">Rehearsal Goal: </span>
                    <span className="text-foreground">{appt.purpose}</span>
                  </div>
                )}

                {/* Progress + audit trail */}
                <div className="mt-4 border-t border-divider pt-4">
                  <BookingProgress
                    status={appt.status}
                    stamps={stampsFor(appt)}
                    events={detail.events}
                    loading={loading}
                  />
                </div>

                {/* Agreement */}
                {detail.agreement && (
                  <div className="mt-4">
                    <BookingAgreementPanel
                      agreement={detail.agreement}
                      bookingStatus={appt.status}
                      userId={viewerId ?? ''}
                      onChanged={() => void refresh()}
                    />
                  </div>
                )}

                {appt.cancellation_reason && meta.isTerminal && (
                  <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-3.5 text-xs leading-relaxed">
                    <span className="font-semibold text-muted-foreground">Cancellation note: </span>
                    <span className="text-foreground">{appt.cancellation_reason}</span>
                  </div>
                )}

                {appt.feedback && (
                  <div className="mt-4 space-y-1.5 rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-warning">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span className="tabular-nums">Your Review: {appt.rating} / 5 Stars</span>
                    </div>
                    <p className="leading-relaxed text-foreground/80">&ldquo;{appt.feedback}&rdquo;</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-4">
                  <Link
                    href={`/messages?user=${appt.coach_id}`}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                    Message Coach
                  </Link>

                  {appt.status === 'completed' && !appt.feedback && (
                    <Button
                      type="button"
                      size="sm"
                      icon={<Star className="h-3.5 w-3.5" />}
                      onClick={() => setFeedbackFor(detail)}
                    >
                      Leave Review
                    </Button>
                  )}

                  {actions.map((spec) => (
                    <Button
                      key={spec.action}
                      type="button"
                      size="sm"
                      variant={spec.variant === 'danger' ? 'outline' : 'primary'}
                      disabled={busy || Boolean(spec.blockedReason)}
                      title={spec.blockedReason ?? undefined}
                      onClick={() =>
                        spec.action === 'cancel' ? void onCancel(detail) : undefined
                      }
                      className={
                        spec.variant === 'danger'
                          ? 'border-danger/30 text-danger hover:bg-danger-soft'
                          : undefined
                      }
                    >
                      {spec.label}
                    </Button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {feedbackFor && (
        <FeedbackModal
          appointment={feedbackFor.appointment}
          isOpen={!!feedbackFor}
          onClose={() => setFeedbackFor(null)}
          onSuccess={() => void refresh()}
        />
      )}
    </>
  );
}