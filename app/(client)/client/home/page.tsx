'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, FullCoach, Appointment, Announcement } from '@/lib/types';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  ExternalLink,
  X,
  CheckCircle,
  HelpCircle,
  BadgeCheck,
} from 'lucide-react';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/shared/SectionHeader';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { StudioLocator } from '@/components/studio/StudioLocator';

export default function ClientHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [recommendedCoaches, setRecommendedCoaches] = useState<FullCoach[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<FullCoach | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/login');
          return;
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profile) setUser(profile);

        // Fetch recommended coaches
        const { data: coachesData } = await supabase
          .from('profiles')
          .select(`
            *,
            coach_profile:coach_profiles(*)
          `)
          .eq('role', 'coach')
          .limit(8);

        if (coachesData) {
          setRecommendedCoaches(coachesData as FullCoach[]);
        }

        // Fetch upcoming appointments
        const { data: apptData } = await supabase
          .from('appointments')
          .select(`
            *,
            coach:profiles!appointments_coach_id_fkey(*)
          `)
          .eq('client_id', authUser.id)
          .order('date', { ascending: true })
          .limit(4);

        if (apptData) {
          setUpcomingAppointments(apptData as Appointment[]);
        }

        // Fetch latest announcement
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (annData) {
          setAnnouncement(annData);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [router]);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setTicketLoading(true);

    try {
      const supabase = createClient();
      await supabase.from('tickets').insert({
        user_id: user.id,
        name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        subject: ticketSubject,
        message: ticketMessage,
        status: 'open',
      });
      setTicketSent(true);
      setTimeout(() => {
        setShowTicketModal(false);
        setTicketSent(false);
        setTicketSubject('');
        setTicketMessage('');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
    } finally {
      setTicketLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="g-skeleton h-3 w-32" />
          <div className="g-skeleton h-9 w-72 max-w-full" />
          <div className="g-skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="g-skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="g-skeleton h-64 rounded-[20px]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="g-skeleton h-80 rounded-[20px] lg:col-span-2" />
          <div className="g-skeleton h-80 rounded-[20px]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <MaintenanceBanner />

      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Client Console · San Jose del Monte, Bulacan"
          title={
            <>
              Welcome back, <span className="text-accent-text">{user.firstname}</span>
            </>
          }
          description="Book verified coaches, organize rehearsal sessions, and review digital session contracts."
          action={
            <>
              <Link
                href="/client/talent"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold tracking-[-0.01em] text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover hover:shadow-[var(--shadow-accent)]"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Browse Coaches</span>
              </Link>
              <Button
                type="button"
                variant="outline"
                icon={<HelpCircle className="h-4 w-4" />}
                onClick={() => setShowTicketModal(true)}
              >
                Support
              </Button>
            </>
          }
        />

        {/* Metric row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          <StatCard
            value={upcomingAppointments.length}
            label="Upcoming Sessions"
            description="Scheduled appointments"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            value={recommendedCoaches.length}
            label="Verified Coaches"
            description="Active in your region"
            icon={<BadgeCheck className="h-5 w-5" />}
          />
          <StatCard
            value="SJDM, Bulacan"
            label="Platform Region"
            description="Region III Hub"
            icon={<MapPin className="h-5 w-5" />}
          />
          <StatCard
            value={
              <span className="flex items-center gap-2 text-2xl sm:text-3xl">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                Verified Active
              </span>
            }
            label="Account Status"
            description={`#${user.custom_id || '0001'}`}
            icon={<BadgeCheck className="h-5 w-5" />}
          />
        </div>

        {/* Feature banner */}
        <section className="relative flex h-[240px] items-center justify-center overflow-hidden rounded-[20px] border border-border bg-muted sm:h-[280px]">
          <video
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/media/Groove.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-background/70" aria-hidden="true" />

          <div className="relative z-10 max-w-2xl px-6 text-center">
            <span className="g-eyebrow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              San Jose del Monte Coaching Hub
            </span>
            <h2 className="mt-4 text-xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
              Elevate your performing arts craft
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/75 sm:text-sm">
              Connect with top dance, vocal, theater, and instrument coaches. Secure your rehearsal
              slots with verifiable digital agreements.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/client/talent"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover"
              >
                <span>Browse All Coaches</span>
              </Link>
              <a
                href="#studios"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Studio Locator
              </a>
            </div>
          </div>

          {/* Announcement card */}
          {announcement && (
            <div className="absolute bottom-3 right-3 z-20 hidden max-w-xs items-start gap-2.5 rounded-2xl border border-border bg-card/95 p-3.5 text-foreground shadow-[var(--shadow-lg)] backdrop-blur-md sm:flex">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{announcement.title || 'Platform Notice'}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {announcement.message}
                </p>
                {announcement.cta_url && (
                  <Link
                    href={announcement.cta_url}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-text underline-offset-4 hover:underline"
                  >
                    <span>{announcement.cta_label || 'Learn more'}</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-5 lg:col-span-2 lg:space-y-6">
            {/* Recommended coaches */}
            <Card padding="md">
              <CardHeader
                icon={<Sparkles className="h-4 w-4" />}
                title="Recommended Coaches"
                subtitle="Verified performing arts mentors matching your profile"
                action={
                  <Link
                    href="/client/talent"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-accent-text"
                  >
                    <span>View directory</span>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />

              <CardContent>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {recommendedCoaches.slice(0, 4).map((coach) => (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => setSelectedCoach(coach)}
                      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent-border hover:bg-muted"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-sm font-bold text-foreground transition group-hover:border-accent-border">
                        {coach.photo_url ? (
                          <img
                            src={coach.photo_url}
                            alt={coach.firstname}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(coach.firstname, coach.lastname)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-foreground transition group-hover:text-accent-text">
                          {coach.firstname} {coach.lastname}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] capitalize text-muted-foreground">
                          {coach.coach_profile?.talents || 'Performing Arts'}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold tabular-nums text-accent-text">
                            {formatCurrency(coach.coach_profile?.service_fee)}
                          </span>
                          <span className="text-[10px] text-subtle-foreground">
                            {coach.coach_profile?.duration || '1 hr'}
                          </span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Support callout */}
            <Card
              padding="md"
              className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-foreground">Need Support or Have Feedback?</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Our administration team is available to assist with studio listings, scheduling,
                  and verified coaches.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => setShowTicketModal(true)}
              >
                Submit Ticket
              </Button>
            </Card>
          </div>

          {/* Upcoming sessions */}
          <Card padding="md" className="h-full">
            <CardHeader
              icon={<Calendar className="h-4 w-4" />}
              title="Upcoming Sessions"
              subtitle="Your booked rehearsals"
              action={
                <Link
                  href="/client/appointments"
                  className="text-xs font-semibold text-muted-foreground transition hover:text-accent-text"
                >
                  View all
                </Link>
              }
            />

            <div className="space-y-3">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appt) => {
                  const badgeVariant =
                    appt.status === 'confirmed'
                      ? 'approved'
                      : appt.status === 'pending'
                        ? 'pending'
                        : 'neutral';

                  return (
                    <div
                      key={appt.id}
                      className="space-y-2.5 rounded-2xl border border-border bg-card p-3.5 transition hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-foreground">
                          {appt.coach ? `${appt.coach.firstname} ${appt.coach.lastname}` : 'Coach Session'}
                        </p>
                        <Badge variant={badgeVariant} dot={true}>
                          {appt.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" aria-hidden="true" /> {formatDate(appt.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" aria-hidden="true" /> {appt.start_time}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  compact
                  icon={<Calendar className="h-5 w-5" />}
                  title="No upcoming sessions."
                  description="Book a coach to schedule rehearsal."
                  actionHref="/client/talent"
                  action="Browse Coaches"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Studios locator. One shared component for both dashboards; it reads
            the studios table and draws a real radius, which the static Google
            Maps embed it replaced could not do. */}
        <StudioLocator
          id="studios"
          title="Rehearsal Studios Locator"
          subtitle="Verified performing arts spaces and rehearsal facilities in San Jose del Monte and Bulacan"
        />
      </div>

      {/* Quick Coach Modal */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md animate-in zoom-in-95 space-y-5 rounded-[20px] border border-border bg-card p-6 shadow-[var(--shadow-lg)] duration-150 sm:p-7"
          >
            <button
              type="button"
              onClick={() => setSelectedCoach(null)}
              aria-label="Close coach details"
              className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-lg font-bold text-foreground">
                {selectedCoach.photo_url ? (
                  <img src={selectedCoach.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(selectedCoach.firstname, selectedCoach.lastname)
                )}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-foreground">
                  {selectedCoach.firstname} {selectedCoach.lastname}
                </h3>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedCoach.coach_profile?.talents || 'Coach'}
                </p>
                <p className="truncate text-[11px] text-subtle-foreground">
                  {selectedCoach.city_name || 'San Jose del Monte, Bulacan'}
                </p>
              </div>
            </div>

            <p className="rounded-2xl border border-border bg-muted p-3.5 text-xs leading-relaxed text-muted-foreground">
              {selectedCoach.bio ||
                'Professional performing arts instructor dedicated to mentoring talents.'}
            </p>

            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-muted p-3.5 text-xs">
              <div>
                <dt className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Service Fee
                </dt>
                <dd className="mt-0.5 block font-bold tabular-nums text-accent-text">
                  {formatCurrency(selectedCoach.coach_profile?.service_fee)}
                </dd>
              </div>
              <div>
                <dt className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Duration
                </dt>
                <dd className="mt-0.5 block font-bold tabular-nums text-foreground">
                  {selectedCoach.coach_profile?.duration || '1 hour'}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                href={`/userprofile/${selectedCoach.id}`}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
              >
                View Profile
              </Link>
              <Link
                href={`/messages?user=${selectedCoach.id}`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover"
              >
                Message Coach
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Support Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md animate-in zoom-in-95 space-y-5 rounded-[20px] border border-border bg-card p-6 shadow-[var(--shadow-lg)] duration-150 sm:p-7"
          >
            <button
              type="button"
              onClick={() => setShowTicketModal(false)}
              aria-label="Close support ticket form"
              className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-divider pb-4">
              <HelpCircle className="h-4 w-4 text-accent-text" aria-hidden="true" />
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
                Submit Support Ticket
              </h3>
            </div>

            {ticketSent ? (
              <div className="space-y-2 py-6 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Ticket Submitted</p>
                <p className="text-xs text-muted-foreground">
                  Our administration will follow up promptly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div>
                  <label htmlFor="ticket-subject" className="g-label">
                    Subject
                  </label>
                  <input
                    id="ticket-subject"
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    required
                    placeholder="Brief summary of inquiry"
                    className="g-input"
                  />
                </div>

                <div>
                  <label htmlFor="ticket-message" className="g-label">
                    Message Details
                  </label>
                  <textarea
                    id="ticket-message"
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Describe your inquiry or concern..."
                    className="g-input resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <Button type="button" variant="outline" onClick={() => setShowTicketModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={ticketLoading}>
                    <span>{ticketLoading ? 'Submitting...' : 'Send Ticket'}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
