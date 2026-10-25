'use client';

import React from 'react';
import {
  ArrowRight,
  Ban,
  CalendarClock,
  Check,
  Clock,
  History,
  TimerOff,
  UserX,
  XCircle,
} from 'lucide-react';
import type { Appointment } from '@/lib/types';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { cn } from '@/components/shared/cn';
import { formatDateTime } from '@/lib/utils';
import {
  buildTimeline,
  historyFromEvents,
  statusMeta,
  type AppointmentStatus,
  type BookingEvent,
  type TimelineStep,
} from '../services/bookingStatus';
import {
  formatBookingDate,
  formatClock,
  formatRelativeTime,
  isActiveStatus,
  parseBookingStart,
} from '../services/bookingTime';
import { hasPendingReschedule, parseRescheduleRequest } from '../services/rescheduleRequest';

/**
 * <BookingTracker /> — one booking pipeline, shared by both dashboards.
 *
 * THE RULE THIS COMPONENT FOLLOWS
 *   Every timestamp it prints is a real column value. The timeline comes from
 *   the booking's lifecycle `*_at` columns (stamped by the database guard), and
 *   the history comes from `booking_events` (written only by the SECURITY
 *   DEFINER trigger). The one derived timestamp is the first step, which falls
 *   back to `appointments.created_at`: "Awaiting coach" began when the request
 *   was created, so that is a fact, not an inference.
 *
 *   No status is invented to make the stepper look complete. A booking that has
 *   not reached a step shows no timestamp for it. A booking stopped off the
 *   happy path shows a banner explaining why instead of a fake fifth step.
 *
 * The same ordered list is rendered as a vertical timeline on narrow screens
 * and a horizontal stepper from `md` up. One DOM, one accessible sequence.
 */

const TRACKER_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Awaiting Coach',
  accepted: 'Accepted',
  agreement_required: 'Awaiting Signatures',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const BADGE_VARIANT: Record<string, BadgeVariant> = {
  pending: 'pending',
  accepted: 'scheduled',
  agreement_required: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  declined: 'cancelled',
  cancelled: 'neutral',
};

type OffPathTone = 'danger' | 'neutral' | 'warning' | 'accent';

interface OffPathState {
  label: string;
  description: string;
  Icon: React.ElementType;
  tone: OffPathTone;
}

const TONE_STYLES: Record<OffPathTone, string> = {
  danger: 'border-danger/30 bg-danger-soft text-danger',
  neutral: 'border-border bg-muted/60 text-muted-foreground',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  accent: 'border-accent-border bg-accent-soft text-accent-text',
};

/**
 * States the enum does not contain today. They are mapped so a legacy or
 * future row cannot render an unstyled raw string, but nothing in this app
 * writes them: `appointment_status` is the seven labels in bookingStatus.ts.
 */
const EXTRA_STATES: Record<string, OffPathState> = {
  rescheduled: {
    label: 'Rescheduled',
    description: 'This booking carries a reschedule request. The original time stands until both sides agree.',
    Icon: CalendarClock,
    tone: 'accent',
  },
  no_show: {
    label: 'No-show',
    description: 'This session was recorded as a no-show.',
    Icon: UserX,
    tone: 'warning',
  },
  'no-show': {
    label: 'No-show',
    description: 'This session was recorded as a no-show.',
    Icon: UserX,
    tone: 'warning',
  },
  expired: {
    label: 'Expired',
    description: 'This request expired before it was accepted.',
    Icon: TimerOff,
    tone: 'neutral',
  },
};

function offPathState(status: string): OffPathState | null {
  if (status === 'cancelled') {
    return {
      label: statusMeta(status).label,
      description: statusMeta(status).description,
      Icon: Ban,
      tone: 'neutral',
    };
  }
  if (status === 'declined') {
    return {
      label: statusMeta(status).label,
      description: statusMeta(status).description,
      Icon: XCircle,
      tone: 'danger',
    };
  }
  return EXTRA_STATES[status] ?? null;
}

interface NextCopy {
  title: string;
  body: string;
}

