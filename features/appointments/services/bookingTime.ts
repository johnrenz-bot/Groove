/**
 * Time and ordering helpers for the appointment surfaces.
 *
 * Every function here is PURE: it takes the timestamp it should reason about
 * (`nowMs`) instead of reading `Date.now()`. That matters for two reasons.
 *
 *   1. A countdown that calls Date.now() while rendering produces a different
 *      string on the server and the client, which is a hydration mismatch on any
 *      booking that is already on screen at first paint.
 *   2. A pure function can be checked without a browser. The assertions live in
 *      `scripts/test-booking-time.ts`, beside the state-machine checks.
 *
 * NOTHING HERE INVENTS AVAILABILITY. The slot builder only knows about the
 * caller's OWN bookings, because row-level security lets a client read their own
 * appointments and not a coach's other clients' appointments. A slot is marked
 * unavailable only when the data actually proves a conflict.
 */

import type { Appointment } from '@/lib/types';

/** Statuses that still describe a session that can happen. */
export const ACTIVE_BOOKING_STATUSES = [
  'pending',
  'accepted',
  'agreement_required',
  'confirmed',
] as const;

export function isActiveStatus(status: string | null | undefined): boolean {
  return Boolean(status) && (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status as string);
}

/** Statuses that occupy a time slot on the client's own calendar. */
const OCCUPYING_STATUSES = ['accepted', 'agreement_required', 'confirmed'] as const;

