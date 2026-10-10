'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Star,
  Check,
  X,
  CheckCircle2,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { Appointment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { isVerified, verificationStatusOf } from '@/features/verification/services/verification';
import { VerificationRequiredNotice } from '@/features/verification/components/VerificationRequiredNotice';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';

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

  // Whichever notice window the coach actually published.
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

  // Combine date + start_time into a timestamp for scheduled_at. start_time is
  // stored as free text ('10:00'), so it is parsed defensively and simply left
  // null when it is not HH:MM rather than producing a wrong instant.
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

export default function CoachAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [coachProfile, setCoachProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCoachProfile(profile);
      setCurrentUser(profile);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_id(*)
        `)
        .eq('coach_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleUpdateStatus = async (
    appt: Appointment,
    newStatus: 'declined' | 'completed' | 'cancelled'
  ) => {
    try {
      setActionLoading(appt.id);
      const supabase = createClient();
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appt.id);

      // `guard_booking_confirmation` in the database refuses a confirm when the
      // coach or the client is unverified. That failure is turned into a message
      // the coach can read, instead of disappearing into console.error.
      if (error) {
        setActionError(
          /verified/i.test(error.message)
            ? 'You cannot accept this session yet. Account verification is required before bookings can be confirmed.'
            : error.message
        );
        return;
      }

      // Notify client
      const statusTitles: Record<string, string> = {
        declined: 'Session Request Declined',
        completed: 'Coaching Session Completed',
        cancelled: 'Session Cancelled by Coach',
      };

      await supabase.from('notifications').insert({
        user_id: appt.client_id,
        title: statusTitles[newStatus] || 'Appointment Updated',
        message: `Coach ${coachProfile?.firstname || ''} marked your session on ${appt.date} as ${newStatus}.`,
        cta_url: '/client/appointments',
      });

      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: newStatus } : a))
      );

      // Trigger achievement check when session is completed
      if (newStatus === 'completed' && currentUser) {
        try {
          const { updateAchievementsAfterBookingConfirmed } = await import('@/app/actions/achievements');
          // Coach gets first booking achievement
          await updateAchievementsAfterBookingConfirmed(currentUser.id, 'coach', appt.id);
          // Client gets first booking achievement
          await updateAchievementsAfterBookingConfirmed(appt.client_id, 'client', appt.id);
        } catch (e) {
          console.error('Failed to update achievements:', e);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setActionError(
        err instanceof Error ? err.message : 'The booking status could not be updated.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const coachIsVerified = isVerified(coachProfile);

  /**
   * Accept a pending request.
   *
   * Three separate writes, in this order, because the database state machine
   * enforces the order: guard_booking_transition() allows
   * pending -> accepted -> agreement_required and refuses everything else. It
   * used to be a single `pending -> confirmed`, which the guard rejected with
   *   ERROR: Illegal booking transition pending -> confirmed
   *
   * The agreement is created BETWEEN the two moves rather than after both,
   * because a booking sitting at 'agreement_required' with no agreement row is
   * a dead end: the both-signed trigger can never fire without one, so the
   * booking could never be confirmed.
   *
   * 'confirmed' is never written from here. It is set only by the database once
   * both parties have signed.
   */
  const handleAccept = async (appt: Appointment) => {
    try {
      setActionLoading(appt.id);
      setActionError(null);

      const supabase = createClient();

      // --- 1. pending -> accepted -------------------------------------------
      // `.eq('status', 'pending')` makes this a compare-and-set. If the row is
      // no longer pending the update matches nothing, `.single()` raises, and a
      // double-click cannot accept twice.
      const { error: acceptErr } = await supabase
        .from('appointments')
        .update({ status: 'accepted' })
        .eq('id', appt.id)
        .eq('status', 'pending')
        .select('id')
        .single();

      if (acceptErr) {
        setActionError(
          /Illegal booking transition/i.test(acceptErr.message)
            ? 'This request has already moved on. Refresh to see its current status.'
            : acceptErr.message
        );
        return;
      }

      // --- 2. create the agreement -------------------------------------------
      // Idempotent: a partial unique index allows one agreement per booking, so
      // a retry must reuse the existing row rather than hit a constraint error.
      const { data: existingAgreement } = await supabase
        .from('agreements')
        .select('id')
        .eq('appointment_id', appt.id)
        .maybeSingle();

      if (!existingAgreement) {
        const terms = await buildAgreementTerms(supabase, appt);
        if (terms.error) {
          // The booking is already 'accepted'. That is a legitimate resting
          // state, so report it rather than pretending the accept failed.
          setActionError(
            `Request accepted, but the agreement could not be created (${terms.error}). Open it from the booking to send the agreement.`
          );
          setAppointments((prev) =>
            prev.map((a) => (a.id === appt.id ? { ...a, status: 'accepted' } : a))
          );
          return;
        }
        const { error: agreementErr } = await supabase
          .from('agreements')
          .insert({ ...terms.row, client_id: appt.client_id, coach_id: appt.coach_id, appointment_id: appt.id });
        if (agreementErr) {
          setActionError(
            `Request accepted, but the agreement could not be created (${agreementErr.message}).`
          );
          setAppointments((prev) =>
            prev.map((a) => (a.id === appt.id ? { ...a, status: 'accepted' } : a))
          );
          return;
        }
      }

      // --- 3. accepted -> agreement_required ---------------------------------
      // Only once the agreement exists. Both parties now need to sign.
      const { error: sendErr } = await supabase
        .from('appointments')
        .update({ status: 'agreement_required' })
        .eq('id', appt.id)
        .eq('status', 'accepted');

      if (sendErr) {
        setActionError(
          `Request accepted, but sending the agreement failed (${sendErr.message}).`
        );
        setAppointments((prev) =>
          prev.map((a) => (a.id === appt.id ? { ...a, status: 'accepted' } : a))
        );
        return;
      }

      await supabase.from('notifications').insert({
        user_id: appt.client_id,
        title: 'Session Request Accepted',
        message: `Coach ${coachProfile?.firstname || ''} accepted your request for ${appt.date}. An agreement is ready for both of you to sign.`,
        cta_url: '/client/appointments',
      });

      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: 'agreement_required' } : a))
      );
    } catch (err) {
      console.error('Error accepting request:', err);
      setActionError(
        err instanceof Error ? err.message : 'The request could not be accepted.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Pills are human labels ('Agreement Required'), statuses are enum labels
  // ('agreement_required'). Comparing them case-insensitively is not enough —
  // the space and the underscore differ — so normalise both to underscores.
  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter === 'All') return true;
    return normalise(a.status) === normalise(statusFilter);
  });

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow="Coaching Requests"
        title="Coaching Requests &amp; Schedule"
        description="Manage booking requests, accept rehearsal schedules, and coordinate with clients."
        action={
          <Link
            href="/coach/calendar"
            className="inline-flex h-10 select-none items-center justify-center gap-2 rounded-full border border-border bg-transparent px-5 text-sm font-semibold tracking-[-0.01em] text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-muted active:translate-y-0"
          >
            <Calendar className="h-4 w-4 text-accent-text" aria-hidden="true" />
            Calendar View
          </Link>
        }
      />

      {/* An unverified coach cannot confirm bookings, so say so before the
          buttons are pressed. Declining and cancelling stay available. */}
      {!loading && coachProfile && !isVerified(coachProfile) && (
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
          className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
        >
          {actionError}
        </div>
      )}

        {/* Status Filter Pills with live counts */}
      <div className="g-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        {['All', 'Pending', 'Accepted', 'Agreement Required', 'Confirmed', 'Completed', 'Declined', 'Cancelled'].map((status) => {
          const isActive = statusFilter === status;
          const count =
            status === 'All'
              ? appointments.length
              : appointments.filter((a) => normalise(a.status) === normalise(status)).length;

          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              aria-pressed={isActive}
              className={`min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'border-accent-border bg-accent-soft text-accent-text'
                  : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
              }`}
            >
              <span>{status}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                }`}
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
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No appointments found"
          description={`You do not have any ${statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} requests at this time.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {filteredAppointments.map((appt) => {
            // 'accepted' and 'agreement_required' are real enum labels. Without
            // entries here they would render as the fallback badge and read as
            // an unknown state.
            const statusVariant: Record<string, BadgeVariant> = {
              pending: 'pending',
              accepted: 'confirmed',
              agreement_required: 'pending',
              confirmed: 'confirmed',
              completed: 'completed',
              declined: 'cancelled',
              cancelled: 'neutral',
            };

            return (
              <article
                key={appt.id}
                className="rounded-[20px] border border-border bg-card p-5 transition-colors hover:border-accent-border sm:p-6"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-divider pb-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft text-sm font-bold text-accent-text">
                      {appt.client?.photo_url ? (
                        <img
                          src={appt.client.photo_url}
                          alt={appt.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{appt.name?.[0] || 'C'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-foreground">
                        {appt.name}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {appt.session_type} ·{' '}
                        <span className="font-semibold text-accent-text">{appt.talent || 'Dance'}</span> · Level:{' '}
                        {appt.experience}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[appt.status] || 'neutral'} dot>
                      {appt.status}
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
                    <span className="truncate">{appt.address}</span>
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

                {/* Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-4">
                  <Link
                    href={`/messages?user=${appt.client_id}`}
                    className="inline-flex h-9 min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                    Message Student
                  </Link>

                  {appt.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(appt, 'declined')}
                        disabled={actionLoading === appt.id}
                        className="border-danger/40 text-danger hover:bg-danger-soft hover:text-danger"
                        icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Decline
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAccept(appt)}
                        disabled={actionLoading === appt.id || !coachIsVerified}
                        title={
                          coachIsVerified
                            ? 'Accept this request and send the agreement for both parties to sign'
                            : 'Complete account verification to accept bookings'
                        }
                        icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        {coachIsVerified ? 'Accept Request' : 'Verify to Accept'}
                      </Button>
                    </>
                  )}

                  {/* Accepted but the agreement has not gone out yet. Retrying is
                      safe: handleAccept reuses an existing agreement row. */}
                  {appt.status === 'accepted' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAccept(appt)}
                      disabled={actionLoading === appt.id}
                      icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      Send Agreement
                    </Button>
                  )}

                  {/* Waiting on the two signatures. Confirming is the database's
                      job, not this button's. */}
                  {appt.status === 'agreement_required' && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-text">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Agreement sent — waiting for both signatures
                    </p>
                  )}

                  {appt.status === 'confirmed' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStatus(appt, 'completed')}
                      disabled={actionLoading === appt.id}
                      icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      Mark Completed
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
