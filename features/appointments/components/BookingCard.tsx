'use client';

import React from 'react';
import { Calendar, Clock, MapPin, Star, FileSignature } from 'lucide-react';
import type { BookingDetail } from '../services/bookingService';
import { statusMeta } from '../services/bookingStatus';
import {
  formatBookingDate,
  formatClock,
  formatRelativeTime,
  getBookingCountdown,
  isActiveStatus,
} from '../services/bookingTime';
import { hasPendingReschedule } from '../services/rescheduleRequest';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';
import { BookingTracker } from './BookingTracker';
import { BookingActions, type BookingActionsProps } from './BookingActions';

const BADGE_VARIANT: Record<string, BadgeVariant> = {
  pending: 'pending',
  info: 'scheduled',
  success: 'confirmed',
  neutral: 'completed',
  danger: 'cancelled',
};

const COUNTDOWN_TONE = {
  urgent: 'border-danger/30 bg-danger-soft text-danger',
  soon: 'border-warning/30 bg-warning-soft text-warning',
  normal: 'border-accent-border bg-accent-soft text-accent-text',
  past: 'border-border bg-muted text-muted-foreground',
} as const;

export interface BookingCardProps
  extends Omit<
    BookingActionsProps,
    'detail' | 'density' | 'className' | 'showReview'
  > {
  detail: BookingDetail;
  nowMs: number;
  /** Lifecycle stamps, from `stampsFor(appointment)`. */
  stamp: Partial<Record<string, string | null>>;
  showReview?: boolean;
  onOpenDetails: (detail: BookingDetail) => void;
  className?: string;
}

/**
 * One booking, on either dashboard.
 *
 * The card is deliberately an OVERVIEW: identity, when/where, the tracker, and
 * the actions the database will accept. The full agreement, every field and the
 * audit history live in the details dialog, so a long history never pushes the
 * next booking off the screen.
 */
