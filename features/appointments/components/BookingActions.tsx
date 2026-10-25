'use client';

import React from 'react';
import Link from 'next/link';
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  MessageSquare,
  Star,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import type { BookingDetail } from '../services/bookingService';
import { availableActions, type BookingAction } from '../services/bookingStatus';
import { hasPendingReschedule } from '../services/rescheduleRequest';
import { isActiveStatus } from '../services/bookingTime';

export interface BookingActionsProps {
  detail: BookingDetail;
  role: 'client' | 'coach';
  busy?: boolean;
  /** Verification + suspension, mirroring the RLS actor gate. */
  canWrite: boolean;
  writeBlockedReason?: string | null;
  showReview?: boolean;
  /** `details` keeps every action; `card` is the same set with tighter labels. */
  density?: 'card' | 'details';
  className?: string;
  onAccept: (detail: BookingDetail) => void;
  onDecline: (detail: BookingDetail) => void;
  onComplete: (detail: BookingDetail) => void;
  onCancel: (detail: BookingDetail) => void;
  onReschedule: (detail: BookingDetail) => void;
  onApproveReschedule: (detail: BookingDetail) => void;
  onDismissReschedule: (detail: BookingDetail) => void;
  onReview?: (detail: BookingDetail) => void;
}

/**
 * The one action set for a booking, used by the card and the details dialog.
 *
 * `availableActions` is the authority for status/role legality and mirrors
 * `guard_booking_transition`. This component adds ONLY the verification gate
 * that the database also applies to the actor, and the reschedule request —
 * which is not a status transition at all.
 */
export function BookingActions({
  detail,
  role,
  busy = false,
  canWrite,
  writeBlockedReason,
  showReview = false,
  density = 'card',
  className,
  onAccept,
  onDecline,
  onComplete,
  onCancel,
  onReschedule,
  onApproveReschedule,
  onDismissReschedule,
  onReview,
}: BookingActionsProps) {
  const appointment = detail.appointment;
  const counterpartyId = role === 'client' ? appointment.coach_id : appointment.client_id;
  const messageLabel = role === 'client' ? 'Message Coach' : 'Message Client';

  // A request only means anything while the booking can still happen. If a
  // terminal transition left the columns behind, the closed booking must not
  // offer an "Approve new time" action.
  const requestPending =
    hasPendingReschedule(appointment) && isActiveStatus(appointment.status);

  const actions = availableActions({
    status: appointment.status,
    role,
    coachVerified: canWrite,
    suspended: !canWrite && !writeBlockedReason,
  })
    // While a reschedule request is open, the next decision is approve or keep
    // the original time. Showing Accept/Send agreement beside those controls
    // invites a coach to move the booking forward with the request unresolved.
    .filter((spec) => !requestPending || spec.action === 'cancel')
    .map((spec) => ({
      ...spec,
      blockedReason: canWrite
        ? spec.blockedReason ?? null
        : writeBlockedReason ?? spec.blockedReason ?? null,
    }));

  const canRequestReschedule =
    role === 'client' && isActiveStatus(appointment.status) && !requestPending;

  const iconFor = (action: BookingAction) => {
    if (action === 'accept') return <Check className="h-3.5 w-3.5" />;
    if (action === 'decline') return <X className="h-3.5 w-3.5" />;
    if (action === 'complete') return <CheckCircle2 className="h-3.5 w-3.5" />;
    return <Ban className="h-3.5 w-3.5" />;
  };

  const run = (action: BookingAction) => {
    if (action === 'accept') onAccept(detail);
    else if (action === 'decline') onDecline(detail);
    else if (action === 'complete') onComplete(detail);
    else onCancel(detail);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2',
        density === 'details' && 'gap-2.5',
        className
      )}
    >
      <Link
        href={`/messages?user=${counterpartyId}`}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageSquare className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
        {messageLabel}
      </Link>

      {role === 'coach' && requestPending && (
        <>
          <Button
            type="button"
            size="sm"
            icon={<CalendarCheck className="h-3.5 w-3.5" />}
            disabled={busy || !canWrite}
            title={canWrite ? undefined : writeBlockedReason ?? undefined}
            onClick={() => onApproveReschedule(detail)}
          >
            Approve new time
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon={<Undo2 className="h-3.5 w-3.5" />}
            disabled={busy || !canWrite}
            title={canWrite ? undefined : writeBlockedReason ?? undefined}
            onClick={() => onDismissReschedule(detail)}
          >
            Keep original time
          </Button>
        </>
      )}

      {showReview && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          icon={<Star className="h-3.5 w-3.5" />}
          disabled={busy}
          onClick={() => onReview?.(detail)}
        >
          Leave Review
        </Button>
      )}

      {canRequestReschedule && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          disabled={busy || !canWrite}
          title={canWrite ? undefined : writeBlockedReason ?? undefined}
          onClick={() => onReschedule(detail)}
        >
          Reschedule
        </Button>
      )}

      {actions.map((spec) => (
        <Button
          key={spec.action}
          type="button"
          size="sm"
          variant={spec.variant === 'danger' ? 'outline' : 'primary'}
          icon={iconFor(spec.action)}
          disabled={busy || Boolean(spec.blockedReason)}
          title={spec.blockedReason ?? undefined}
          onClick={() => run(spec.action)}
          className={
            spec.variant === 'danger'
              ? 'border-danger/30 text-danger hover:border-danger/50 hover:bg-danger-soft hover:text-danger'
              : undefined
          }
        >
          {spec.label}
        </Button>
      ))}
    </div>
  );
}

export default BookingActions;
