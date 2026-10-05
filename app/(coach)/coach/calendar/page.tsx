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
  Loader2,
} from 'lucide-react';
import { Appointment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';

export default function CoachCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
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
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow="Schedule"
        title="Coach Schedule Calendar"
        description="View your confirmed coaching routines and scheduled appointments."
        action={
          <Link
            href="/coach/appointments"
            aria-label="Back to appointments"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6" role="status" aria-live="polite">
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
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {/* Calendar Grid */}
          <Card padding="none" className="lg:col-span-2">
            <div className="flex flex-col gap-4 border-b border-divider p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <h2 className="text-lg font-bold tracking-[-0.01em] text-foreground">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Day Labels */}
              <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {days.map((item, index) => {
                  if (!item) {
                    return <div key={`empty-${index}`} className="h-14 sm:h-20 rounded-xl" />;
                  }

                  const hasAppt = appointments.some((a) => a.date === item.dateStr);
                  const isSelected = selectedDate === item.dateStr;

                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedDate(item.dateStr)}
                      aria-pressed={isSelected}
                      className={`flex h-14 cursor-pointer flex-col justify-between rounded-xl border p-2 text-left transition sm:h-20 ${
                        isSelected
                          ? 'border-accent-border bg-accent-soft text-accent-text'
                          : 'border-border bg-card text-foreground hover:border-border-strong hover:bg-muted'
                      }`}
                    >
                      <span className={`text-xs font-semibold tabular-nums ${isSelected ? 'text-accent-text' : 'text-foreground'}`}>
                        {item.day}
                      </span>
                      {hasAppt && (
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 self-end rounded-full bg-success"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Selected Date Session Details */}
          <Card padding="none" className="flex flex-col justify-between">
            <div className="p-5 sm:p-6">
              <h3 className="flex items-center gap-2 border-b border-divider pb-3 text-base font-bold text-foreground">
                <CalendarIcon className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                <span className="truncate">
                  Schedule for{' '}
                  {new Date(selectedDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </h3>

              <div className="mt-4 space-y-3">
                {selectedDateAppointments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No coaching appointments for this date.
                  </p>
                ) : (
                  selectedDateAppointments.map((appt) => {
                    const statusVariant: Record<string, BadgeVariant> = {
                      pending: 'pending',
                      confirmed: 'confirmed',
                      completed: 'completed',
                      declined: 'cancelled',
                      cancelled: 'neutral',
                    };

                    return (
                      <div
                        key={appt.id}
                        className="space-y-2 rounded-2xl border border-border bg-muted/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 text-sm font-bold text-foreground">
                            Student: {appt.name}
                          </span>
                          <Badge variant={statusVariant[appt.status] || 'neutral'}>
                            {appt.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                            <span className="tabular-nums">
                              {appt.start_time} - {appt.end_time}
                            </span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                            <span className="truncate">{appt.address}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-divider p-5 sm:p-6">
              <Link
                href="/coach/appointments"
                className="flex min-h-[40px] w-full items-center justify-center rounded-full border border-border bg-card px-5 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
              >
                Manage All Bookings
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