function nextStepCopy(args: {
  role: 'client' | 'coach';
  status: string | null | undefined;
  appointment: Pick<Appointment, 'date' | 'start_time'>;
  nowMs: number;
  hasRequest: boolean;
}): NextCopy {
  const { role, status, appointment, nowMs, hasRequest } = args;
  const start = parseBookingStart(appointment.date, appointment.start_time);
  const startsInFuture = start ? start.getTime() > nowMs : false;
  const when = `${formatBookingDate(appointment.date)} at ${formatClock(appointment.start_time)}`;

  if (hasRequest) {
    return role === 'client'
      ? {
          title: 'Waiting for your coach to approve the new time',
          body: 'The original time still stands until your coach responds. You can keep the thread open in Messages.',
        }
      : {
          title: 'Approve or keep the original time',
          body: 'The client asked to move this session. Approving updates the booking date and time; keeping the original clears the request.',
        };
  }

  switch (status) {
    case 'pending':
      return role === 'client'
        ? {
            title: 'Waiting on your coach',
            body: "We'll move this tracker the moment they respond. Message them if you want to add context in the meantime.",
          }
        : {
            title: 'Respond to this request',
            body: 'Accept to prepare an agreement, or decline with a reason. Either move notifies the client automatically.',
          };
    case 'accepted':
      return role === 'client'
        ? {
            title: 'Your coach is preparing the agreement',
            body: "You'll be asked to review and sign it. The session is not confirmed until both signatures are in.",
          }
        : {
            title: 'Send the agreement',
            body: 'The client is waiting to review it. Sending it moves the booking to Awaiting Signatures.',
          };
    case 'agreement_required':
      return role === 'client'
        ? {
            title: 'Sign to confirm the session',
            body: 'Read the agreement below and sign your side. The booking confirms automatically once both signatures land.',
          }
        : {
            title: 'Collect both signatures',
            body: "Sign your side if you haven't, then wait for the client. Confirming is the database's job once both signatures exist.",
          };
    case 'confirmed':
      return startsInFuture
        ? {
            title: role === 'coach' ? 'Prepare for the session' : 'Get ready',
            body: `The session is locked in for ${when}. If plans change, either party can still cancel from this page.`,
          }
        : {
            title: 'The scheduled time has passed',
            body:
              role === 'coach'
                ? 'If the session took place, mark it completed. If it did not, you can still cancel with a reason.'
                : 'Your coach can mark the session completed. Message them if something went wrong.',
          };
    case 'completed':
      return role === 'client'
        ? {
            title: 'Session complete',
            body: 'If you have not reviewed it yet, you can leave a rating for your coach from the booking card.',
          }
        : { title: 'Session complete', body: 'This booking is closed and stays in your history.' };
    case 'declined':
      return {
        title: 'No further action',
        body:
          role === 'client'
            ? 'This coach could not take the request. You can book another coach or message them about a different time.'
            : 'This request is closed. The client has been notified.',
      };
    case 'cancelled':
      return {
        title: 'This booking is closed',
        body: 'No further action is needed. The conversation stays available in Messages.',
      };
    default:
      return {
        title: 'Status unavailable',
        body: 'This booking is in a state this screen does not recognise. Refresh to read it from the database again.',
      };
  }
}

export interface BookingTrackerProps {
  appointment: Pick<
    Appointment,
    | 'status'
    | 'date'
    | 'start_time'
    | 'end_time'
    | 'created_at'
    | 'cancellation_reason'
    | 'changes_requested_at'
    | 'requested_changes_note'
  >;
  stamp: Partial<Record<string, string | null>>;
  events?: readonly BookingEvent[];
  /** id -> display name, for "who moved this". */
  names?: Readonly<Record<string, string>>;
  role?: 'client' | 'coach';
  nowMs: number;
  loading?: boolean;
  compact?: boolean;
  showHistory?: boolean;
  className?: string;
}

