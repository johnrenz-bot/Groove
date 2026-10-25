'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock,
  Loader2,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import type { Appointment, FullCoach } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  coachBookingGate,
  isVerified,
  verificationStatusOf,
} from '@/features/verification/services/verification';
import { VerificationRequiredNotice } from '@/features/verification/components/VerificationRequiredNotice';
import { BookingCard } from '@/features/appointments/components/BookingCard';
import { BookingSummaryStrip } from '@/features/appointments/components/BookingSummaryStrip';
import { CoachAvailabilitySnapshot } from '@/features/appointments/components/CoachAvailabilitySnapshot';
import { BookingDetailsModal } from '@/features/appointments/components/BookingDetailsModal';
import {
  BookingActionDialog,
  type BookingDialogMode,
} from '@/features/appointments/components/BookingActionDialog';
import { StatusFilterBar } from '@/features/appointments/components/StatusFilterBar';
import {
  BOOKING_STAGES,
  statusMeta,
} from '@/features/appointments/services/bookingStatus';
import {
  acceptBooking,
  approveReschedule,
  clearRescheduleRequest,
  loadBookings,
  stampsFor,
  transitionBooking,
  type BookingDetail,
} from '@/features/appointments/services/bookingService';
import { parseRescheduleRequest } from '@/features/appointments/services/rescheduleRequest';
import {
  parseBookingStart,
  sortBookings,
  timeToMinutes,
} from '@/features/appointments/services/bookingTime';
import { useNow } from '@/features/appointments/hooks/useNow';
import { useBookingsLive } from '@/features/appointments/hooks/useBookingsLive';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';

/**
 * A coach's booking requests: accept, decline, complete, sign, and answer
 * reschedule requests.
 *
 * WHAT IS NEW HERE
 *   - The same `<BookingTracker>` / `<BookingCard>` / `<BookingActions>` as the
 *     client page, so both sides of one booking see the same pipeline.
 *   - A reschedule request is actionable: approve writes the new date/time into
 *     the existing columns, keep-original clears the request. Neither invents a
 *     status, because `appointment_status` has no `rescheduled` label.
 *   - Decline/complete/cancel now use a confirmation dialog instead of
 *     `window.prompt`, and a refused write leaves the dialog open.
 *   - Realtime + a visible polling fallback keep incoming requests current.
 *
 * Accept is still `acceptBooking`: pending -> accepted -> agreement written ->
 * agreement_required, with each step a compare-and-set. The database remains the
 * only sender of notifications, so there is no manual notification insert here.
 */

/**
 * Derive the agreement body from the coach's own published terms.
 *
 * Everything written here comes from a real column on coach_profiles or from
 * the booking itself. Where a coach has genuinely left a field blank (both live
 * coaches have notice_hours = 0, notice_days = 0 and a null
 * cancellation_method) the agreement says so in words rather than inventing a
 * policy — a fabricated cancellation window on a document both parties sign
 * would be worse than an acknowledged gap.
 */
async function buildAgreementTerms(
  supabase: ReturnType<typeof createClient>,
  appt: Appointment
): Promise<{ row: Record<string, unknown>; error: string | null }> {
  const { data: coachRow, error: coachErr } = await supabase
    .from('coach_profiles')
    .select('service_fee, duration, payment_type, payment_handle, notice_hours, notice_days, cancellation_method')
    .eq('id', appt.coach_id)
    .maybeSingle();

  if (coachErr) return { row: {}, error: coachErr.message };

  const fee = coachRow?.service_fee ?? null;
  const duration = coachRow?.duration ?? appt.session_type ?? null;
  const noticeHours = coachRow?.notice_hours ?? null;
  const noticeDays = coachRow?.notice_days ?? null;
  const freeMethod = coachRow?.cancellation_method ?? null;

  const noticeWindow = noticeDays
    ? `${noticeDays} day${noticeDays === 1 ? '' : 's'} before the session`
    : noticeHours
      ? `${noticeHours} hour${noticeHours === 1 ? '' : 's'} before the session`
      : null;

  const cancellation = freeMethod
    ? `Cancellation: ${freeMethod}. ${noticeWindow ? `Notice required: ${noticeWindow}.` : ''}`.trim()
    : noticeWindow
      ? `Notice required: ${noticeWindow}. The coach has not published a specific cancellation method.`
      : 'The coach has not published a cancellation policy or notice period. Please confirm cancellation terms with the coach before signing.';

  const paymentLabel =
    coachRow?.payment_type === 'online'
      ? `Online payment${coachRow?.payment_handle ? ` via ${coachRow.payment_handle}` : ''}.`
      : coachRow?.payment_type === 'cash'
        ? 'Cash on site / on completion of the session.'
        : 'Payment method to be confirmed with the coach.';

  const responsibilities = [
    'Client: attend the session at the agreed time and location, and arrive prepared.',
    'Coach: deliver the agreed coaching for the full booked duration.',
    'Either party: give notice as described in the cancellation terms above when cancelling.',
  ].join('\n');

  // start_time is stored as free text ('10:00'), so it is parsed defensively and
  // simply left null when it is not HH:MM rather than producing a wrong instant.
  let scheduledAt: string | null = null;
  const hhmm = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(appt.start_time ?? '');
  if (hhmm && appt.date) {
    const d = new Date(appt.date);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(Number(hhmm[1]), Number(hhmm[2]), 0, 0);
      scheduledAt = d.toISOString();
    }
  }

  return {
    row: {
      version: '1.0',
      status: 'awaiting_signatures',
      agreement_date: appt.date ?? null,
      session_type: appt.session_type ?? null,
      location: appt.location ?? appt.address ?? null,
      rate: fee,
      appointment_price: fee != null ? String(fee) : null,
      session_duration: duration,
      payment_method: coachRow?.payment_type ?? null,
      notice_hours: noticeHours,
      notice_days: noticeDays,
      cancellation_method: freeMethod,
      cancellation_terms: cancellation,
      terms: cancellation,
      payment_terms: paymentLabel,
      responsibilities,
      scheduled_at: scheduledAt,
      content: `Coaching session on ${appt.date ?? 'a date to be agreed'} at ${appt.start_time ?? 'a time to be agreed'} for ${appt.talent ?? 'the requested discipline'}.`,
    },
    error: null,
  };
}

