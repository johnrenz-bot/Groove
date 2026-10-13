/**
 * Calendar date mathematics.
 *
 * Everything here works in LOCAL time and is deliberately free of React, of
 * the DOM and of any date library, so it can be unit-tested directly in Node.
 *
 * WHY NOT toISOString()
 * --------------------
 * The calendar pages previously built date keys with
 * `toISOString().split('T')[0]`. `toISOString()` is UTC. The Philippines is
 * UTC+8, so every local time from 00:00 to 07:59 resolves to the PREVIOUS day.
 * A performer in Manila opening the calendar at 7am on 12 October was shown
 * 11 October — and would open the wrong day's sessions.
 *
 * `toDateKey()` reads getFullYear/getMonth/getDate, which are local by
 * definition, so a key always names the day the user is actually looking at.
 *
 * A date key is always 'YYYY-MM-DD'. It is a CALENDAR day, never an instant:
 * appointments are stored with a `date` column and separate `start_time` and
 * `end_time` columns, so the two are deliberately kept apart here too.
 */

/** Sunday-first, matching the existing calendar and most PH calendars. */
export const WEEK_STARTS_ON = 0;

/** The five views the calendar offers. */
export type CalendarView = 'year' | 'month' | 'week' | 'day' | 'agenda';

export const CALENDAR_VIEWS: readonly CalendarView[] = [
  'year',
  'month',
  'week',
  'day',
  'agenda',
];

export const VIEW_LABELS: Record<CalendarView, string> = {
  year: 'Year',
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
};

/**
 * 'YYYY-MM-DD' for a Date, in the machine's LOCAL timezone.
 * `YYYY-MM-DD` rather than ISO because the date column carries no zone.
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses 'YYYY-MM-DD' into a LOCAL Date at midnight.
 *
 * `new Date('2026-10-12')` parses as UTC midnight, which in UTC-7 is
 * 2026-10-11 17:00 local — the previous calendar day. Building the date from
 * its parts avoids that entirely.
 */
export function fromDateKey(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!match) return new Date(NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** True when `key` is a well-formed 'YYYY-MM-DD' date key. */
export function isDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = fromDateKey(key);
  return !Number.isNaN(d.getTime()) && toDateKey(d) === key;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number): Date {
  // setDate(1) first: on 31 Jan, addMonths(0) via setMonth would overflow into
  // March instead of clamping to the end of February.
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
}

