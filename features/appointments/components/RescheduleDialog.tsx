'use client';

import React, { useMemo, useState } from 'react';
import { CalendarClock, Info } from 'lucide-react';
import type { Appointment } from '@/lib/types';
import type { BookingDetail } from '../services/bookingService';
import {
  clientBusyWindowsForDate,
  formatBookingDate,
  formatClock,
  formatDuration,
  minutesToTime,
  parseBookingStart,
  timeToMinutes,
} from '../services/bookingTime';
import { Button } from '@/components/ui/Button';
import { Modal, ModalSection, ModalCard } from '@/components/ui/Modal';

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Request a new time for an existing booking.
 */
export function RescheduleDialog({
  detail,
  ownAppointments = [],
  nowMs,
  busy = false,
  errorMessage,
  onClose,
  onSubmit,
}: {
  detail: BookingDetail;
  /** The client's other bookings, used only to catch their OWN conflicts. */
  ownAppointments?: readonly Appointment[];
  nowMs: number;
  busy?: boolean;
  /** The page's translated write error, shown above the buttons. */
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (draft: {
    requestedDate: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    reason: string;
  }) => Promise<boolean>;
}) {
  const appointment = detail.appointment;
  const bookedWindow = (() => {
    const start = timeToMinutes(appointment.start_time);
    const end = timeToMinutes(appointment.end_time);
    return start !== null && end !== null && end > start ? end - start : null;
  })();
  const defaultDuration = bookedWindow ?? appointment.duration_minutes ?? 60;

  const originalDate = appointment.date.slice(0, 10);
  const originalStart = timeToMinutes(appointment.start_time);
  const originalEnd = timeToMinutes(appointment.end_time);

  const [date, setDate] = useState(() => {
    const start = parseBookingStart(appointment.date, appointment.start_time);
    if (start && start.getTime() > nowMs) return appointment.date.slice(0, 10);
    return localDateValue(new Date(nowMs + 24 * 60 * 60 * 1000));
  });
  const [startTime, setStartTime] = useState(() => {
    const start = timeToMinutes(appointment.start_time);
    return start === null ? '09:00' : minutesToTime(start);
  });
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [endTime, setEndTime] = useState(() => {
    const start = timeToMinutes(appointment.start_time);
    if (start === null) return '10:00';
    return minutesToTime(start + defaultDuration);
  });
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const working = busy || pending;

  const conflicts = useMemo(() => {
    const others = ownAppointments.filter((item) => item.id !== appointment.id);
    return clientBusyWindowsForDate(others, date);
  }, [appointment.id, date, ownAppointments]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    const today = localDateValue(new Date(nowMs));
    if (!date) next.date = 'Choose a new date.';
    else if (date < today) next.date = 'The new date cannot be in the past.';

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (startMinutes === null) next.startTime = 'Choose a start time.';
    if (endMinutes === null) next.endTime = 'Choose an end time.';
    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      next.endTime = 'The end time must be later than the start time.';
    }

    const startAt = parseBookingStart(date, startTime);
    if (startAt && startAt.getTime() <= nowMs) {
      next.startTime = 'That time has already passed.';
    }

    if (
      date === originalDate &&
      startMinutes !== null &&
      endMinutes !== null &&
      startMinutes === originalStart &&
      endMinutes === originalEnd
    ) {
      next.time = 'Pick a different date or time from the current booking.';
    }

    if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
      const startAtValue = parseBookingStart(date, startTime);
      const endAtValue = parseBookingStart(date, endTime);
      if (
        startAtValue &&
        endAtValue &&
        conflicts.some(
          (window) =>
            startAtValue.getTime() < window.end.getTime() &&
            window.start.getTime() < endAtValue.getTime()
        )
      ) {
        next.time = 'You already have another booking in that window.';
      }
    }

    return next;
  }, [
    conflicts,
    date,
    endTime,
    nowMs,
    originalDate,
    originalEnd,
    originalStart,
    startTime,
  ]);

  const valid = Object.keys(errors).length === 0;

  const handleStartChange = (nextStart: string) => {
    setStartTime(nextStart);
    const start = timeToMinutes(nextStart);
    if (start !== null) {
      setEndTime(minutesToTime(start + durationMinutes));
    }
  };

  const handleDurationChange = (nextDuration: number) => {
    setDurationMinutes(nextDuration);
    const start = timeToMinutes(startTime);
    if (start !== null) setEndTime(minutesToTime(start + nextDuration));
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!valid || working) return;
    setPending(true);
    setError(null);
    try {
      const success = await onSubmit({
        requestedDate: date,
        startTime,
        endTime,
        durationMinutes,
        reason,
      });
      if (success) onClose();
      else setError('The request was not saved. Read the message on the page and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open
      onClose={working ? () => {} : onClose}
      animated
      size="md"
      showClose={!working}
      title="Request a new time"
      description="Your coach approves the change. The original time stands until they do."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={working}>
            Keep original time
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={working}
            disabled={!valid}
            onClick={() => void handleSubmit()}
          >
            {working ? 'Sending request…' : 'Send reschedule request'}
          </Button>
        </>
      }
    >
      <ModalSection className="space-y-4 text-xs">
        <ModalCard className="border-info/30 bg-info-soft text-info">
          <div className="flex items-start gap-2 text-[11px] leading-relaxed">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            <p>
              Current booking: <strong className="text-foreground">
                {formatBookingDate(appointment.date)} · {formatClock(appointment.start_time)} –{' '}
                {formatClock(appointment.end_time)}
              </strong>
              . This sends a request only; it does not move the session.
            </p>
          </div>
        </ModalCard>

        {detail.agreement && (
          <ModalCard className="border-warning/30 bg-warning-soft text-warning">
            <p className="text-[11px] font-medium leading-relaxed">
              This booking already has a session agreement. A new time changes the booking,
              not the agreement&apos;s stored date and time. Ask your coach whether a new
              agreement is needed.
            </p>
          </ModalCard>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
              New date *
            </span>
            <input
              type="date"
              value={date}
              min={localDateValue(new Date(nowMs))}
              onChange={(event) => setDate(event.target.value)}
              className="g-input h-10 w-full text-xs"
              aria-invalid={touched && errors.date ? 'true' : undefined}
            />
            {touched && errors.date && (
              <span className="mt-1 block text-[11px] text-danger">{errors.date}</span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
              Session length
            </span>
            <select
              value={durationMinutes}
              onChange={(event) => handleDurationChange(Number(event.target.value))}
              className="g-input h-10 w-full cursor-pointer text-xs"
            >
              {[30, 60, 90, 120, 180].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatDuration(minutes)}
                </option>
              ))}
              {![30, 60, 90, 120, 180].includes(durationMinutes) && (
                <option value={durationMinutes}>{formatDuration(durationMinutes)}</option>
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
              New start time *
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(event) => handleStartChange(event.target.value)}
              className="g-input h-10 w-full text-xs"
              aria-invalid={touched && errors.startTime ? 'true' : undefined}
            />
            {touched && errors.startTime && (
              <span className="mt-1 block text-[11px] text-danger">{errors.startTime}</span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
              New end time *
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(event) => {
                setEndTime(event.target.value);
                const start = timeToMinutes(startTime);
                const end = timeToMinutes(event.target.value);
                if (start !== null && end !== null && end > start) {
                  setDurationMinutes(end - start);
                }
              }}
              className="g-input h-10 w-full text-xs"
              aria-invalid={touched && errors.endTime ? 'true' : undefined}
            />
            {touched && errors.endTime && (
              <span className="mt-1 block text-[11px] text-danger">{errors.endTime}</span>
            )}
          </label>
        </div>

        {errors.time && (
          <ModalCard className="border-warning/30 bg-warning-soft text-warning">
            <p className="text-[11px] font-medium leading-relaxed">
              {errors.time}
            </p>
          </ModalCard>
        )}

        {conflicts.length > 0 && (
          <ModalCard className="border-warning/30 bg-warning-soft text-warning">
            <p className="flex items-center gap-1.5 font-semibold">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              Your schedule on {formatBookingDate(date)}
            </p>
            <ul className="mt-1 space-y-0.5">
              {conflicts.map((window, index) => (
                <li key={`${window.start.toISOString()}-${index}`}>
                  {window.label ?? 'Booked'} — choose a time outside this window.
                </li>
              ))}
            </ul>
          </ModalCard>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
            Reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. I have a school performance that morning. Could we move to the afternoon?"
            className="g-input w-full resize-none p-2.5 text-xs leading-relaxed"
            disabled={working}
          />
        </label>

        {touched && !valid && (
          <p role="alert" className="text-[11px] font-medium text-danger">
            Fix the highlighted fields before sending.
          </p>
        )}
        {errorMessage ? (
          <ModalCard className="border-danger/30 bg-danger-soft text-danger">
            <p className="text-[11px] font-medium leading-relaxed">
              {errorMessage}
            </p>
          </ModalCard>
        ) : error ? (
          <p role="alert" className="text-[11px] font-medium text-danger">
            {error}
          </p>
        ) : null}
      </ModalSection>
    </Modal>
  );
}

export default RescheduleDialog;
