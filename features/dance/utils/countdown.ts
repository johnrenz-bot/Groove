'use client';

import { differenceInCalendarDays, differenceInWeeks, differenceInMonths } from 'date-fns';

/**
 * Countdown label for an upcoming event.
 *
 * Rules (Asia/Manila calendar days):
 * - Today          -> "Today"
 * - 1 day ahead    -> "Tomorrow"
 * - 2–60 days      -> "In N days"
 * - 61–365 days    -> "In N weeks" (rounded)
 * - > 365 days     -> "In N months" (rounded)
 * - Past events    -> null (caller decides what to show, e.g. "Concluded")
 *
 * The function is pure and timezone-aware: it constructs "now" in
 * Asia/Manila so the label matches the venue-local day the reader sees
 * on the card. This avoids the classic "server says tomorrow, Manila says
 * today" mismatch.
 */
export function getCountdownLabel(eventDateIso: string | null | undefined): string | null {
  if (!eventDateIso) return null;

  const eventDate = new Date(eventDateIso);
  if (Number.isNaN(eventDate.getTime())) return null;

  // "Now" in Asia/Manila — the page's reference timezone.
  const now = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  );

  // Calendar-day difference in Manila time.
  const days = differenceInCalendarDays(eventDate, now);

  if (days < 0) return null; // past
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 60) return `In ${days} day${days === 1 ? '' : 's'}`;

  const weeks = differenceInWeeks(eventDate, now);
  if (weeks <= 52) return `In ${weeks} week${weeks === 1 ? '' : 's'}`;

  const months = differenceInMonths(eventDate, now);
  return `In ${months} month${months === 1 ? '' : 's'}`;
}

/**
 * Returns true if the event date is in the past (calendar day before today in Manila).
 */
export function isEventPast(eventDateIso: string | null | undefined): boolean {
  if (!eventDateIso) return false;
  const eventDate = new Date(eventDateIso);
  if (Number.isNaN(eventDate.getTime())) return false;

  const now = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  );

  return differenceInCalendarDays(eventDate, now) < 0;
}

/**
 * Returns true if the event is today (calendar day in Manila).
 */
export function isEventToday(eventDateIso: string | null | undefined): boolean {
  if (!eventDateIso) return false;
  const eventDate = new Date(eventDateIso);
  if (Number.isNaN(eventDate.getTime())) return false;

  const now = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  );

  return differenceInCalendarDays(eventDate, now) === 0;
}