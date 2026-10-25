'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertCircle, Calendar as CalendarIcon, ArrowLeft, RefreshCw } from 'lucide-react';
import { Appointment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import AppointmentCalendar from '@/features/calendar/components/AppointmentCalendar';

export default function ClientCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The same query and scope as before. The only addition is an honest error
  // state: a failed read must not look like an empty calendar.
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
          coach:coach_id(*)
        `)
        .eq('client_id', user.id);

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
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Coaching Calendar"
        description="Switch between year, month, week, day and agenda to plan your rehearsal and training schedule."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchAppointments()}
              disabled={loading}
              aria-label="Refresh calendar"
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>
            <Link
              href="/client/appointments"
              aria-label="Back to appointments"
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="g-skeleton h-[420px] rounded-[20px] lg:col-span-2" />
          <div className="g-skeleton h-[420px] rounded-[20px]" />
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