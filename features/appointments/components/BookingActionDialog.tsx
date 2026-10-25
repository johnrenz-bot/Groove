'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import type { BookingDetail } from '../services/bookingService';
import {
  formatBookingDate,
  formatClock,
  formatRelativeTime,
  parseBookingStart,
} from '../services/bookingTime';
import { parseRescheduleRequest } from '../services/rescheduleRequest';
import { Button } from '@/components/ui/Button';
import { Modal, ModalIconTile } from '@/components/ui/Modal';

export type BookingDialogMode =
  | 'cancel'
  | 'decline'
  | 'complete'
  | 'approve-reschedule'
  | 'dismiss-reschedule';

const COPY: Record<
  BookingDialogMode,
  {
    title: string;
    confirm: string;
    tone: 'danger' | 'primary' | 'warning';
    description: string;
  }
> = {
  cancel: {
    title: 'Cancel this booking?',
    confirm: 'Cancel booking',
    tone: 'danger',
    description:
      'The booking moves to Cancelled for both of you, and the other party is notified. This cannot be undone from the app.',
  },
  decline: {
    title: 'Decline this request?',
    confirm: 'Decline request',
    tone: 'danger',
    description:
      'The client is told the request was declined. You can still message them about a different time.',
  },
  complete: {
    title: 'Mark this session completed?',
    confirm: 'Mark completed',
    tone: 'primary',
    description:
      'This closes the booking and moves it into both parties’ history. Only do this once the session has taken place.',
  },
  'approve-reschedule': {
    title: 'Move the session to the requested time?',
    confirm: 'Approve new time',
    tone: 'primary',
    description:
      'This updates the booking’s date and time and clears the request. No status change is written, so the tracker stays where it is.',
  },
  'dismiss-reschedule': {
    title: 'Keep the original time?',
    confirm: 'Keep original time',
    tone: 'warning',
    description:
      'The reschedule request is cleared and the booking stays at its current date and time. The client is not notified automatically, so send them a message if you want to explain.',
  },
};

/**
 * Confirmation for every booking write that changes something irreversible
 * enough to deserve one.
 *
 * The dialog stays open when `onConfirm` resolves false, and shows the page's
 * error above the buttons. That is the difference between "the database refused"
 * and "the operation succeeded": a dialog that disappears on failure reports
 * success by accident.
 */
export function BookingActionDialog({
  detail,
  mode,
  nowMs,
  busy = false,
  errorMessage,
  onClose,
  onConfirm,
}: {
  detail: BookingDetail;
  mode: BookingDialogMode;
  nowMs: number;
  busy?: boolean;
  /** The page's translated write error, shown above the buttons. */
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (reason: string | null) => Promise<boolean>;
}) {
  const copy = COPY[mode];
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useMemo(
    () =>
      mode === 'approve-reschedule'
        ? parseRescheduleRequest(
            detail.appointment.requested_changes_note,
            detail.appointment.changes_requested_at
          )
        : null,
    [detail.appointment.changes_requested_at, detail.appointment.requested_changes_note, mode]
  );

  const requestedStartAt = request?.requestedDate
    ? parseBookingStart(request.requestedDate, request.startTime)
    : null;
  const requestedEndAt = request?.requestedDate
    ? parseBookingStart(request.requestedDate, request.endTime)
    : null;
  const requestedTimeValid = Boolean(
    requestedStartAt &&
      requestedEndAt &&
      requestedEndAt.getTime() > requestedStartAt.getTime()
  );
  const requestedTimePassed = Boolean(
    requestedStartAt && requestedStartAt.getTime() <= nowMs
  );
  const canApprove = requestedTimeValid && !requestedTimePassed;
  const working = busy || pending;

  const handleConfirm = async () => {
    if (working) return;
    setPending(true);
    setError(null);
    try {
      const success = await onConfirm(reason.trim() || null);
      if (success) onClose();
      else setError('The booking was not changed. Read the message on the page and try again.');
    } finally {
      setPending(false);
    }
  };

  const Icon =
    copy.tone === 'danger' ? AlertTriangle : copy.tone === 'warning' ? XCircle : CheckCircle2;

  return (
    <Modal
      open
      onClose={working ? () => {} : onClose}
      animated
      size="sm"
      showClose={!working}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={working}>
            {mode === 'dismiss-reschedule' ? 'Go back' : 'Keep booking'}
          </Button>
          <Button
            type="button"
            variant={copy.tone === 'danger' ? 'danger' : 'primary'}
            loading={working}
            disabled={mode === 'approve-reschedule' && !canApprove}
            onClick={() => void handleConfirm()}
          >
            {working ? 'Working…' : copy.confirm}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <ModalIconTile
          icon={Icon}
          className={
            copy.tone === 'danger'
              ? 'bg-danger-soft text-danger'
              : copy.tone === 'warning'
                ? 'bg-warning-soft text-warning'
                : 'bg-accent-soft text-accent-text'
          }
        >
          {mode === 'approve-reschedule' ? (
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Icon className="h-5 w-5" aria-hidden="true" />
          )}
        </ModalIconTile>
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
            <p className="font-semibold text-foreground">
              {formatBookingDate(detail.appointment.date)} ·{' '}
              {formatClock(detail.appointment.start_time)} –{' '}
              {formatClock(detail.appointment.end_time)}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Booking #{detail.appointment.id}
            </p>
          </div>

          {mode === 'approve-reschedule' && detail.agreement && (
            <p className="mt-3 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-[11px] font-medium leading-relaxed text-warning">
              This booking already has a session agreement. Approving changes the booking
              only; the agreement&apos;s stored date and time remain as signed.
            </p>
          )}

          {mode === 'approve-reschedule' &&
            (requestedTimePassed ? (
              <p className="mt-3 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
                The requested time has already passed, so it cannot be approved. Keep the
                original time and message the client to agree a new booking.
              </p>
            ) : canApprove && request ? (
              <div className="mt-3 rounded-xl border border-accent-border bg-accent-soft px-3 py-2.5 text-xs">
                <p className="font-bold text-accent-text">Requested new time</p>
                <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                  {formatBookingDate(request.requestedDate)} ·{' '}
                  {formatClock(request.startTime)} – {formatClock(request.endTime)}
                </p>
                {request.reason && (
                  <p className="mt-1 leading-relaxed text-foreground/80">
                    &ldquo;{request.reason}&rdquo;
                  </p>
                )}
                {request.requestedAt && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Requested {formatRelativeTime(request.requestedAt, nowMs)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
                The requested time was not recorded in the note, so it cannot be approved here.
                Keep the original time and message the client to agree a new booking.
              </p>
            ))}

          {(mode === 'cancel' || mode === 'decline') && (
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Reason {mode === 'decline' ? '(optional)' : '(optional, shared with the other party)'}
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder={
                  mode === 'cancel'
                    ? 'e.g. A rehearsal moved. I will rebook for another date.'
                    : 'e.g. I am already booked at that time. Happy to suggest another slot.'
                }
                className="g-input w-full resize-none p-2.5 text-xs leading-relaxed"
                disabled={working}
              />
            </label>
          )}

          {errorMessage ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium leading-relaxed text-danger"
            >
              {errorMessage}
            </p>
          ) : error ? (
            <p role="alert" className="mt-3 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export default BookingActionDialog;