const FILTERS: string[] = ['All', ...BOOKING_STAGES, 'declined', 'cancelled'];

const noop = () => {
  /* Client-only action: not rendered for a coach, but the shared card requires it. */
};

interface DialogState {
  id: number;
  mode: BookingDialogMode;
}

export default function CoachAppointmentsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [coachProfile, setCoachProfile] = useState<FullCoach | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const nowMs = useNow();

  const fetchBookings = useCallback(async (silent = false) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setActionError('Sign in to see your coaching requests.');
        return;
      }
      setViewerId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, coach_profile:coach_profiles(*)')
        .eq('id', user.id)
        .single();
      if (profile) setCoachProfile(profile as FullCoach);

      if (!silent) setActionError(null);
      setBookings(await loadBookings(supabase, user.id, 'coach'));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Your requests could not be loaded.');
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
    role: 'coach',
    onRefresh: liveRefresh,
  });

  const gate = coachBookingGate(coachProfile);
  const canWrite = gate.allowed;
  const writeBlockedReason = gate.reason;
  const coachIsVerified = isVerified(coachProfile);

  const afterWrite = useCallback(async () => {
    await fetchBookings(true);
  }, [fetchBookings]);

  /**
   * Accept a pending request, or push an accepted one on to the agreement.
   *
   * The three-step order is `acceptBooking`'s, mirroring the database guard:
   * pending -> accepted, then the agreement row, then accepted ->
   * agreement_required. Each step is a compare-and-set, so a double-click cannot
   * accept twice, and the agreement is written BETWEEN the moves because a
   * booking at 'agreement_required' with no agreement is a dead end.
   */
  const handleAccept = async (detail: BookingDetail) => {
    setDetailsId(null);
    setBusyId(detail.appointment.id);
    setActionError(null);
    try {
      const supabase = createClient();
      const terms = await buildAgreementTerms(supabase, detail.appointment);
      if (terms.error) {
        setActionError(
          `The request was not accepted because the agreement terms could not be prepared (${terms.error}). Try again, or ask an administrator to check the coach profile.`
        );
        await afterWrite();
        return;
      }

      const { agreementError } = await acceptBooking(supabase, {
        appointment: detail.appointment,
        agreementRow: terms.row,
      });
      if (agreementError) setActionError(agreementError);
      await afterWrite();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The request could not be accepted.');
      await afterWrite();
    } finally {
      setBusyId(null);
    }
  };

  const handleTransition = async (
    detail: BookingDetail,
    target: 'declined' | 'cancelled' | 'completed',
    reason?: string | null
  ): Promise<boolean> => {
    setBusyId(detail.appointment.id);
    setActionError(null);
    try {
      const supabase = createClient();
      await transitionBooking(supabase, {
        appointmentId: detail.appointment.id,
        from: detail.appointment.status,
        to: target,
        reason,
      });

      // Achievements are keyed off completion. Notification is NOT sent here:
      // notify_booking_parties already tells the client, and a second manual
      // insert made every completed session notify twice.
      if (target === 'completed' && coachProfile) {
        try {
          const { updateAchievementsAfterBookingConfirmed } = await import(
            '@/app/actions/achievements'
          );
          await updateAchievementsAfterBookingConfirmed(
            coachProfile.id,
            'coach',
            detail.appointment.id
          );
          await updateAchievementsAfterBookingConfirmed(
            detail.appointment.client_id,
            'client',
            detail.appointment.id
          );
        } catch {
          // A badge that fails to sync must not undo a completed session.
        }
      }

      await afterWrite();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The booking could not be updated.');
      await afterWrite();
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveReschedule = async (detail: BookingDetail): Promise<boolean> => {
    const request = parseRescheduleRequest(
      detail.appointment.requested_changes_note,
      detail.appointment.changes_requested_at
    );
    if (!request?.requestedDate || !request.startTime || !request.endTime) {
      setActionError(
        'The requested time was not recorded in the note. Keep the original time and message the client to agree a new booking.'
      );
      return false;
    }

    const requestedStartAt = parseBookingStart(request.requestedDate, request.startTime);
    const requestedEndAt = parseBookingStart(request.requestedDate, request.endTime);
    if (
      !requestedStartAt ||
      !requestedEndAt ||
      requestedEndAt.getTime() <= requestedStartAt.getTime()
    ) {
      setActionError(
        'The requested time is incomplete. Keep the original time and message the client to agree a new booking.'
      );
      return false;
    }
    if (requestedStartAt.getTime() <= Date.now()) {
      setActionError(
        'That requested time has already passed. Keep the original time and message the client to agree a new booking.'
      );
      return false;
    }

    const requestedStart = timeToMinutes(request.startTime);
    const requestedEnd = timeToMinutes(request.endTime);
    const durationMinutes =
      request.durationMinutes ??
      (requestedStart !== null && requestedEnd !== null && requestedEnd > requestedStart
        ? requestedEnd - requestedStart
        : null);

    setBusyId(detail.appointment.id);
    setActionError(null);
    try {
      const supabase = createClient();
      await approveReschedule(supabase, {
        appointmentId: detail.appointment.id,
        fromStatus: detail.appointment.status,
        date: request.requestedDate,
        startTime: request.startTime,
        endTime: request.endTime,
        durationMinutes,
      });
      await afterWrite();
      return true;
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'The new time could not be approved.'
      );
      await afterWrite();
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleDismissReschedule = async (detail: BookingDetail): Promise<boolean> => {
    setBusyId(detail.appointment.id);
    setActionError(null);
    try {
      const supabase = createClient();
      await clearRescheduleRequest(supabase, {
        appointmentId: detail.appointment.id,
        fromStatus: detail.appointment.status,
      });
      await afterWrite();
      return true;
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'The reschedule request could not be cleared.'
      );
      await afterWrite();
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleDialogConfirm = async (reason: string | null): Promise<boolean> => {
    if (!dialog || !dialogDetail) return false;
    if (dialog.mode === 'cancel') return handleTransition(dialogDetail, 'cancelled', reason);
    if (dialog.mode === 'decline') return handleTransition(dialogDetail, 'declined', reason);
    if (dialog.mode === 'complete') return handleTransition(dialogDetail, 'completed');
    if (dialog.mode === 'approve-reschedule') return handleApproveReschedule(dialogDetail);
    if (dialog.mode === 'dismiss-reschedule') return handleDismissReschedule(dialogDetail);
    return false;
  };

  const openDialog = (detail: BookingDetail, mode: BookingDialogMode) => {
    setDetailsId(null);
    setActionError(null);
    setDialog({ id: detail.appointment.id, mode });
  };

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
    const ordered = sortBookings(bookings, 'coach', nowMs);
    return statusFilter === 'All'
      ? ordered
      : ordered.filter((b) => b.appointment.status === statusFilter);
  }, [bookings, nowMs, statusFilter]);

  // Keyed by id so a realtime refresh updates an OPEN details dialog (a new
  // signature, a cleared reschedule request) instead of leaving a stale copy.
  const detailsFor =
    detailsId === null ? null : bookings.find((b) => b.appointment.id === detailsId) ?? null;
  const dialogDetail =
    dialog === null ? null : bookings.find((b) => b.appointment.id === dialog.id) ?? null;

  const emptyDescription =
    statusFilter === 'All'
      ? 'You have no coaching requests at this time.'
      : statusFilter === 'cancelled'
        ? 'You have no cancelled sessions.'
        : statusFilter === 'declined'
          ? 'You have not declined any requests.'
          : `You have no ${statusMeta(statusFilter).label.toLowerCase()} requests.`;

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow="Coaching Requests"
        title="Coaching Requests &amp; Schedule"
        description="Respond to requests, sign agreements, approve reschedules, and keep clients informed."
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
              aria-label="Refresh requests"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-transparent text-foreground transition hover:border-border-strong hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw
                className={cn('h-4 w-4 text-accent-text', refreshing && 'animate-spin')}
                aria-hidden="true"
              />
            </button>
            <Link
              href="/coach/calendar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-5 text-sm font-semibold tracking-[-0.01em] text-foreground transition-all duration-200 hover:border-border-strong hover:bg-muted"
            >
              <Calendar className="h-4 w-4 text-accent-text" aria-hidden="true" />
              Calendar View
            </Link>
          </div>
        }
      />

      {/* An unverified coach cannot change bookings. Declining and cancelling
          stay available only because the database guard's actor check also
          refuses them; the buttons explain why instead of disappearing. */}
      {!loading && coachProfile && !coachIsVerified && (
        <VerificationRequiredNotice
          gate={{
            allowed: false,
            reason:
              verificationStatusOf(coachProfile) === 'rejected'
                ? 'Your verification was rejected, so you cannot confirm new bookings. Check your profile for the reason, correct your documents, and an administrator will review them again.'
                : 'Your account is not verified yet, so you cannot confirm new bookings. Complete your identity verification from your profile and an administrator will review it.',
            ctaHref: '/coach/profile',
          }}
        />
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
        >
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {actionError}
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

      {!loading && bookings.length > 0 && (
        <BookingSummaryStrip details={bookings} role="coach" nowMs={nowMs} />
      )}

      {!loading && coachProfile && (
        <CoachAvailabilitySnapshot
          coach={coachProfile}
          appointments={bookings}
          nowMs={nowMs}
        />
      )}

      <StatusFilterBar
        options={filterOptions}
        value={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Filter requests by status"
        className="mb-5"
      />

      {loading ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            Loading appointment requests...
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-4 rounded-[20px] border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="g-skeleton h-12 w-12 shrink-0 rounded-full" />
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
          icon={<CalendarDays className="h-6 w-6" />}
          title={statusFilter === 'All' ? 'No requests yet' : 'Nothing in this view'}
          description={emptyDescription}
          action={
            statusFilter !== 'All' ? (
              <Button size="sm" variant="outline" onClick={() => setStatusFilter('All')}>
                Show all requests
              </Button>
            ) : (
              <Link href="/coach/profile">
                <Button size="sm" variant="outline">
                  Review your coaching profile
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {visible.map((detail) => {
            const appointment = detail.appointment;
            const busy = busyId === appointment.id;
            return (
              <BookingCard
                key={appointment.id}
                detail={detail}
                role="coach"
                nowMs={nowMs}
                stamp={stampsFor(appointment)}
                busy={busy}
                canWrite={canWrite}
                writeBlockedReason={writeBlockedReason}
                onOpenDetails={(item) => setDetailsId(item.appointment.id)}
                onAccept={(item) => void handleAccept(item)}
                onDecline={(item) => openDialog(item, 'decline')}
                onComplete={(item) => openDialog(item, 'complete')}
                onCancel={(item) => openDialog(item, 'cancel')}
                onReschedule={noop}
                onApproveReschedule={(item) => openDialog(item, 'approve-reschedule')}
                onDismissReschedule={(item) => openDialog(item, 'dismiss-reschedule')}
                onReview={noop}
              />
            );
          })}
        </div>
      )}

      <BookingDetailsModal
        detail={detailsFor}
        role="coach"
        nowMs={nowMs}
        viewerId={viewerId ?? ''}
        stamp={detailsFor ? stampsFor(detailsFor.appointment) : {}}
        busy={Boolean(detailsFor && busyId === detailsFor.appointment.id)}
        canWrite={canWrite}
        writeBlockedReason={writeBlockedReason}
        onClose={() => setDetailsId(null)}
        onAccept={(item) => void handleAccept(item)}
        onDecline={(item) => openDialog(item, 'decline')}
        onComplete={(item) => openDialog(item, 'complete')}
        onCancel={(item) => openDialog(item, 'cancel')}
        onReschedule={noop}
        onApproveReschedule={(item) => openDialog(item, 'approve-reschedule')}
        onDismissReschedule={(item) => openDialog(item, 'dismiss-reschedule')}
        onReview={noop}
      />

      {dialog && dialogDetail && (
        <BookingActionDialog
          detail={dialogDetail}
          mode={dialog.mode}
          nowMs={nowMs}
          busy={busyId === dialogDetail.appointment.id}
          errorMessage={actionError}
          onClose={() => setDialog(null)}
          onConfirm={handleDialogConfirm}
        />
      )}

      {/* Kept for the same reason as the notice above: a coach who is waiting on
          signatures should not wonder whether there is a Confirm button. */}
      {!loading &&
        bookings.some((detail) => detail.appointment.status === 'agreement_required') && (
          <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
            Confirmed is set automatically when both signatures are in. Waiting on signatures is
            shown on each booking.
          </p>
        )}
    </div>
  );
}
