'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Calendar, CalendarDays, Loader2, RefreshCw, Wifi } from 'lucide-react';
import FeedbackModal from '@/features/appointments/components/FeedbackModal';
import { BookingCard } from '@/features/appointments/components/BookingCard';
import { BookingSummaryStrip } from '@/features/appointments/components/BookingSummaryStrip';
import { BookingDetailsModal } from '@/features/appointments/components/BookingDetailsModal';
import {
  BookingActionDialog,
  type BookingDialogMode,
} from '@/features/appointments/components/BookingActionDialog';
import { RescheduleDialog } from '@/features/appointments/components/RescheduleDialog';
import { StatusFilterBar } from '@/features/appointments/components/StatusFilterBar';
import {
  BOOKING_STAGES,
  statusMeta,
} from '@/features/appointments/services/bookingStatus';
import {
  loadBookings,
  requestReschedule,
  stampsFor,
  transitionBooking,
  type BookingDetail,
} from '@/features/appointments/services/bookingService';
import { encodeRescheduleRequest } from '@/features/appointments/services/rescheduleRequest';
import { sortBookings } from '@/features/appointments/services/bookingTime';
import { useNow } from '@/features/appointments/hooks/useNow';
import { useBookingsLive } from '@/features/appointments/hooks/useBookingsLive';
import { bookingGate, verificationStatusOf } from '@/features/verification/services/verification';
import type { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/components/shared/cn';

const FILTERS: string[] = ['All', ...BOOKING_STAGES, 'declined', 'cancelled'];

const noop = () => {
  /* Coach-only action: not rendered for a client, but the shared card requires it. */
};

interface DialogState {
  id: number;
  mode: BookingDialogMode;
}

/**
 * A client's bookings: live status, progress, agreement and the moves the
 * database will accept.
 *
 * WHAT IS NEW HERE
 *   - Cards and the full details dialog share one `<BookingTracker>` and one
 *     `<BookingActions>`, so the two views cannot disagree.
 *   - Realtime keeps the list in step (with a 60s polling fallback).
 *   - Cancel and reschedule are real writes with confirmation, not `window.prompt`.
 *   - The reschedule flow records a REQUEST in the existing
 *     `changes_requested_at` / `requested_changes_note` columns; there is no
 *     `rescheduled` enum value, so it must never pretend the time moved.
 *
 * A client is never offered Accept, Decline or Complete: `availableActions`
 * encodes that, and the coach page is the only caller that renders them.
 */
export default function ClientAppointmentsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);

  const nowMs = useNow();

  const fetchBookings = useCallback(async (silent = false) => {
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) setViewerProfile(profile as Profile);

      if (!silent) setError(null);
      setBookings(await loadBookings(supabase, user.id, 'client'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your bookings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Manual reload: the only path that owns the spinner. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBookings();
    } finally {
      setRefreshing(false);
    }
  }, [fetchBookings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBookings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchBookings]);

  const liveRefresh = useCallback(() => {
    void fetchBookings(true);
  }, [fetchBookings]);

  const { mode: liveMode } = useBookingsLive({
    enabled: Boolean(viewerId),
    viewerId,
    role: 'client',
    onRefresh: liveRefresh,
  });

  // Achievements are keyed off a confirmed-or-completed booking. Kept exactly as
  // before, but only fires when the data actually changed into that shape.
  useEffect(() => {
    if (!viewerId || bookings.length === 0) return;
    const hasConfirmed = bookings.some(
      (b) => b.appointment.status === 'confirmed' || b.appointment.status === 'completed'
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

  const gate = bookingGate(viewerProfile);
  const canWrite = gate.allowed;
  const writeBlockedReason = gate.reason;

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      map.set(b.appointment.status, (map.get(b.appointment.status) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  const filterOptions = useMemo(
    () =>
      FILTERS.map((status) => ({
        value: status,
        label: status === 'All' ? 'All' : statusMeta(status).label,
        count: status === 'All' ? bookings.length : (counts.get(status) ?? 0),
      })),
    [bookings.length, counts]
  );

  const visible = useMemo(() => {
    const ordered = sortBookings(bookings, 'client', nowMs);
    return statusFilter === 'All'
      ? ordered
      : ordered.filter((b) => b.appointment.status === statusFilter);
  }, [bookings, nowMs, statusFilter]);

  // Dialogs are keyed by id, not by a snapshot object: a realtime refresh must
  // update the agreement and tracker inside an OPEN details dialog. A snapshot
  // would keep showing "awaiting signatures" after the client had signed.
  const detailsFor =
    detailsId === null ? null : bookings.find((b) => b.appointment.id === detailsId) ?? null;
  const rescheduleFor =
    rescheduleId === null ? null : bookings.find((b) => b.appointment.id === rescheduleId) ?? null;
  const feedbackFor =
    feedbackId === null ? null : bookings.find((b) => b.appointment.id === feedbackId) ?? null;
  const dialogDetail =
    dialog === null ? null : bookings.find((b) => b.appointment.id === dialog.id) ?? null;

  /**
   * Run a status change, then RELOAD rather than patching local state.
   *
   * The database stamps lifecycle columns and writes a `booking_events` row on
   * every move, so a local patch would show a status the rest of the app has not
   * caught up with — and the timeline would disagree with the badge.
   */
  const runTransition = async (
    detail: BookingDetail,
    target: 'cancelled' | 'declined' | 'completed',
    reason?: string | null
  ): Promise<boolean> => {
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
      await fetchBookings(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The booking could not be updated.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleDialogConfirm = async (reason: string | null): Promise<boolean> => {
    if (!dialog || !dialogDetail) return false;
    if (dialog.mode === 'cancel') {
      return runTransition(dialogDetail, 'cancelled', reason);
    }
    return false;
  };

  const openDialog = (detail: BookingDetail, mode: BookingDialogMode) => {
    setDetailsId(null);
    setError(null);
    setDialog({ id: detail.appointment.id, mode });
  };

  const openReschedule = (detail: BookingDetail) => {
    setDetailsId(null);
    setError(null);
    setRescheduleId(detail.appointment.id);
  };

  const submitReschedule = async (draft: {
    requestedDate: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    reason: string;
  }): Promise<boolean> => {
    if (!rescheduleFor) return false;
    setBusyId(rescheduleFor.appointment.id);
    setError(null);
    try {
      const supabase = createClient();
      await requestReschedule(supabase, {
        appointmentId: rescheduleFor.appointment.id,
        fromStatus: rescheduleFor.appointment.status,
        note: encodeRescheduleRequest(draft, new Date().toISOString()),
      });
      await fetchBookings(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The reschedule request could not be sent.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const emptyDescription =
    statusFilter === 'All'
      ? 'You have not booked a rehearsal session yet.'
      : statusFilter === 'cancelled'
        ? 'You have no cancelled sessions.'
        : statusFilter === 'declined'
          ? 'No coach has declined your requests.'
          : `You have no ${statusMeta(statusFilter).label.toLowerCase()} sessions.`;

  return (
    <>
      <PageHeader
        eyebrow="Client Schedule"
        title="My Bookings &amp; Appointments"
        description="Track rehearsal session statuses, sign agreements, reschedule, and leave reviews."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
              title={
                liveMode === 'live'
                  ? 'Connected to Supabase realtime. A 60-second poll runs as a fallback.'
                  : 'Live channel is reconnecting. The page refreshes every 60 seconds.'
              }
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  liveMode === 'live' ? 'bg-success' : 'bg-warning'
                )}
              />
              <Wifi className="h-3 w-3" aria-hidden="true" />
              {liveMode === 'live' ? 'Live' : 'Auto-refresh'}
            </span>
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
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="shrink-0 cursor-pointer font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && viewerProfile && !canWrite && (
        <div className="mb-5 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
          <span className="font-bold">Booking changes are locked. </span>
          {verificationStatusOf(viewerProfile) === 'rejected'
            ? 'Your verification was rejected. Correct the documents in your profile so an administrator can review them again.'
            : 'Cancel and reschedule stay disabled until your account verification is approved.'}{' '}
          Message your coach if something is urgent.
          {gate.ctaHref && (
            <Link href={gate.ctaHref} className="ml-1 font-bold underline underline-offset-2">
              Go to profile
            </Link>
          )}
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <BookingSummaryStrip details={bookings} role="client" nowMs={nowMs} />
      )}

      <StatusFilterBar
        options={filterOptions}
        value={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Filter appointments by status"
        className="mt-6 mb-5"
      />

      {loading ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            Loading your bookings…
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-4 rounded-[20px] border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="g-skeleton h-12 w-12 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="g-skeleton h-4 w-1/3" />
                  <div className="g-skeleton h-3 w-1/2" />
                </div>
                <div className="g-skeleton h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
                <div className="g-skeleton h-3.5 w-full" />
                <div className="g-skeleton h-3.5 w-full" />
                <div className="g-skeleton h-3.5 w-full" />
              </div>
              <div className="g-skeleton h-24 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title={statusFilter === 'All' ? 'No bookings yet' : 'Nothing in this view'}
          description={emptyDescription}
          action={
            statusFilter === 'All' ? (
              <Link href="/client/talent">
                <Button size="sm">Explore Coaches</Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setStatusFilter('All')}>
                Show all bookings
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {visible.map((detail) => {
            const appointment = detail.appointment;
            const busy = busyId === appointment.id;
            return (
              <BookingCard
                key={appointment.id}
                detail={detail}
                role="client"
                nowMs={nowMs}
                stamp={stampsFor(appointment)}
                busy={busy}
                canWrite={canWrite}
                writeBlockedReason={writeBlockedReason}
                showReview={appointment.status === 'completed' && !appointment.feedback}
                onOpenDetails={(item) => setDetailsId(item.appointment.id)}
                onReview={(item) => setFeedbackId(item.appointment.id)}
                onAccept={noop}
                onDecline={noop}
                onComplete={noop}
                onApproveReschedule={noop}
                onDismissReschedule={noop}
                onCancel={(item) => openDialog(item, 'cancel')}
                onReschedule={openReschedule}
              />
            );
          })}
        </div>
      )}

      <BookingDetailsModal
        detail={detailsFor}
        role="client"
        nowMs={nowMs}
        viewerId={viewerId ?? ''}
        stamp={detailsFor ? stampsFor(detailsFor.appointment) : {}}
        busy={Boolean(detailsFor && busyId === detailsFor.appointment.id)}
        canWrite={canWrite}
        writeBlockedReason={writeBlockedReason}
        showReview={
          Boolean(
            detailsFor &&
              detailsFor.appointment.status === 'completed' &&
              !detailsFor.appointment.feedback
          )
        }
        onClose={() => setDetailsId(null)}
        onAccept={noop}
        onDecline={noop}
        onComplete={noop}
        onApproveReschedule={noop}
        onDismissReschedule={noop}
        onCancel={(item) => openDialog(item, 'cancel')}
        onReschedule={openReschedule}
        onReview={(item) => {
          setDetailsId(null);
          setFeedbackId(item.appointment.id);
        }}
      />

      {dialog && dialogDetail && (
        <BookingActionDialog
          detail={dialogDetail}
          mode={dialog.mode}
          nowMs={nowMs}
          busy={busyId === dialogDetail.appointment.id}
          errorMessage={error}
          onClose={() => setDialog(null)}
          onConfirm={handleDialogConfirm}
        />
      )}

      {rescheduleFor && (
        <RescheduleDialog
          detail={rescheduleFor}
          ownAppointments={bookings.map((item) => item.appointment)}
          nowMs={nowMs}
          busy={busyId === rescheduleFor.appointment.id}
          errorMessage={error}
          onClose={() => setRescheduleId(null)}
          onSubmit={submitReschedule}
        />
      )}

      {feedbackFor && (
        <FeedbackModal
          appointment={feedbackFor.appointment}
          isOpen={Boolean(feedbackFor)}
          onClose={() => setFeedbackId(null)}
          onSuccess={() => void refresh()}
        />
      )}
    </>
  );
}
