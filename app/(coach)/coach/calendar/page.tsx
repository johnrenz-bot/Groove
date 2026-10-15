'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { Appointment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import AppointmentCalendar from '@/features/calendar/components/AppointmentCalendar';

export default function CoachCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Unchanged from the original implementation: same two queries, same scopes.
  // The calendar reads whatever this produces.
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(userProfile);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_id(*)
        `)
        .eq('coach_id', user.id);

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching coach calendar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow="Schedule"
        title="Coach Schedule Calendar"
        description="Switch between year, month, week, day and agenda to see your confirmed coaching routines and scheduled appointments."
        action={
          <Link
            href="/coach/appointments"
            aria-label="Back to appointments"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-[20px] border border-border bg-card p-6 lg:col-span-2">
            <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
              Loading schedule...
            </p>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="g-skeleton h-16 rounded-xl sm:h-20" />
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-border bg-card p-6">
            <div className="g-skeleton h-5 w-2/3" />
            <div className="mt-6 space-y-3">
              <div className="g-skeleton h-16 w-full rounded-2xl" />
              <div className="g-skeleton h-16 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      ) : (
        <AppointmentCalendar
          appointments={appointments}
          role="coach"
          emptySlot={
            <EmptyState
              compact
              icon={<CalendarIcon className="h-5 w-5" />}
              title="Nothing scheduled"
              description="No coaching appointments for this date."
            />
          }
          footerAction={
            <Link
              href="/coach/appointments"
              className="flex min-h-[40px] w-full items-center justify-center rounded-full border border-border bg-card px-5 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
            >
              Manage All Bookings
            </Link>
          }
        />
      )}
    </div>
  );
}