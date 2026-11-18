'use client';

/**
 * HubCalendarView — full-width calendar embedded in the hub.
 * Uses the same Appointment[] shape the existing calendar pages feed to
 * AppointmentCalendar; no second calendar implementation.
 */
import React from 'react';
import AppointmentCalendar from '@/features/calendar/components/AppointmentCalendar';
import type { Appointment } from '@/lib/types';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import type { HubRole } from '../types';

export function HubCalendarView({
  role,
  rows,
}: {
  role: HubRole;
  rows: BookingDetail[];
}) {
  const appointments: Appointment[] = rows.map((d) => d.appointment);
  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <AppointmentCalendar appointments={appointments} role={role} />
    </div>
  );
}

