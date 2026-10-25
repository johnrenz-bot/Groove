'use client';

import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import type { BookingDetail } from '../services/bookingService';
import {
  formatBookingDate,
  formatClock,
  getBookingCountdown,
  summarizeBookings,
} from '../services/bookingTime';
import { StatCard } from '@/components/ui/StatCard';

/**
 * A three-number overview above the list.
 *
 * Every tile is derived from the same `BookingDetail[]` the cards render, so a
 * realtime status change moves the count and the card in the same render. There
 * is no separate metrics query to drift out of date.
 */
export function BookingSummaryStrip({
  details,
  role,
  nowMs,
}: {
  details: readonly BookingDetail[];
  role: 'client' | 'coach';
  nowMs: number;
}) {
  const summary = summarizeBookings(details, role, nowMs);
  const next = summary.next?.appointment;
  const countdown = next
    ? getBookingCountdown(next.status, next.date, next.start_time, nowMs)
    : null;

  const actionLabel =
    role === 'coach' ? 'Requests needing a reply' : 'Open bookings';

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<CalendarDays className="h-5 w-5" />}
        value={next ? formatBookingDate(next.date) : '—'}
        label="Next session"
        sub={
          next
            ? `${formatClock(next.start_time)} · ${countdown?.text ?? 'Scheduled'}`
            : 'Nothing booked ahead'
        }
        accentColor="yellow"
      />
      <StatCard
        icon={<Sparkles className="h-5 w-5" />}
        value={summary.needsAction}
        label={actionLabel}
        sub={
          summary.needsAction === 0
            ? 'You are all caught up'
            : role === 'coach'
              ? 'Accept, decline or sign'
              : 'Sign or wait for a reply'
        }
        accentColor="blue"
      />
      <StatCard
        icon={<Clock3 className="h-5 w-5" />}
        value={summary.active}
        label="Active bookings"
        sub="Pending through confirmed"
        accentColor="green"
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        value={summary.completed}
        label="Completed"
        sub="Sessions in your history"
        accentColor="neutral"
      />
    </div>
  );
}

export default BookingSummaryStrip;
