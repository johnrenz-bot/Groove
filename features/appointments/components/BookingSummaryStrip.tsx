'use client';

/**
 * The overview strip above the appointments list.
 *
 * Every tile is derived from the same `BookingDetail[]` the cards render, so a
 * realtime status change moves the count and the card in the same render. It
 * is ACTIONABLE: each tile filters the list to the tab whose count it shows.
 *
 * DEFINITIONS (shared with the tab model in bookingTime.ts)
 *   Open (client) / Requests waiting (coach) = pending or awaiting signature,
 *     with a future slot. Past ones are expired, never open.
 *   Active = confirmed or in progress, with a future slot.
 *   Next session = earliest accepted-or-later booking with a future start.
 *   Completed = sessions in your history.
 *   Coach Today = every non-terminal session dated for the Manila today.
 *   Coach This week = confirmed or in-progress sessions in the Manila week.
 */
import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, Sparkles, Sun, CalendarRange } from 'lucide-react';
import type { BookingDetail } from '../services/bookingService';
import {
  formatBookingDate,
  formatClock,
  getBookingCountdown,
  summarizeBookings,
  summarizeCoachSchedule,
} from '../services/bookingTime';
import { StatCard } from '@/components/ui/StatCard';

export type SummaryFilter = 'upcoming' | 'awaiting' | 'past' | 'requests' | 'today';

export function BookingSummaryStrip({
  details,
  role,
  nowMs,
  onFilter,
  activeTab,
}: {
  details: readonly BookingDetail[];
  role: 'client' | 'coach';
  nowMs: number;
  /** Called when a tile is clicked — the page sets its tab to match. */
  onFilter?: (filter: SummaryFilter) => void;
  /** Currently applied tab, for aria-pressed. */
  activeTab?: string;
}) {
  const summary = summarizeBookings(details, role, nowMs);
  const next = summary.next?.appointment;
  const countdown = next
    ? getBookingCountdown(next.status, next.date, next.start_time, nowMs)
    : null;
  const coachStats = summarizeCoachSchedule(details, nowMs);

  const tile = (
    filter: SummaryFilter,
    node: React.ReactNode,
    label: string
  ) => (
    <button
      key={filter}
      type="button"
      onClick={() => onFilter?.(filter)}
      disabled={!onFilter}
      aria-pressed={activeTab === filter}
      aria-label={`${label}. Show these bookings`}
      className="rounded-2xl text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
    >
      {node}
    </button>
  );

  if (role === 'coach') {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tile(
          'requests',
          <StatCard
            icon={<CalendarDays className="h-5 w-5" />}
            value={coachStats.requestsWaiting}
            label="Requests waiting"
            sub={coachStats.requestsWaiting === 0 ? 'You are all caught up' : 'Answer these first'}
            accentColor="yellow"
          />,
          'Requests waiting'
        )}
        {tile(
          'today',
          <StatCard
            icon={<Sun className="h-5 w-5" />}
            value={coachStats.todayCount}
            label="Today"
            sub="Sessions dated today (PHT)"
            accentColor="blue"
          />,
          'Today'
        )}
        {tile(
          'upcoming',
          <StatCard
            icon={<CalendarRange className="h-5 w-5" />}
            value={coachStats.thisWeek}
            label="This week"
            sub="Confirmed or in progress (PHT)"
            accentColor="green"
          />,
          'This week'
        )}
        {tile(
          'past',
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            value={coachStats.completed}
            label="Completed"
            sub="Sessions in your history"
            accentColor="neutral"
          />,
          'Completed'
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tile(
        'upcoming',
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
        />,
        'Next session'
      )}
      {tile(
        'awaiting',
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          value={summary.needsAction}
          label="Open bookings"
          sub={summary.needsAction === 0 ? 'You are all caught up' : 'Reply or sign to move these'}
          accentColor="blue"
        />,
        'Open bookings'
      )}
      {tile(
        'upcoming',
        <StatCard
          icon={<Clock3 className="h-5 w-5" />}
          value={summary.active}
          label="Active bookings"
          sub="Confirmed or in progress"
          accentColor="green"
        />,
        'Active bookings'
      )}
      {tile(
        'past',
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          value={summary.completed}
          label="Completed"
          sub="Sessions in your history"
          accentColor="neutral"
        />,
        'Completed'
      )}
    </div>
  );
}

export default BookingSummaryStrip;