export function addYears(date: Date, amount: number): Date {
  return addMonths(date, amount * 12);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function startOfWeek(date: Date, weekStartsOn: number = WEEK_STARTS_ON): Date {
  const start = startOfDay(date);
  const diff = (start.getDay() - weekStartsOn + 7) % 7;
  return addDays(start, -diff);
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** The 7 dates of the week containing `date`. */
export function weekDates(date: Date, weekStartsOn: number = WEEK_STARTS_ON): Date[] {
  const first = startOfWeek(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/**
 * A 6x7 grid of dates covering `date`'s month, Sunday-first.
 *
 * Always six rows so the month view does not change height between a 28-day
 * February and a 31-day March — the grid would otherwise jump on every month
 * change.
 */
export function monthMatrix(
  date: Date,
  weekStartsOn: number = WEEK_STARTS_ON
): (Date | null)[][] {
  const first = startOfMonth(date);
  const last = endOfMonth(date);

  // Walk six weeks of days starting at the week containing the 1st, and null
  // out anything that belongs to the next month. A month occupies five or six
  // rows depending on where the 1st falls; fixing it at six keeps the grid from
  // changing height as the user pages through months.
  const rows: (Date | null)[][] = [];
  let cursor = startOfWeek(first, weekStartsOn);

  for (let row = 0; row < 6; row++) {
    const cells: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      cells.push(cursor <= last ? cursor : null);
      cursor = addDays(cursor, 1);
    }
    rows.push(cells);
  }

  return rows;
}

/** The 12 first-of-month dates of `date`'s year, for the year view. */
export function yearMonths(date: Date): Date[] {
  return Array.from({ length: 12 }, (_, i) => new Date(date.getFullYear(), i, 1));
}

/**
 * Every date between `from` and `to` inclusive. Bounded so a malformed range
 * cannot spin: an appointment far in the future would otherwise try to render
 * thousands of cells.
 */
export function datesBetween(from: Date, to: Date, maxDays = 400): Date[] {
  const out: Date[] = [];
  let cursor = startOfDay(from);
  const last = startOfDay(to);
  while (cursor <= last && out.length < maxDays) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Moves the anchor by one unit of the given view. */
export function stepAnchor(anchor: Date, view: CalendarView, direction: -1 | 1): Date {
  switch (view) {
    case 'year':
      return addYears(anchor, direction);
    case 'month':
      return addMonths(anchor, direction);
    case 'week':
      return addDays(anchor, 7 * direction);
    case 'day':
      return addDays(anchor, direction);
    case 'agenda':
      return addMonths(anchor, direction);
  }
}

/** Human label for the range the anchor currently shows. */
export function viewTitle(anchor: Date, view: CalendarView): string {
  // Month and weekday NAMES come from the locale. Numbers do not: passing a
  // sparse option set to toLocaleDateString is unpredictable across locales
  // and ICU versions — {day, year} alone renders as "2026 (day: 17)" in some of
  // them — so the numeric parts are assembled here instead.
  const monthName = (date: Date, month: 'short' | 'long') =>
    date.toLocaleDateString(undefined, { month });
  const weekdayName = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'long' });
  const day = (date: Date) => String(date.getDate());
  const year = (date: Date) => String(date.getFullYear());

  switch (view) {
    case 'year':
      return year(anchor);
    case 'month':
      return `${monthName(anchor, 'long')} ${year(anchor)}`;
    case 'week': {
      const days = weekDates(anchor);
      const start = days[0];
      const end = days[6];
      const sameMonth = isSameMonth(start, end);
      const sameYear = start.getFullYear() === end.getFullYear();

      // Each piece written once:
      //   same month   -> "Oct 11 – 17, 2026"
      //   same year    -> "Jul 26 – Aug 1, 2026"
      //   across years -> "Dec 27, 2026 – Jan 2, 2027"
      if (sameYear && sameMonth) {
        return `${monthName(start, 'short')} ${day(start)} \u2013 ${day(end)}, ${year(end)}`;
      }
      if (sameYear) {
        return `${monthName(start, 'short')} ${day(start)} \u2013 ${monthName(end, 'short')} ${day(end)}, ${year(end)}`;
      }
      return (
        `${monthName(start, 'short')} ${day(start)}, ${year(start)} \u2013 ` +
        `${monthName(end, 'short')} ${day(end)}, ${year(end)}`
      );
    }
    case 'day':
      return `${weekdayName(anchor)}, ${monthName(anchor, 'long')} ${day(anchor)}, ${year(anchor)}`;
    case 'agenda':
      return `${monthName(anchor, 'long')} ${year(anchor)}`;
  }
}

/** Short weekday labels, Sunday-first. */
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * Minutes past midnight for a 'HH:MM' or 'HH:MM:SS' column.
 *
 * Returns null rather than NaN for an absent or malformed value so a bad row
 * degrades to an unscheduled-looking card instead of poisoning layout maths.
 */
export function minutesFromTimeString(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Formats minutes past midnight as a 12-hour clock label. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Formats a stored time column for display, passing through anything odd. */
export function formatTimeLabel(time: string | null | undefined): string {
  const minutes = minutesFromTimeString(time);
  if (minutes === null) return time?.trim() ?? '';
  return formatMinutes(minutes);
}

/**
 * Compact hour label for the time-grid gutter: "8 AM", "1 PM".
 *
 * The gutter is narrow, so the full "8:00 AM" wraps onto two lines. Whole hours
 * are the only labels a grid draws, so minutes are always zero here and are
 * dropped.
 */
export function formatHourLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${suffix}`;
}

/** Renders a 'HH:MM' time as a compact duration, e.g. '1h 30m'. */
export function durationLabel(start: string | null, end: string | null): string | null {
  const from = minutesFromTimeString(start);
  const to = minutesFromTimeString(end);
  if (from === null || to === null) return null;
  const total = to - from;
  if (!Number.isFinite(total) || total <= 0) return null;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * The hour window a time-grid should draw.
 *
 * Derived from the appointments actually present, so a calendar holding only
 * 09:00–17:00 sessions does not render sixteen empty rows above and below them.
 * Clamped to sane bounds and widened by an hour at each end so a block is never
 * flush against the edge of the grid.
 *
 * Returns whole hours so every row is a clean divider line.
 */
export function hourWindow(
  spans: { start: number | null; end: number | null }[],
  fallback: { start: number; end: number } = { start: 8, end: 20 }
): { start: number; end: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const span of spans) {
    const from = span.start;
    const to = span.end ?? (from === null ? null : from + 60);
    if (typeof from === 'number' && !Number.isNaN(from)) min = Math.min(min, from);
    if (typeof to === 'number' && !Number.isNaN(to)) max = Math.max(max, to);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return fallback;

  const start = Math.max(0, Math.floor(min / 60) - 1);
  // Widen to at least four hours, but never past midnight — a late-evening
  // session would otherwise push the window to hour 26 and draw empty rows for
  // hours that do not exist.
  const end = Math.min(24, Math.max(Math.ceil(max / 60) + 1, start + 4));
  return { start, end: Math.max(end, start + 1) };
}

/**
 * Where a block sits in the grid, as a percentage of the visible window.
 *
 * Clamped to 0–100 so a session whose end runs past the window cannot push a
 * block outside its column.
 */
export function blockTop(minutes: number, startHour: number, spanHours: number): string {
  if (spanHours <= 0) return '0%';
  const ratio = ((minutes - startHour * 60) / (spanHours * 60)) * 100;
  return `${Math.max(0, Math.min(100, ratio))}%`;
}

/**
 * Height for a time-grid block: its real share of the window, but never less
 * than `minRem`, so a one-hour session on a long day still has room for two
 * lines of text instead of clipping the label.
 */
export function blockHeight(
  fromMinutes: number,
  toMinutes: number,
  startHour: number,
  spanHours: number,
  minRem = 3.75
): string {
  const top = parseFloat(blockTop(fromMinutes, startHour, spanHours));
  const bottom = parseFloat(blockTop(toMinutes, startHour, spanHours));
  return `max(${Math.max(8, bottom - top)}%, ${minRem}rem)`;
}