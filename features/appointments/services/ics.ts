/**
 * Calendar export for one booking — a real VEVENT as a Blob download, and a
 * Google Calendar template link. No server, no API keys, no invented data:
 * every field comes from the appointment row.
 *
 * Times are floating Manila wall-clock times tagged TZID=Asia/Manila, which is
 * what every calendar client already understands for PH-only rehearsals. The
 * DTSTAMP is UTC, as RFC 5545 requires.
 */
import type { Appointment } from '@/lib/types';
import { timeToMinutes } from './bookingTime';

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' + 'HH:MM' → 'YYYYMMDDTHHMMSS' (floating Manila local). */
export function floatingLocal(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const start = timeToMinutes(time);
  if (!y || !m || !d || start === null) return '';
  const hh = Math.floor(start / 60);
  const mm = start % 60;
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

/** One-line, escaped ICS text value. */
function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export interface IcsInput {
  appointment: Pick<
    Appointment,
    | 'id'
    | 'date'
    | 'start_time'
    | 'end_time'
    | 'address'
    | 'is_online'
    | 'purpose'
    | 'session_type'
    | 'talent'
  >;
  counterpartyName: string;
}

export function buildIcs({ appointment, counterpartyName }: IcsInput): string | null {
  const dtStart = floatingLocal(appointment.date, appointment.start_time);
  const dtEnd = floatingLocal(appointment.date, appointment.end_time);
  if (!dtStart || !dtEnd) return null;

  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const what = [appointment.session_type, appointment.talent].filter(Boolean).join(' · ');
  const summary = icsText(`Groove session: ${counterpartyName}${what ? ` (${what})` : ''}`);
  const location = icsText(
    appointment.is_online ? 'Online session' : appointment.address || 'GroovePH'
  );
  const description = icsText(
    [
      `Booking #${String(appointment.id).padStart(5, '0')} on GroovePH.`,
      appointment.purpose ? `Goal: ${appointment.purpose}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  );

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GroovePH//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:booking-${appointment.id}@grooveph`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Asia/Manila:${dtStart}`,
    `DTEND;TZID=Asia/Manila:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Trigger a download from the browser. Returns false on non-browser or failure. */
export function downloadIcs(input: IcsInput): boolean {
  if (typeof window === 'undefined') return false;
  const content = buildIcs(input);
  if (!content) return false;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `groove-session-${String(input.appointment.id).padStart(5, '0')}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}

/** Google Calendar template link — opens the user's own calendar to a prefilled event. */
export function googleCalendarUrl({ appointment, counterpartyName }: IcsInput): string | null {
  const dtStart = floatingLocal(appointment.date, appointment.start_time);
  const dtEnd = floatingLocal(appointment.date, appointment.end_time);
  if (!dtStart || !dtEnd) return null;

  const what = [appointment.session_type, appointment.talent].filter(Boolean).join(' · ');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Groove session: ${counterpartyName}${what ? ` (${what})` : ''}`,
    dates: `${dtStart}/${dtEnd}`,
    ctz: 'Asia/Manila',
    details: `Booking #${String(appointment.id).padStart(5, '0')} on GroovePH.${
      appointment.purpose ? ` Goal: ${appointment.purpose}` : ''
    }`,
    location: appointment.is_online ? 'Online session' : appointment.address || 'GroovePH',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
