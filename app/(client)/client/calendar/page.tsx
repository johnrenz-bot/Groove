'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Appointment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning-soft text-warning border-warning/30',
  confirmed: 'bg-success-soft text-success border-success/30',
  completed: 'bg-muted text-muted-foreground border-border',
  declined: 'bg-danger-soft text-danger border-danger/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export default function ClientCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Build calendar matrix
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, dateStr });
  }

  const selectedDateAppointments = appointments.filter((a) => a.date === selectedDate);

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Coaching Calendar"
        description="View your rehearsal and training schedule by date."
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          {/* Calendar grid */}
          <Card padding="md" className="lg:col-span-2">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-5">
              <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Day labels */}
            <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {days.map((item, index) => {
                if (!item) {
                  return <div key={`empty-${index}`} className="h-14 sm:h-20" aria-hidden="true" />;
                }

                const hasAppt = appointments.some((a) => a.date === item.dateStr);
                const isSelected = selectedDate === item.dateStr;

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    aria-pressed={isSelected}
                    aria-label={`${item.dateStr}${hasAppt ? ', has sessions' : ''}`}
                    className={`flex h-14 cursor-pointer flex-col justify-between rounded-xl border p-2 text-left transition sm:h-20 sm:p-2.5 ${
                      isSelected
                        ? 'border-accent bg-accent-soft text-accent-text shadow-[var(--shadow-sm)]'
                        : 'border-border bg-card text-foreground hover:border-border-strong hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        isSelected ? 'text-accent-text' : 'text-foreground'
                      }`}
                    >
                      {item.day}
                    </span>
                    {hasAppt && (
                      <span
                        className={`h-2 w-2 self-end rounded-full ${
                          isSelected ? 'bg-accent' : 'bg-accent-text'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected date details */}
          <Card padding="md" className="flex h-full flex-col justify-between gap-6">
            <div>
              <h3 className="flex items-center gap-2 border-b border-divider pb-4 text-base font-bold text-foreground">
                <CalendarIcon className="h-4 w-4 text-accent-text" aria-hidden="true" />
                <span>
                  Schedule for{' '}
                  {new Date(selectedDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </h3>

              <div className="mt-5">
                {selectedDateAppointments.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<CalendarIcon className="h-5 w-5" />}
                    title="Nothing scheduled"
                    description="No sessions scheduled for this date."
                  />
                ) : (
                  <div className="space-y-3">
                    {selectedDateAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="space-y-2.5 rounded-2xl border border-border bg-card p-3.5 transition hover:border-border-strong"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-xs font-bold text-foreground">
                            Coach {appt.coach?.firstname} {appt.coach?.lastname}
                          </span>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                              STATUS_COLORS[appt.status] || 'bg-muted border-border text-foreground'
                            }`}
                          >
                            {appt.status}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                            <span className="tabular-nums">
                              {appt.start_time} - {appt.end_time}
                            </span>
                          </p>
                          <p className="flex min-w-0 items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                            <span className="truncate">{appt.address}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-divider pt-5">
              <Link
                href="/client/talent"
                className="inline-flex min-h-[40px] w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover"
              >
                Book New Session
              </Link>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
