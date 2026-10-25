'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertCircle, Calendar as CalendarIcon, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { Appointment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import AppointmentCalendar from '@/features/calendar/components/AppointmentCalendar';

export default function CoachCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The same appointment query and scope as before. The only addition is an
  // honest error state: a failed read must not look like an empty calendar.
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAppointments([]);
        return;
      }

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
      setError(err instanceof Error ? err.message : 'Your calendar could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the first read out of the effect body, so React does not treat the
    // loading flag as a synchronous cascading render.
    const timer = window.setTimeout(() => {
      void fetchAppointments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAppointments]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow="Schedule"
        title="Coach Schedule Calendar"
        description="Switch between year, month, week, day and agenda to see your confirmed coaching routines and scheduled appointments."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchAppointments()}
              disabled={loading}
              aria-label="Refresh calendar"
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            <Link
              href="/coach/appointments"
              aria-label="Back to appointments"
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
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
      ) : error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[20px] border border-danger/30 bg-danger-soft p-5"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-danger">Calendar could not be loaded</p>
            <p className="mt-1 text-xs leading-relaxed text-danger/80">{error}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-danger/70">
              This is not an empty schedule. Your sessions are unchanged; the read failed.
            </p>
            <button
              type="button"
              onClick={() => void fetchAppointments()}
              className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-danger/30 bg-card px-4 text-xs font-semibold text-danger transition hover:border-danger/50 hover:bg-danger-soft"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
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