export function BookingCard({
  detail,
  role,
  nowMs,
  stamp,
  busy = false,
  canWrite,
  writeBlockedReason,
  showReview = false,
  onOpenDetails,
  className,
  ...actions
}: BookingCardProps) {
  const appointment = detail.appointment;
  const meta = statusMeta(appointment.status);
  const counterparty = role === 'client' ? appointment.coach : appointment.client;
  const counterpartyName =
    role === 'client'
      ? [appointment.coach?.firstname, appointment.coach?.lastname]
          .filter(Boolean)
          .join(' ') ||
        appointment.coach?.username ||
        'your coach'
      : appointment.name ||
        [appointment.client?.firstname, appointment.client?.lastname]
          .filter(Boolean)
          .join(' ') ||
        'your client';

  const countdown = getBookingCountdown(
    appointment.status,
    appointment.date,
    appointment.start_time,
    nowMs
  );
  const requestPending =
    hasPendingReschedule(appointment) && isActiveStatus(appointment.status);
  const clientDisplayName =
    appointment.name ||
    [appointment.client?.firstname, appointment.client?.lastname].filter(Boolean).join(' ') ||
    'Client';
  const coachDisplayName =
    [appointment.coach?.firstname, appointment.coach?.lastname].filter(Boolean).join(' ') ||
    appointment.coach?.username ||
    'Coach';
  // loadBookings joins only the COUNTERPARTY, so the viewer's own profile is not
  // available here. Build both actor names from the appointment itself and map
  // the viewer to "You"; falling back to "Someone" would be worse than a label.
  const actorNames: Record<string, string> = {
    [appointment.client_id]: role === 'client' ? 'You' : clientDisplayName,
    [appointment.coach_id]: role === 'coach' ? 'You' : coachDisplayName,
  };
  const needsAttention =
    requestPending ||
    (role === 'coach' && appointment.status === 'pending') ||
    appointment.status === 'agreement_required';

  const updatedLabel = formatRelativeTime(
    appointment.updated_at ?? appointment.created_at,
    nowMs
  );

  return (
    <article
      id={`booking-${appointment.id}`}
      className={cn(
        'group relative overflow-hidden rounded-[20px] border bg-card p-5 transition-colors sm:p-6',
        needsAttention
          ? 'border-accent-border/70 shadow-[var(--shadow-sm)]'
          : 'border-border hover:border-accent-border',
        className
      )}
    >
      {/* A single gold edge marks the cards that need a decision. It is
          decoration, not information: the badge and the tracker say the same
          thing in text. */}
      {needsAttention && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] bg-brand-sunburst"
        />
      )}

      {/* ── Identity + status ── */}
      <div className="flex flex-col items-start justify-between gap-3 border-b border-divider pb-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted text-sm font-bold text-accent-text shadow-sm',
              role === 'client' ? 'rounded-2xl' : 'rounded-full'
            )}
          >
            {counterparty?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={counterparty.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>
                {role === 'client'
                  ? getInitials(appointment.coach?.firstname, appointment.coach?.lastname)
                  : getInitials(appointment.client?.firstname, appointment.client?.lastname)}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-foreground sm:text-base">
                {role === 'client' ? `Session with ${counterpartyName}` : counterpartyName}
              </h3>
              {role === 'coach' &&
                (appointment.client?.account_verified ? (
                  <VerifiedBadge verified size="sm" label="Verified client" />
                ) : (
                  <Badge variant="pending" dot>
                    Client unverified
                  </Badge>
                ))}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {appointment.session_type} ·{' '}
              <span className="font-semibold text-accent-text">
                {appointment.talent || 'Dance'}
              </span>
              {role === 'coach' && appointment.experience
                ? ` · Level: ${appointment.experience}`
                : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-subtle-foreground">
              Updated {updatedLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
          {countdown && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums',
                COUNTDOWN_TONE[countdown.tone]
              )}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {countdown.text}
            </span>
          )}
          <Badge variant={BADGE_VARIANT[meta.badge] ?? 'neutral'} dot>
            {meta.label}
          </Badge>
        </div>
      </div>

      {/* ── When / where ── */}
      <dl className="grid grid-cols-1 gap-3 py-4 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Date</dt>
          <Calendar className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <dd className="font-medium tabular-nums text-foreground">
            {formatBookingDate(appointment.date)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Time</dt>
          <Clock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <dd className="font-medium tabular-nums text-foreground">
            {formatClock(appointment.start_time)} – {formatClock(appointment.end_time)}
          </dd>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <dt className="sr-only">Location</dt>
          <MapPin className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <dd className="truncate">
            {appointment.is_online ? 'Online session' : appointment.address}
          </dd>
        </div>
      </dl>

      {appointment.purpose && (
        <div className="rounded-2xl border border-border bg-muted/60 p-3.5 text-xs leading-relaxed">
          <span className="font-semibold text-muted-foreground">
            {role === 'client' ? 'Rehearsal Goal: ' : 'Session Goal: '}
          </span>
          <span className="text-foreground">{appointment.purpose}</span>
          {role === 'coach' && appointment.message && (
            <p className="mt-1 italic text-muted-foreground">
              &ldquo;{appointment.message}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* ── Tracker ── */}
      <div className="mt-4 border-t border-divider pt-4">
        <BookingTracker
          appointment={appointment}
          stamp={stamp}
          events={detail.events}
          names={actorNames}
          role={role}
          nowMs={nowMs}
          compact
          showHistory={false}
        />
      </div>

      {/* The agreement itself belongs in the dialog, but its existence is the
          single reason a booking is sitting at this stage — say so here. */}
      {appointment.status === 'agreement_required' && detail.agreement && (
        <button
          type="button"
          onClick={() => onOpenDetails(detail)}
          className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-2xl border border-accent-border bg-accent-soft px-3.5 py-2.5 text-left text-xs font-semibold text-accent-text transition hover:border-accent-border hover:bg-accent-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <FileSignature className="h-4 w-4 shrink-0" aria-hidden="true" />
          Agreement ready to review — open details to read and sign
        </button>
      )}

      {appointment.feedback && (
        <div className="mt-4 space-y-1.5 rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-warning">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span className="tabular-nums">
              {role === 'client' ? 'Your Review' : 'Student Rating'}: {appointment.rating} / 5
            </span>
          </div>
          <p className="leading-relaxed text-foreground/80">&ldquo;{appointment.feedback}&rdquo;</p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="mt-5 flex flex-col gap-2 border-t border-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onOpenDetails(detail)}
          className="justify-center"
        >
          View Details
        </Button>
        <BookingActions
          detail={detail}
          role={role}
          busy={busy}
          canWrite={canWrite}
          writeBlockedReason={writeBlockedReason}
          showReview={showReview}
          density="card"
          {...actions}
        />
      </div>
    </article>
  );
}

export default BookingCard;
