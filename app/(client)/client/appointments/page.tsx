'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Star,
  CalendarDays,
} from 'lucide-react';
import FeedbackModal from '@/components/appointments/FeedbackModal';
import { Appointment, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Declined', 'Cancelled'];

export default function ClientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAppointmentForFeedback, setSelectedAppointmentForFeedback] =
    useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          coach:coach_id(*)
        `)
        .eq('client_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      );
    } catch (err) {
      console.error('Error cancelling appointment:', err);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter === 'All') return true;
    return a.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <>
      <PageHeader
        eyebrow="Client Schedule"
        title="My Bookings &amp; Appointments"
        description="Track rehearsal session statuses, connect with coaches, and leave reviews."
        action={
          <Link
            href="/client/calendar"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
          >
            <Calendar className="h-4 w-4 text-accent-text" aria-hidden="true" />
            Calendar View
          </Link>
        }
      />

      {/* Status filter pills with live counts */}
      <div
        role="group"
        aria-label="Filter appointments by status"
        className="g-scroll -mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          const count =
            status === 'All'
              ? appointments.length
              : appointments.filter((a) => a.status.toLowerCase() === status.toLowerCase()).length;

          return (
            <button
              key={status}
              type="button"
              aria-pressed={isActive}
              onClick={() => setStatusFilter(status)}
              className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'border-accent-border bg-accent-soft text-accent-text'
                  : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
              }`}
            >
              <span>{status}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Appointments list */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="g-skeleton h-44 rounded-[20px]" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="No appointments found"
          description={`You do not have any ${statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} rehearsal sessions booked in San Jose del Monte.`}
          actionHref="/client/talent"
          action="Explore Coaches"
        />
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {filteredAppointments.map((appt) => {
            const statusColors: Record<string, string> = {
              pending: 'bg-warning-soft text-warning border-warning/30',
              confirmed: 'bg-success-soft text-success border-success/30',
              completed: 'bg-muted text-muted-foreground border-border',
              declined: 'bg-danger-soft text-danger border-danger/30',
              cancelled: 'bg-muted text-muted-foreground border-border',
            };

            return (
              <Card key={appt.id} padding="md" hoverable>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-start justify-between gap-3 border-b border-divider pb-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-sm font-bold text-accent-text shadow-sm">
                        {appt.coach?.photo_url ? (
                          <img
                            src={appt.coach.photo_url}
                            alt={appt.coach.firstname}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>
                            {appt.coach?.firstname?.[0]}
                            {appt.coach?.lastname?.[0]}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-foreground sm:text-base">
                          Session with Coach {appt.coach?.firstname} {appt.coach?.lastname}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {appt.session_type} · <span className="font-semibold text-accent-text">{appt.talent || 'Dance'}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 self-start rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] sm:self-auto ${
                        statusColors[appt.status] || 'bg-muted border-border text-foreground'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <dt className="sr-only">Date</dt>
                      <Calendar className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                      <dd className="tabular-nums font-medium text-foreground">
                        {new Date(appt.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <dt className="sr-only">Time</dt>
                      <Clock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                      <dd className="tabular-nums font-medium text-foreground">
                        {appt.start_time} - {appt.end_time}
                      </dd>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <dt className="sr-only">Address</dt>
                      <MapPin className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                      <dd className="truncate">{appt.address}</dd>
                    </div>
                  </dl>

                  {appt.purpose && (
                    <div className="rounded-2xl border border-border bg-muted/60 p-3.5 text-xs leading-relaxed">
                      <span className="font-semibold text-muted-foreground">Rehearsal Goal: </span>
                      <span className="text-foreground">{appt.purpose}</span>
                    </div>
                  )}

                  {appt.feedback && (
                    <div className="space-y-1.5 rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-warning">
                        <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        <span className="tabular-nums">Your Review: {appt.rating} / 5 Stars</span>
                      </div>
                      <p className="leading-relaxed text-foreground/80">&ldquo;{appt.feedback}&rdquo;</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-4">
                    <Link
                      href={`/messages?user=${appt.coach_id}`}
                      className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" /> Message Coach
                    </Link>

                    {appt.status === 'pending' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(appt.id)}
                        className="border-danger/30 text-danger hover:bg-danger-soft"
                      >
                        Cancel Booking
                      </Button>
                    )}

                    {appt.status === 'completed' && !appt.feedback && (
                      <Button
                        type="button"
                        size="sm"
                        icon={<Star className="h-3.5 w-3.5" />}
                        onClick={() => setSelectedAppointmentForFeedback(appt)}
                      >
                        Leave Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feedback Modal */}
      {selectedAppointmentForFeedback && (
        <FeedbackModal
          appointment={selectedAppointmentForFeedback}
          isOpen={!!selectedAppointmentForFeedback}
          onClose={() => setSelectedAppointmentForFeedback(null)}
          onSuccess={fetchAppointments}
        />
      )}
    </>
  );
}
