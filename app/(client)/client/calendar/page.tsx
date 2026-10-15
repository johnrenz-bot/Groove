'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { Appointment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import AppointmentCalendar from '@/features/calendar/components/AppointmentCalendar';

export default function ClientCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Unchanged from the original implementation: same query, same scope, same
  // ordering guarantee. The calendar reads whatever this produces.
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          coach:coach_id(*)
        `)
        .eq('client_id', user.id);

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching calendar appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Coaching Calendar"
        description="Switch between year, month, week, day and agenda to plan your rehearsal and training schedule."
        action={
          <Link
            href="/client/appointments"
            aria-label="Back to appointments"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="g-skeleton h-[420px] rounded-[20px] lg:col-span-2" />
          <div className="g-skeleton h-[420px] rounded-[20px]" />
        </div>
      ) : (
        <AppointmentCalendar
          appointments={appointments}
          role="client"
          emptySlot={
            <EmptyState
              compact
              icon={<CalendarIcon className="h-5 w-5" />}
              title="Nothing scheduled"
              description="No sessions scheduled for this date."
            />
          }
          footerAction={
            <Link
              href="/client/talent"
              className="inline-flex min-h-[40px] w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover"
            >
              Book New Session
            </Link>
          }
        />
      )}
    </>
  );
}