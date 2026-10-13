/**
 * Normalises an `Appointment` into the shape the calendar renders.
 *
 * The client and coach calendars read different joins of the same table — the
 * client gets `coach`, the coach gets `client` — and each page also has its own
 * "message this person" link. Rather than branch inside every view component,
 * each page maps its rows once through `toCalendarEntry` and the views consume
 * one role-agnostic shape.
 *
 * This module performs NO fetching and NO writes. It is a pure projection of
 * data the pages already hold.
 */
import type { Appointment, AppointmentStatus, Profile } from '@/lib/types';
import type { BadgeVariant } from '@/components/ui/Badge';
import { durationLabel, formatTimeLabel, minutesFromTimeString, toDateKey } from './dateUtils';

export interface CalendarEntry {
  id: number;
  /** Calendar day, 'YYYY-MM-DD'. */
  date: string;
  /** Minutes past midnight, or null when the column is absent/malformed. */
  startMinutes: number | null;
  endMinutes: number | null;
  /** '09:00 AM – 10:30 AM', pre-formatted for the list views. */
  timeLabel: string;
  /** '1h 30m', or null when it cannot be derived. */
  duration: string | null;
  status: AppointmentStatus;
  /** Counterpart name, already prefixed for the role ("Coach …" / "Student …"). */
  counterpartLabel: string;
  /** Session type, when the appointment records one. */
  sessionType: string | null;
  location: string | null;
  isOnline: boolean;
  /** Where to message the counterpart, relative to this portal. */
  messageHref: string | null;
  /** The untouched row, for callers that need a field this projection omits. */
  appointment: Appointment;
}

/**
 * Maps every appointment status onto the one badge variant per state.
 *
 * Both portal pages previously carried their own partial map; the coach one had
 * no entry for 'accepted' or 'agreement_required', so those two real lifecycle
 * states fell through to a grey "neutral" badge and looked like a state that
 * did not exist. The full mapping lives here now.
 */
export function statusVariant(status: AppointmentStatus): BadgeVariant {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'accepted':
    case 'agreement_required':
      return 'scheduled';
    case 'confirmed':
      return 'confirmed';
    case 'completed':
      return 'completed';
    case 'declined':
      return 'cancelled';
    case 'cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/** Solid dot colour for the compact month/week markers. */
export function statusDotClass(status: AppointmentStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-success';
    case 'accepted':
    case 'agreement_required':
      return 'bg-info';
    case 'pending':
      return 'bg-warning';
    case 'declined':
      return 'bg-danger';
    case 'completed':
      return 'bg-muted-foreground';
    case 'cancelled':
    default:
      return 'bg-muted-foreground/60';
  }
}

/** Left-edge colour for a time-grid block, matching statusDotClass. */
export function statusBarClass(status: AppointmentStatus): string {
  switch (status) {
    case 'confirmed':
      return 'border-success/60 bg-success-soft';
    case 'accepted':
    case 'agreement_required':
      return 'border-info/60 bg-info-soft';
    case 'pending':
      return 'border-warning/60 bg-warning-soft';
    case 'declined':
      return 'border-danger/60 bg-danger-soft';
    case 'completed':
      return 'border-border bg-muted/60';
    case 'cancelled':
    default:
      return 'border-border bg-muted/30';
  }
}

function displayName(profile: Profile | null | undefined): string | null {
  if (!profile) return null;
  const name = [profile.firstname, profile.lastname].filter(Boolean).join(' ').trim();
  return name || profile.username || null;
}

export interface ToEntryOptions {
  /**
   * Which side of the booking this calendar is showing. Only affects the
   * wording of the counterpart label — never the data.
   */
  role: 'client' | 'coach';
}

/**
 * Projects one appointment row into a calendar entry.
 *
 * `a.date` is already a 'YYYY-MM-DD' column and is used verbatim: re-deriving
 * it from a Date would reintroduce the timezone bug this module exists to
 * avoid. A row whose date cannot be read is still returned (with an empty key)
 * so the agenda can list it rather than silently dropping a booking.
 */
export function toCalendarEntry(
  appointment: Appointment,
  { role }: ToEntryOptions
): CalendarEntry {
  const counterpart =
    role === 'client'
      ? displayName(appointment.coach)
      : displayName(appointment.client) ?? appointment.name ?? null;

  const counterpartId = role === 'client' ? appointment.coach_id : appointment.client_id;

  const startMinutes = minutesFromTimeString(appointment.start_time);
  const endMinutes = minutesFromTimeString(appointment.end_time);

  const timeLabel =
    startMinutes === null
      ? 'Time to be confirmed'
      : endMinutes === null
        ? formatTimeLabel(appointment.start_time)
        : `${formatTimeLabel(appointment.start_time)} \u2013 ${formatTimeLabel(appointment.end_time)}`;

  return {
    id: appointment.id,
    date: /^\d{4}-\d{2}-\d{2}/.test(appointment.date ?? '')
      ? appointment.date.slice(0, 10)
      : toDateKey(new Date()),
    startMinutes,
    endMinutes,
    timeLabel,
    duration: durationLabel(appointment.start_time, appointment.end_time),
    status: appointment.status,
    counterpartLabel: counterpart
      ? `${role === 'client' ? 'Coach' : 'Student'} ${counterpart}`
      : role === 'client'
        ? 'Coach to be assigned'
        : 'Student',
    sessionType: appointment.session_type?.trim() || null,
    location: appointment.is_online ? 'Online session' : appointment.location ?? appointment.address,
    isOnline: Boolean(appointment.is_online),
    messageHref: counterpartId ? `/messages?user=${counterpartId}` : null,
    appointment,
  };
}

export function toCalendarEntries(
  appointments: Appointment[],
  options: ToEntryOptions
): CalendarEntry[] {
  return appointments.map((a) => toCalendarEntry(a, options));
}

/**
 * Groups entries by date key, sorted by start time.
 *
 * Entries with no usable start time sort last rather than first, so a
 * "time to be confirmed" booking does not quietly take the 9am slot in the
 * day view.
 */
export function groupByDate(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date);
    if (list) list.push(entry);
    else map.set(entry.date, [entry]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.startMinutes === b.startMinutes) return a.endMinutes! - b.endMinutes!;
      if (a.startMinutes === null) return 1;
      if (b.startMinutes === null) return -1;
      return a.startMinutes - b.startMinutes;
    });
  }
  return map;
}

/** Indexes entries by date for O(1) lookup while rendering a grid. */
export function indexByDate(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  return groupByDate(entries);
}

/** Entries keyed by 'YYYY-MM-DD'. The shape every grid view indexes against. */
export type DateKeyLookup = Map<string, CalendarEntry[]>;