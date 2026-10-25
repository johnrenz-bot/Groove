'use client';

import React from 'react';
import { CalendarDays, Clock, CreditCard, Timer, Wallet } from 'lucide-react';
import type { FullCoach } from '@/lib/types';
import type { BookingDetail } from '../services/bookingService';
import {
  bookedWindowsForDate,
  formatDuration,
  parseDurationMinutes,
} from '../services/bookingTime';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/components/shared/cn';

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clockFromDate(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * A coach's booking rules and the next seven days of ALREADY BOOKED sessions.
 *
 * WHAT THIS IS NOT
 *   It is not a public availability grid. There is no availability table and no
 *   availability RPC in the schema, so the app has nothing to publish or edit.
 *   The only truthful availability signal it can show is the inverse of the
 *   coach's own calendar: sessions that already occupy a slot.
 *
 * Keeping the heading as "Scheduled" rather than "Unavailable" is deliberate.
 * A day with no sessions is not a promise that every time is open; the coach may
 * still decline a request. The footnote says so.
 */
export function CoachAvailabilitySnapshot({
  coach,
  appointments,
  nowMs,
  className,
}: {
  coach: FullCoach;
  appointments: readonly BookingDetail[];
  nowMs: number;
  className?: string;
}) {
  const coachProfile = coach.coach_profile;
  const durationPublished = Boolean(coachProfile?.duration);
  const duration = parseDurationMinutes(coachProfile?.duration);
  const rate = coachProfile?.service_fee;
  const notice =
    coachProfile?.notice_days || coachProfile?.notice_hours
      ? [
          coachProfile.notice_days
            ? `${coachProfile.notice_days} day${coachProfile.notice_days === 1 ? '' : 's'}`
            : '',
          coachProfile.notice_hours
            ? `${coachProfile.notice_hours} hour${coachProfile.notice_hours === 1 ? '' : 's'}`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      : 'None published';
  const payment =
    coachProfile?.payment_type === 'online'
      ? `Online${coachProfile.payment_handle ? ` · ${coachProfile.payment_handle}` : ''}`
      : coachProfile?.payment_type === 'cash'
        ? 'Cash on session'
        : 'Not published';

  const today = new Date(nowMs);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
    const value = localDateValue(date);
    const windows = bookedWindowsForDate(
      appointments.map((detail) => detail.appointment),
      value
    ).sort((left, right) => left.start.getTime() - right.start.getTime());
    return { date, value, windows };
  });

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[20px] border border-border bg-card',
        className
      )}
      aria-label="Coach availability snapshot"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider px-5 py-3.5">
        <div>
          <h2 className="text-sm font-bold text-foreground">Booking rules &amp; week ahead</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Read from your coach profile and the sessions already on your calendar.
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Read-only
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        <div className="bg-card p-3.5">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <Wallet className="h-3 w-3 text-accent-text" aria-hidden="true" />
            Standard rate
          </p>
          <p className="mt-1 text-sm font-bold text-accent-text">
            {rate == null ? 'Not set' : formatCurrency(rate)}
          </p>
        </div>
        <div className="bg-card p-3.5">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <Timer className="h-3 w-3 text-accent-text" aria-hidden="true" />
            Session length
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {durationPublished ? formatDuration(duration) : 'Not published'}
          </p>
        </div>
        <div className="bg-card p-3.5">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <Clock className="h-3 w-3 text-accent-text" aria-hidden="true" />
            Notice period
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">{notice}</p>
        </div>
        <div className="bg-card p-3.5">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <CreditCard className="h-3 w-3 text-accent-text" aria-hidden="true" />
            Payment
          </p>
          <p className="mt-1 truncate text-sm font-bold text-foreground" title={payment}>
            {payment}
          </p>
        </div>
      </div>

      <div className="border-t border-divider p-3.5">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
          Next 7 days — sessions already booked
        </p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {days.map((day) => (
            <li
              key={day.value}
              className={cn(
                'rounded-xl border px-2.5 py-2',
                day.windows.length > 0
                  ? 'border-accent-border bg-accent-soft/60'
                  : 'border-border bg-muted/30'
              )}
            >
              <p className="text-[11px] font-bold text-foreground">
                {day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {day.windows.length > 0 ? (
                <p className="mt-0.5 text-[10px] leading-relaxed text-accent-text">
                  {day.windows.length} session{day.windows.length === 1 ? '' : 's'} ·{' '}
                  {day.windows
                    .map((window) => `${clockFromDate(window.start)}–${clockFromDate(window.end)}`)
                    .join(', ')}
                </p>
              ) : (
                <p className="mt-0.5 text-[10px] text-muted-foreground">No sessions booked</p>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-relaxed text-subtle-foreground">
          A day with no sessions is not a promise that every time is open. GroovePH does not store
          recurring availability, so requests are still confirmed one by one.
        </p>
      </div>
    </section>
  );
}

export default CoachAvailabilitySnapshot;