export function isOccupyingStatus(status: string | null | undefined): boolean {
  return Boolean(status) && (OCCUPYING_STATUSES as readonly string[]).includes(status as string);
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

const HHMM_RE = /^\s*(\d{1,2}):(\d{2})/;

export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = HHMM_RE.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const safe = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * A booking's start as a local Date.
 *
 * `date` is a Postgres DATE, so it arrives as `YYYY-MM-DD`; `start_time` is the
 * app's free-text `HH:MM`. Either can be malformed in an old row, so both are
 * validated and null is returned rather than an Invalid Date.
 */
export function parseBookingStart(
  date: string | null | undefined,
  startTime: string | null | undefined
): Date | null {
  if (!date) return null;
  const day = date.slice(0, 10);
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const startMinutes = timeToMinutes(startTime);
  if (!year || !month || !dayOfMonth || startMinutes === null) return null;

  const parsed = new Date(
    year,
    month - 1,
    dayOfMonth,
    Math.floor(startMinutes / 60),
    startMinutes % 60,
    0,
    0
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseBookingEnd(
  date: string | null | undefined,
  endTime: string | null | undefined
): Date | null {
  if (!date) return null;
  const day = date.slice(0, 10);
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const endMinutes = timeToMinutes(endTime);
  if (!year || !month || !dayOfMonth || endMinutes === null) return null;

  const parsed = new Date(year, month - 1, dayOfMonth, Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `14:05` -> `2:05 PM`, falling back to the stored text. */
export function formatClock(value: string | null | undefined): string {
  const minutes = timeToMinutes(value);
  if (minutes === null) return value ?? '';
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatBookingDate(date: string | null | undefined): string {
  if (!date) return 'Date to be confirmed';
  const parsed = parseBookingStart(date, '00:00');
  if (!parsed) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: parsed.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

/* -------------------------------------------------------------------------- */
/* Countdowns and relative labels                                              */
/* -------------------------------------------------------------------------- */

export type CountdownTone = 'urgent' | 'soon' | 'normal' | 'past';

export interface BookingCountdown {
  text: string;
  tone: CountdownTone;
  startsAt: Date;
}

/**
 * A relative countdown for a live booking.
 *
 * Returns null for finished/cancelled bookings: "Starts in 3 days" under a
 * completed session is worse than showing nothing. A booking whose start has
 * passed but which has not been completed is described exactly that way — the
 * UI must not pretend the session is imminent, nor announce it happened.
 */
export function getBookingCountdown(
  status: string | null | undefined,
  date: string | null | undefined,
  startTime: string | null | undefined,
  nowMs: number
): BookingCountdown | null {
  if (!isActiveStatus(status)) return null;
  const startsAt = parseBookingStart(date, startTime);
  if (!startsAt) return null;

  const diffMs = startsAt.getTime() - nowMs;
  if (diffMs <= 0) {
    return { text: 'Scheduled time has passed', tone: 'past', startsAt };
  }

  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) {
    return { text: `Starts in ${totalMinutes} min`, tone: 'urgent', startsAt };
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const leftoverMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return {
      text: `Starts in ${totalHours}h${leftoverMinutes ? ` ${leftoverMinutes}m` : ''}`,
      tone: totalHours <= 2 ? 'urgent' : 'soon',
      startsAt,
    };
  }

  const days = Math.floor(totalHours / 24);
  const leftoverHours = totalHours % 24;
  if (days < 7) {
    return {
      text: `Starts in ${days}d${leftoverHours ? ` ${leftoverHours}h` : ''}`,
      tone: 'normal',
      startsAt,
    };
  }

  return {
    text: `Starts ${startsAt.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })}`,
    tone: 'normal',
    startsAt,
  };
}

/** "5m ago", "2d ago" — measured against the caller's clock, not Date.now(). */
export function formatRelativeTime(
  iso: string | null | undefined,
  nowMs: number
): string {
  if (!iso) return '';
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '';
  const seconds = Math.floor((nowMs - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* -------------------------------------------------------------------------- */
/* Duration                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_DURATION_MINUTES = 60;

/**
 * `coach_profiles.duration` is a short label from a controlled list
 * ('1 hour', '1.5 hours', '2 hours', '3 hours'), but old rows may hold anything.
 * Parsing it is better than ignoring a coach's published session length.
 */
export function parseDurationMinutes(duration: string | null | undefined): number {
  if (!duration) return DEFAULT_DURATION_MINUTES;
  const numeric = Number.parseFloat(duration);
  if (Number.isNaN(numeric) || numeric <= 0) return DEFAULT_DURATION_MINUTES;

  if (/hour|hr|\bh\b/i.test(duration)) {
    return Math.round(numeric * 60);
  }
  if (/min/i.test(duration)) {
    return Math.round(numeric);
  }
  // A bare "2" is ambiguous; the profile stores hours, so read it as hours.
  if (/^\s*\d+(\.\d+)?\s*$/.test(duration)) {
    return Math.round(numeric * 60);
  }
  return DEFAULT_DURATION_MINUTES;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${remainder} min`;
}

/* -------------------------------------------------------------------------- */
/* Slot building                                                               */
/* -------------------------------------------------------------------------- */

export interface BookedWindow {
  start: Date;
  end: Date;
  label?: string;
}

/** Why a start time cannot be chosen. `available` is the only selectable kind. */
export type TimeSlotKind = 'available' | 'past' | 'notice' | 'conflict';

export interface TimeSlot {
  /** HH:MM in 24-hour form, the value written to `start_time`. */
  start: string;
  end: string;
  disabled: boolean;
  /** Shown as the chip's title when disabled, and beside the summary. */
  reason: string | null;
  /** Lets the schedule UI distinguish past / notice / own-booking states. */
  kind: TimeSlotKind;
}

export const DEFAULT_OPENING_MINUTES = 8 * 60;
export const DEFAULT_CLOSING_MINUTES = 20 * 60;
export const SLOT_STEP_MINUTES = 30;

/**
 * Build selectable start times for one day.
 *
 * A slot is disabled when:
 *   - it starts before the coach's published notice window,
 *   - it has already passed, or
 *   - it overlaps one of the CLIENT'S OWN active bookings.
 *
 * The last rule is the only "occupied" rule the frontend can prove. A client
 * cannot read a coach's other appointments under the SELECT policy, so we do not
 * colour a slot "coach busy" and we never claim a time is free.
 */
export function buildTimeSlots(args: {
  date: string;
  durationMinutes: number;
  nowMs: number;
  /** Epoch ms before which a session cannot start (notice period). */
  earliestMs?: number;
  /** The viewer's own booked windows on this date. */
  busy?: readonly BookedWindow[];
  openMinutes?: number;
  closeMinutes?: number;
  stepMinutes?: number;
}): TimeSlot[] {
  const {
    date,
    durationMinutes,
    nowMs,
    earliestMs = 0,
    busy = [],
    openMinutes = DEFAULT_OPENING_MINUTES,
    closeMinutes = DEFAULT_CLOSING_MINUTES,
    stepMinutes = SLOT_STEP_MINUTES,
  } = args;

  const duration = Math.max(15, Math.round(durationMinutes));
  const slots: TimeSlot[] = [];

  for (let start = openMinutes; start + duration <= closeMinutes; start += stepMinutes) {
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(start + duration);
    const startAt = parseBookingStart(date, startTime);
    const endAt = parseBookingStart(date, endTime);
    if (!startAt || !endAt) continue;

    let kind: TimeSlotKind = 'available';
    let reason: string | null = null;
    if (startAt.getTime() <= nowMs) {
      kind = 'past';
      reason = 'This time has already passed.';
    } else if (startAt.getTime() < earliestMs) {
      kind = 'notice';
      reason = "This is inside the coach's notice period.";
    } else {
      const conflict = busy.find((window) => overlaps(startAt, endAt, window.start, window.end));
      if (conflict) {
        kind = 'conflict';
        reason = conflict.label
          ? `You already have a booking at this time (${conflict.label}).`
          : 'You already have a booking at this time.';
      }
    }

    slots.push({
      start: startTime,
      end: endTime,
      disabled: kind !== 'available',
      reason,
      kind,
    });
  }

  return slots;
}

/**
 * The state of a whole day, for the calendar grid.
 *
 * A day is only `available` when at least one start time survives the same
 * rules as `buildTimeSlots`. When none do, the reason is narrowed to the one the
 * calendar can honestly explain:
 *
 *   past        the last possible start has already gone by
 *   notice      the last possible start is still inside the notice window
 *   unavailable every start is taken by the client's own active/pending booking
 *               (or the published duration cannot fit in the day)
 *
 * This is a UI classification only. It never turns a request into a confirmed
 * session — the coach still confirms the final slot.
 */
export type DayAvailability = 'available' | 'past' | 'notice' | 'unavailable';

export function dayAvailability(args: {
  date: string;
  durationMinutes: number;
  nowMs: number;
  earliestMs?: number;
  busy?: readonly BookedWindow[];
  openMinutes?: number;
  closeMinutes?: number;
}): DayAvailability {
  const {
    date,
    durationMinutes,
    nowMs,
    earliestMs = 0,
    busy = [],
    openMinutes = DEFAULT_OPENING_MINUTES,
    closeMinutes = DEFAULT_CLOSING_MINUTES,
  } = args;

  const slots = buildTimeSlots({
    date,
    durationMinutes,
    nowMs,
    earliestMs,
    busy,
    openMinutes,
    closeMinutes,
  });

  if (slots.some((slot) => !slot.disabled)) return 'available';

  // Classify against the latest start the grid actually offered, not an
  // arithmetic guess: a duration that is not a multiple of the 30-minute step
  // can leave the last grid start inside the opening hours but after the
  // calculated cut-off.
  if (slots.length > 0) {
    const lastStart = parseBookingStart(date, slots[slots.length - 1].start);
    if (lastStart) {
      if (lastStart.getTime() <= nowMs) return 'past';
      if (lastStart.getTime() < earliestMs) return 'notice';
      return 'unavailable';
    }
  }

  // No start fits the published day at all.
  return 'unavailable';
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** The viewer's own active bookings on a date, ready for `buildTimeSlots`. */
export function bookedWindowsForDate(
  appointments: readonly Pick<
    Appointment,
    'date' | 'start_time' | 'end_time' | 'status' | 'id'
  >[],
  date: string
): BookedWindow[] {
  const day = date.slice(0, 10);
  const windows: Array<BookedWindow | null> = appointments
    .filter((appointment) => appointment.date?.slice(0, 10) === day)
    .filter((appointment) => isOccupyingStatus(appointment.status))
    .map((appointment) => {
      const start = parseBookingStart(appointment.date, appointment.start_time);
      const end = parseBookingEnd(appointment.date, appointment.end_time);
      if (!start || !end) return null;
      return {
        start,
        end,
        label: `${formatClock(appointment.start_time)} – ${formatClock(appointment.end_time)}`,
      };
    });
  return windows.filter((window): window is BookedWindow => window !== null);
}

/**
 * What should block a NEW request from this client: their occupying bookings
 * AND their pending requests.
 *
 * A pending row does not occupy the coach's calendar — it may be declined — so
 * it is deliberately excluded from `bookedWindowsForDate` and from the coach's
 * "week ahead" view. It is still a risk for the client: two coaches can accept
 * overlapping pending requests. This helper is only for the client's own booking
 * form, where double-requesting the same slot is the thing to prevent.
 */
export function clientBusyWindowsForDate(
  appointments: readonly Pick<
    Appointment,
    'date' | 'start_time' | 'end_time' | 'status' | 'id'
  >[],
  date: string
): BookedWindow[] {
  const day = date.slice(0, 10);
  const pending: Array<BookedWindow | null> = appointments
    .filter((appointment) => appointment.date?.slice(0, 10) === day)
    .filter((appointment) => appointment.status === 'pending')
    .map((appointment) => {
      const start = parseBookingStart(appointment.date, appointment.start_time);
      const end = parseBookingEnd(appointment.date, appointment.end_time);
      if (!start || !end) return null;
      return {
        start,
        end,
        label: `${formatClock(appointment.start_time)} – ${formatClock(appointment.end_time)}`,
      };
    });
  return [
    ...bookedWindowsForDate(appointments, date),
    ...pending.filter((window): window is BookedWindow => window !== null),
  ];
}

/* -------------------------------------------------------------------------- */
/* Ordering and summary                                                        */
/* -------------------------------------------------------------------------- */

type BookingLike = {
  appointment: Pick<
    Appointment,
    'status' | 'date' | 'start_time' | 'updated_at' | 'created_at'
  >;
};

/**
 * The card order the two dashboards share.
 *
 * Anything that still needs a decision comes first — a coach's pending request,
 * or a client's agreement waiting on their signature. Within that band the
 * soonest session wins. Finished bookings fall to the bottom, newest first, so
 * history stays available without pushing live work off the screen.
 */
export function sortBookings<T extends BookingLike>(
  items: readonly T[],
  role: 'client' | 'coach',
  nowMs: number
): T[] {
  const priority: Record<string, number> =
    role === 'coach'
      ? {
          pending: 0,
          accepted: 1,
          agreement_required: 2,
          confirmed: 3,
          completed: 4,
          declined: 5,
          cancelled: 6,
        }
      : {
          agreement_required: 0,
          pending: 1,
          accepted: 2,
          confirmed: 3,
          completed: 4,
          declined: 5,
          cancelled: 6,
        };

  const rank = (status: string | null | undefined) =>
    status && status in priority ? priority[status] : 9;

  return [...items].sort((left, right) => {
    const rankDelta = rank(left.appointment.status) - rank(right.appointment.status);
    if (rankDelta !== 0) return rankDelta;

    const leftStart = parseBookingStart(left.appointment.date, left.appointment.start_time);
    const rightStart = parseBookingStart(right.appointment.date, right.appointment.start_time);
    const leftLive = isActiveStatus(left.appointment.status) && leftStart
      ? leftStart.getTime() > nowMs
      : false;
    const rightLive = isActiveStatus(right.appointment.status) && rightStart
      ? rightStart.getTime() > nowMs
      : false;

    if (leftLive && rightLive && leftStart && rightStart) {
      return leftStart.getTime() - rightStart.getTime();
    }
    if (leftLive !== rightLive) return leftLive ? -1 : 1;

    const leftUpdated = new Date(
      left.appointment.updated_at ?? left.appointment.created_at
    ).getTime();
    const rightUpdated = new Date(
      right.appointment.updated_at ?? right.appointment.created_at
    ).getTime();
    return rightUpdated - leftUpdated;
  });
}

export interface BookingSummary<T extends BookingLike> {
  total: number;
  active: number;
  completed: number;
  /** Role-aware count of bookings that genuinely need this viewer. */
  needsAction: number;
  /** The next session that is accepted or later, if one exists. */
  next: T | null;
}

export function summarizeBookings<T extends BookingLike>(
  items: readonly T[],
  role: 'client' | 'coach',
  nowMs: number
): BookingSummary<T> {
  let active = 0;
  let completed = 0;
  let needsAction = 0;
  let next: T | null = null;
  let nextAt = Number.POSITIVE_INFINITY;

  for (const item of items) {
    const status = item.appointment.status;
    if (isActiveStatus(status)) active++;
    if (status === 'completed') completed++;

    if (role === 'coach') {
      if (status === 'pending' || status === 'accepted' || status === 'agreement_required') {
        needsAction++;
      }
    } else if (status === 'agreement_required' || status === 'pending') {
      needsAction++;
    }

    if (status !== 'accepted' && status !== 'agreement_required' && status !== 'confirmed') {
      continue;
    }
    const start = parseBookingStart(item.appointment.date, item.appointment.start_time);
    if (!start || start.getTime() <= nowMs) continue;
    if (start.getTime() < nextAt) {
      nextAt = start.getTime();
      next = item;
    }
  }

  return { total: items.length, active, completed, needsAction, next };
}

/* -------------------------------------------------------------------------- */
/* Profile helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Build the client's saved service address from the columns the profile has. */
export function composeProfileAddress(profile: {
  street?: string | null;
  barangay_name?: string | null;
  city_name?: string | null;
  province_name?: string | null;
  address_summary?: string | null;
} | null | undefined): string {
  if (!profile) return '';
  const parts = [
    profile.street,
    profile.barangay_name,
    profile.city_name,
    profile.province_name,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (parts.length > 0) {
    const unique = parts.filter((part, index) => parts.indexOf(part) === index);
    return unique.join(', ');
  }
  return profile.address_summary?.trim() ?? '';
}

/** The coach's published service area, using only real profile columns. */
export function composeCoachLocation(coach: {
  city_name?: string | null;
  province_name?: string | null;
  address_summary?: string | null;
} | null | undefined): string {
  if (!coach) return '';
  const city = coach.city_name?.trim();
  const province = coach.province_name?.trim();
  if (city && province && city !== province) return `${city}, ${province}`;
  if (city) return city;
  if (province) return province;
  return coach.address_summary?.trim() ?? '';
}