export function BookingTracker({
  appointment,
  stamp,
  events = [],
  names = {},
  role = 'client',
  nowMs,
  loading = false,
  compact = false,
  showHistory = true,
  className,
}: BookingTrackerProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)} role="status" aria-live="polite">
        <div className="g-skeleton h-3 w-32" />
        <div className="g-skeleton h-16 w-full rounded-2xl" />
      </div>
    );
  }

  const status = appointment.status;
  const meta = statusMeta(status);
  const rawSteps = buildTimeline(status, stamp);
  const steps: TimelineStep[] = rawSteps.map((step, index) =>
    index === 0 && !step.at && appointment.created_at
      ? { ...step, at: appointment.created_at }
      : step
  );
  const reachedCount = steps.filter((step) => step.reached).length;
  const currentIndex = steps.findIndex((step) => step.current);
  const offPath = offPathState(status);
  const pendingRequest =
    hasPendingReschedule(appointment) && isActiveStatus(appointment.status)
      ? parseRescheduleRequest(
          appointment.requested_changes_note,
          appointment.changes_requested_at
        )
      : null;
  const history = showHistory && !compact ? historyFromEvents(events, names) : [];
  const next = nextStepCopy({
    role,
    status,
    appointment,
    nowMs,
    hasRequest: Boolean(pendingRequest),
  });

  const requestedWindow = pendingRequest
    ? [
        pendingRequest.requestedDate
          ? formatBookingDate(pendingRequest.requestedDate)
          : null,
        pendingRequest.startTime && pendingRequest.endTime
          ? `${formatClock(pendingRequest.startTime)} – ${formatClock(pendingRequest.endTime)}`
          : pendingRequest.startTime
            ? formatClock(pendingRequest.startTime)
            : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Booking tracker
        </p>
        <div className="flex items-center gap-2">
          {offPath ? (
            <Badge variant="neutral" dot>
              {offPath.label}
            </Badge>
          ) : (
            <Badge variant={BADGE_VARIANT[status] ?? 'neutral'} dot>
              {meta.label}
            </Badge>
          )}
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {offPath ? `${reachedCount} of ${steps.length} steps` : `Step ${currentIndex + 1} of ${steps.length}`}
          </span>
        </div>
      </div>

      {/* ── Off-path explanation ── */}
      {offPath && (
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-xs leading-relaxed',
            TONE_STYLES[offPath.tone]
          )}
          role="status"
        >
          <offPath.Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-bold">{offPath.label}</p>
            <p className="mt-0.5 opacity-90">{offPath.description}</p>
            {status === 'cancelled' && appointment.cancellation_reason && (
              <p className="mt-1 underline decoration-current/30 underline-offset-2">
                Reason: {appointment.cancellation_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Stepper: vertical on mobile, horizontal from md ── */}
      <ol
        className={cn(
          'flex flex-col md:flex-row md:items-start',
          compact ? 'gap-0' : 'gap-0'
        )}
        aria-label="Booking progress"
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const connectorGold = Boolean(steps[index + 1]?.reached);
          return (
            <li
              key={step.status}
              className="flex min-w-0 items-stretch gap-3 md:flex-1 md:flex-col md:gap-0"
              aria-current={step.current ? 'step' : undefined}
            >
              <div className="flex flex-col items-center md:w-full md:flex-row">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-300 motion-reduce:transition-none',
                    step.reached
                      ? 'border-brand-sunburst-border bg-brand-sunburst text-brand-sunburst-fg'
                      : 'border-border bg-muted/40 text-muted-foreground',
                    step.current &&
                      'ring-2 ring-brand-sunburst-border ring-offset-2 ring-offset-card'
                  )}
                >
                  {step.reached ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <span className="tabular-nums">{index + 1}</span>
                  )}
                </span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'my-1 w-px flex-1 transition-colors duration-500 motion-reduce:transition-none md:my-0 md:ml-2 md:h-px md:w-auto md:flex-1',
                      connectorGold ? 'bg-brand-sunburst/60' : 'bg-border'
                    )}
                  />
                )}
              </div>

              <div
                className={cn(
                  'min-w-0 pb-4 md:pb-0 md:pr-3',
                  compact ? 'md:mt-1.5' : 'md:mt-2'
                )}
              >
                <p
                  className={cn(
                    'text-xs font-semibold leading-tight',
                    step.current
                      ? 'text-accent-text'
                      : step.reached
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {TRACKER_LABELS[step.status]}
                </p>
                {!compact && (
                  <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {step.reached ? (
                      step.at ? (
                        formatDateTime(step.at)
                      ) : (
                        <span className="italic">Time not recorded</span>
                      )
                    ) : (
                      <span className="italic">Not reached</span>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* ── Reschedule request ── */}
      {pendingRequest && (
        <div className="rounded-2xl border border-accent-border bg-accent-soft/70 p-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
            <p className="font-bold text-foreground">Reschedule requested</p>
            {requestedWindow && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-border bg-card px-2 py-0.5 font-semibold tabular-nums text-accent-text">
                {requestedWindow}
              </span>
            )}
          </div>
          {pendingRequest.reason && (
            <p className="mt-1.5 leading-relaxed text-foreground/80">
              &ldquo;{pendingRequest.reason}&rdquo;
            </p>
          )}
          {pendingRequest.requestedAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Requested {formatRelativeTime(pendingRequest.requestedAt, nowMs)}
            </p>
          )}
          {!pendingRequest.requestedDate && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              The requested time was not recorded — confirm it with your booking partner.
            </p>
          )}
        </div>
      )}

      {/* ── What's next ── */}
      {!offPath && (
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-2xl border border-border bg-muted/40 p-3.5',
            compact && 'p-3'
          )}
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">
              What&rsquo;s next? <span className="font-semibold text-accent-text">{next.title}</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{next.body}</p>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <details className="group rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            History ({history.length})
            <span className="ml-auto text-[10px] font-medium normal-case tracking-normal text-subtle-foreground group-open:hidden">
              Show
            </span>
          </summary>
          <ol className="mt-3 space-y-2.5">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex gap-3 text-xs">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-sunburst"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {entry.label}
                    <span className="font-normal text-muted-foreground"> · {entry.who}</span>
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {formatDateTime(entry.at)}
                  </p>
                  {entry.note && (
                    <p className="mt-0.5 leading-relaxed text-foreground/80">
                      &ldquo;{entry.note}&rdquo;
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* The tracker is not a replacement for the clock: the caller already
          shows "updated 4m ago", but the empty state of a fresh request still
          deserves one honest line. */}
      {!compact && !appointment.created_at && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Creation time was not recorded for this booking.
        </p>
      )}
    </div>
  );
}

export default BookingTracker;
