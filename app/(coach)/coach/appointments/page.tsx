'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Star,
  Loader2,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import { Appointment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { isVerified, verificationStatusOf } from '@/features/verification/services/verification';
import { VerificationRequiredNotice } from '@/features/verification/components/VerificationRequiredNotice';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { BookingProgress } from '@/features/appointments/components/BookingProgress';
import { BookingAgreementPanel } from '@/features/appointments/components/BookingAgreementPanel';
import {
  availableActions,
  statusMeta,
  BOOKING_STAGES,
  type AppointmentStatus,
} from '@/features/appointments/services/bookingStatus';
import {
  acceptBooking,
  loadBookings,
  stampsFor,
  transitionBooking,
  type BookingDetail,
} from '@/features/appointments/services/bookingService';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';

/**
 * A coach's booking requests: accept, decline, complete, and sign.
 *
 * WHAT CHANGED AND WHY
 *   1. Filters compared a human label to an enum label by lowercasing both, which
 *      silently never matched 'Agreement Required' (a space, not an underscore).
 *      Filters are now the enum labels themselves, rendered through
 *      `statusMeta` so the reader sees a sentence and the code sees the label.
 *   2. Accept/Decline/Complete wrote status and then sent a notification by hand.
 *      The database already notifies both parties from `notify_booking_parties`,
 *      so a manual insert meant every accepted booking produced TWO
 *      notifications. The manual writes are gone; the database is the only sender.
 *   3. Errors that were only logged are now shown, and every write is followed by
 *      a reload rather than a local patch — `guard_booking_transition` stamps
 *      lifecycle columns and writes a `booking_events` row on every move, so a
 *      patch would leave the progress timeline disagreeing with the badge.
 *   4. Progress and the audit trail are rendered. `booking_events` was already
 *      readable by participants and was simply never queried.
 *   5. The agreement is readable and signable from here, not only from messages.
 *
 * The transition ORDER for accepting is the database's, not this file's: see
 * `acceptBooking` — pending -> accepted -> (agreement written) -> agreement_required.
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

const BADGE_VARIANT: Record<string, BadgeVariant> = {
  pending: 'pending',
  accepted: 'scheduled',
  agreement_required: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  declined: 'cancelled',
  cancelled: 'neutral',
};

/** Filter pills. Enum labels, so the comparison can never silently miss. */
const FILTERS: string[] = ['All', ...BOOKING_STAGES, 'declined', 'cancelled'];

export default function CoachAppointmentsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [coachProfile, setCoachProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  /*
   * The loader deliberately performs NO synchronous setState — see the same note
   * on the client page. `loading` starts true, and the refresh path owns its own
   * spinner from an event handler.
   */
  const fetchBookings = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setActionError('Sign in to see your coaching requests.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCoachProfile(profile as Profile);
      setActionError(null);

      setBookings(await loadBookings(supabase, user.id, 'coach'));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Your requests could not be loaded.');
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
   * Mount fetch. Deferred by a tick for the same reason as on the client page —
   * see the note there.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBookings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchBookings]);

  const coachIsVerified = isVerified(coachProfile);
  const coachSuspended = coachProfile?.status === 'suspended';

  /**
   * Every write ends in a reload. `guard_booking_transition` writes a
   * `booking_events` row and stamps a lifecycle column on each move, so a local
   * patch would leave the timeline and the badge telling different stories.
   */
  const afterWrite = useCallback(async () => {
    await refresh();
  }, [refresh]);

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
    setBusyId(detail.appointment.id);
    setActionError(null);
    try {
      const supabase = createClient();
      const terms = await buildAgreementTerms(supabase, detail.appointment);
      if (terms.error) {
        setActionError(
          `Request accepted, but the agreement could not be created (${terms.error}). Open it from the booking to send the agreement.`
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
    target: AppointmentStatus,
    reason?: string | null
  ) => {
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The booking could not be updated.');
      await afterWrite();
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (detail: BookingDetail) => {
    const reason =
      window.prompt('Add a short reason for cancelling (optional). Shared with the client.', '') ?? null;
    if (reason === null) return;
    await handleTransition(detail, 'cancelled', reason.trim() || null);
  };

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

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow="Coaching Requests"
        title="Coaching Requests &amp; Schedule"
        description="Manage booking requests, accept rehearsal schedules, and coordinate with clients."
        action={
          <div className="flex flex-wrap items-center gap-2">
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
          stay available, which is what `availableActions` encodes. */}
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
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => void afterWrite()}
            className="shrink-0 cursor-pointer font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        role="group"
        aria-label="Filter requests by status"
        className="g-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1"
      >
        {FILTERS.map((status) => {
          const isActive = statusFilter === status;
          const count =
            status === 'All' ? bookings.length : (counts.get(status as AppointmentStatus) ?? 0);
          if (status !== 'All' && count === 0) return null;

          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={isActive}
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

      {/* List */}
      {loading ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            Loading appointment requests...
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="g-skeleton h-11 w-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="g-skeleton h-4 w-1/3" />
                  <div className="g-skeleton h-3 w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="g-skeleton h-3 w-full" />
                <div className="g-skeleton h-3 w-full" />
                <div className="g-skeleton h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No appointments found"
          description={
            statusFilter === 'All'
              ? 'You have no coaching requests at this time.'
              : `You have no ${statusMeta(statusFilter).label.toLowerCase()} requests.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {visible.map((detail) => {
            const appt = detail.appointment;
            const meta = statusMeta(appt.status);
            const busy = busyId === appt.id;

            const actions = availableActions({
              status: appt.status,
              role: 'coach',
              coachVerified: coachIsVerified,
              suspended: coachSuspended,
            });

            return (
              <article
                key={appt.id}
                className="rounded-[20px] border border-border bg-card p-5 transition-colors hover:border-accent-border sm:p-6"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-divider pb-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft text-sm font-bold text-accent-text">
                      {appt.client?.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={appt.client.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{getInitials(appt.name, '')}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-foreground">{appt.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {appt.session_type} ·{' '}
                        <span className="font-semibold text-accent-text">{appt.talent || 'Dance'}</span>{' '}
                        · Level: {appt.experience}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={BADGE_VARIANT[appt.status] ?? 'neutral'} dot>
                      {meta.label}
                    </Badge>
                    {appt.client?.account_verified ? (
                      <VerifiedBadge verified size="sm" label="Verified client" />
                    ) : (
                      <Badge variant="pending" dot>
                        Client unverified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 py-4 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <span>{new Date(appt.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <span>
                      {appt.start_time} - {appt.end_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <span className="truncate">
                      {appt.is_online ? 'Online session' : appt.address}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 rounded-xl border border-border bg-muted/60 p-3.5 text-xs">
                  <p>
                    <span className="font-semibold text-muted-foreground">Session Goal: </span>
                    <span className="text-foreground">{appt.purpose}</span>
                  </p>
                  {appt.message && (
                    <p>
                      <span className="font-semibold text-muted-foreground">Student Note: </span>
                      <span className="italic text-muted-foreground">&ldquo;{appt.message}&rdquo;</span>
                    </p>
                  )}
                </div>

                {appt.feedback && (
                  <div className="mt-4 space-y-1 rounded-xl border border-warning/30 bg-warning-soft p-3.5 text-xs">
                    <div className="flex items-center gap-1 font-bold text-warning">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>Student Rating: {appt.rating} / 5</span>
                    </div>
                    <p className="text-muted-foreground">&ldquo;{appt.feedback}&rdquo;</p>
                  </div>
                )}

                {/* Progress + audit trail */}
                <div className="mt-4 border-t border-divider pt-4">
                  <BookingProgress
                    status={appt.status}
                    stamps={stampsFor(appt)}
                    events={detail.events}
                    loading={loading}
                    names={
                      appt.client?.id && appt.coach_id
                        ? { [appt.client.id]: appt.name || 'Client', [appt.coach_id]: 'You' }
                        : {}
                    }
                  />
                </div>

                {/* Agreement */}
                {detail.agreement && (
                  <div className="mt-4">
                    <BookingAgreementPanel
                      agreement={detail.agreement}
                      bookingStatus={appt.status}
                      userId={coachProfile?.id ?? ''}
                      onChanged={() => void afterWrite()}
                    />
                  </div>
                )}

                {appt.cancellation_reason && meta.isTerminal && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5 text-xs leading-relaxed">
                    <span className="font-semibold text-muted-foreground">Cancellation note: </span>
                    <span className="text-foreground">{appt.cancellation_reason}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-4">
                  <Link
                    href={`/messages?user=${appt.client_id}`}
                    className="inline-flex h-9 min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                    Message Student
                  </Link>

                  {/* Waiting on the two signatures. Confirming is the database's
                      job, so there is deliberately no Confirm button here. */}
                  {appt.status === 'agreement_required' && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-text">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Waiting for both signatures
                    </p>
                  )}

                  {actions.map((spec) => {
                    const blocked = Boolean(spec.blockedReason);
                    return (
                      <Button
                        key={spec.action}
                        variant={
                          spec.variant === 'primary'
                            ? 'primary'
                            : spec.variant === 'danger'
                              ? 'outline'
                              : 'outline'
                        }
                        size="sm"
                        disabled={busy || blocked}
                        title={spec.blockedReason ?? undefined}
                        loading={busy && spec.action === 'accept'}
                        className={
                          spec.variant === 'danger'
                            ? 'border-danger/40 text-danger hover:bg-danger-soft hover:text-danger'
                            : undefined
                        }
                        onClick={() => {
                          if (spec.action === 'accept') void handleAccept(detail);
                          else if (spec.action === 'cancel') void handleCancel(detail);
                          else void handleTransition(detail, spec.target);
                        }}
                      >
                        {spec.action === 'accept' && !coachIsVerified ? 'Verify to accept' : spec.label}
                      </Button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}