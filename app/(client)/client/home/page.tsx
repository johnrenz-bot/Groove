'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, FullCoach, Appointment, Announcement } from '@/lib/types';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { formatCurrency, getInitials } from '@/lib/utils';
import {
  Calendar,
  CalendarDays,
  Sparkles,
  MapPin,
  CheckCircle,
  HelpCircle,
  BadgeCheck,
  Bot,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StudioLocator } from '@/components/studio/StudioLocator';

import { Greeting } from '@/components/dashboard/Greeting';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { StatCard } from '@/components/dashboard/StatCard';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { SessionRow } from '@/components/dashboard/SessionRow';
import { BadgeMiniWidget } from '@/components/dashboard/BadgeMiniWidget';
import { SupportCallout } from '@/components/dashboard/SupportCallout';

export default function ClientHomePage() {
  const router = useRouter();
  const { t } = useLanguage();
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
  /**
   * WHY THIS EXISTS
   *
   * The page used to end in `if (!user) return null;`. That is not a loading
   * state and not an error state — it is a blank page under a working header,
   * with no way to recover and nothing in the console to explain it. It is
   * reached whenever the `profiles` read fails for any reason: an RLS error, a
   * trigger that has not written the row yet, a dropped connection. The query
   * used `.single()` and threw its error away.
   *
   * Now the failure is captured and shown, with a retry that re-runs the same
   * loader. A blank page is the hardest bug to report; this one says what
   * happened.
   */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      setLoading(true);
      setLoadError(null);
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
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error('Failed to load profile:', profileError);
          setLoadError('We could not load your profile. Please try again.');
          return;
        }

        if (!profile) {
          // A session with no `profiles` row is a half-created account, not a
          // client. The middleware sends it to /login with a reason; this keeps
          // the dashboard from pretending otherwise.
          setLoadError(
            'Your account is signed in but has no profile yet, so there is no dashboard to show.'
          );
          return;
        }

        if (profile.role !== 'client') {
          router.push(profile.role === 'coach' ? '/coach/home' : '/admin/dashboard');
          return;
        }

        setUser(profile);

        // Fetch recommended coaches
        const { data: coachesData } = await supabase
          .from('profiles')
          .select(`
            *,
            coach_profile:coach_profiles(*)
          `)
          .eq('role', 'coach')
          .limit(8);

        if (!cancelled && coachesData) {
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

        if (!cancelled && apptData) {
          setUpcomingAppointments(apptData as Appointment[]);
        }

        // Fetch latest announcement
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && annData) {
          setAnnouncement(annData);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        if (!cancelled) setLoadError('We could not load your dashboard. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [router, reloadToken]);

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
      <div className="space-y-6" role="status" aria-live="polite">
        <div className="space-y-3">
          <div className="g-skeleton h-3 w-32" />
          <div className="g-skeleton h-9 w-72 max-w-full" />
          <div className="g-skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="g-skeleton h-32 rounded-[14px]" />
          ))}
        </div>
        <div className="g-skeleton h-[200px] rounded-[14px]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="g-skeleton h-72 rounded-[14px] lg:col-span-2" />
          <div className="g-skeleton h-72 rounded-[14px]" />
        </div>
      </div>
    );
  }

  /**
   * The profile did not arrive. Say so instead of rendering nothing —
   * `return null` here produced a blank page under a fully working header, with
   * no way for the member to recover and nothing in the console to explain it.
   */
  if (loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <HelpCircle className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard unavailable</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{loadError}</p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setReloadToken((n) => n + 1)}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => router.push('/messages')}>
            Contact support
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen">
      {/* No wrapper padding or max-width here. DashboardLayout already applies
          `px-5 py-7 sm:px-8 sm:py-9` and caps the column at 1240px, so the old
          `max-w-[1420px] px-5 py-7 sm:px-8 sm:py-9` was a SECOND layer of the same
          padding (64px per side at `sm`, not 32) wrapping a cap that could never
          take effect inside the narrower 1240px parent. `space-y-*` and `relative
          z-10` are kept — the former is the page rhythm, the latter the stacking
          context the patterns layer needs. */}
      <div className="relative z-10 space-y-6">
        <MaintenanceBanner />

        {/* Greeting */}
        <Greeting
          eyebrow={t('home.clientEyebrow', 'Client Control Terminal')}
          role=""
          firstName={user.firstname}
          subtitle={t(
            'home.clientSubtitle',
            'Find coaches, book rehearsals, and track your performance journey in Bulacan.'
          )}
        />

        {/* Quick actions — single row */}
        <QuickActions
          actions={[
            { label: t('home.quickShowcase', 'Showcase Feed'), href: '/client/talent', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
            { label: t('home.quickMessages', 'Messages'), href: '/messages', icon: <MessageSquare className="h-4 w-4" /> },
            { label: t('home.quickCalendar', 'Calendar'), href: '/client/calendar', icon: <Calendar className="h-4 w-4" /> },
            { label: t('home.quickBookings', 'Bookings'), href: '/client/appointments', icon: <CalendarDays className="h-4 w-4" /> },
          ]}
        />

        {/* Stat cards */}
        <div className="g-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            value={upcomingAppointments.length}
            label={t('home.statBookings', 'Bookings')}
            sub={t('home.statBookingsSub', 'View your sessions')}
            accentColor="yellow"
            href="/client/appointments"
          />
          <StatCard
            icon={<BadgeCheck className="h-5 w-5" />}
            value={recommendedCoaches.length}
            label={t('home.statCoaches', 'Coaches Nearby')}
            sub={t('home.statCoachesSub', 'Available in SJDM')}
            accentColor="blue"
            href="/client/talent"
          />
          <StatCard
            icon={<MapPin className="h-5 w-5" />}
            value={t('home.statRegionValue', 'SJDM, Bulacan')}
            label={t('home.statRegion', 'Platform Region')}
            sub={t('home.statRegionSub', 'Region III')}
            accentColor="red"
            href="/client/about"
          />
          <StatCard
            icon={<BadgeCheck className="h-5 w-5" />}
            /* Was the literal string "Verified Active" for every account,
               verified or not. It now reflects `profiles.account_verified`,
               which is what "Account Status" claims to be. */
            value={
              user.account_verified
                ? t('home.statAccountVerified', 'Verified Active')
                : t('home.statAccountPending', 'Pending Review')
            }
            label={t('home.statAccount', 'Account Status')}
            sub={user.custom_id ? `#${user.custom_id}` : t('home.statAccountNoId', 'No ID yet')}
            accentColor={user.account_verified ? 'green' : 'yellow'}
            href="/client/profile"
          />
        </div>

        {/* Hero banner */}
        <HeroBanner
          title={t('home.heroClientTitle', 'Find your coach. Own the stage.')}
          description={t(
            'home.heroClientDesc',
            'Book sessions, share your showcases, and grow with a community of performers in Bulacan.'
          )}
          primaryCta={{ label: t('home.heroClientPrimary', 'Find a Coach'), href: '/client/talent' }}
          secondaryCta={{ label: t('home.heroClientSecondary', 'My Schedule'), href: '/client/appointments' }}
          image="/image/hero/client/hero.png"
        />

        {/* Lower section — two panels side by side */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Coaches panel */}
          <PanelCard
            icon={<BadgeCheck className="h-4 w-4" />}
            title={t('home.coachesPanel', 'Coaches in San Jose del Monte')}
            subtitle={t('home.coachesPanelSub', 'Local coaches open for mentorship')}
            viewAllHref="/client/talent"
            viewAllLabel={t('common.viewAll', 'View all')}
          >
            {recommendedCoaches.length === 0 ? (
              <EmptyState
                compact
                icon={<BadgeCheck className="h-5 w-5" />}
                title="No coaches to show yet"
                description="Verified coaches near San Jose del Monte will appear here as they join. Browse the full directory to explore every discipline."
                actionHref="/client/talent"
                action="Browse coaches"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {recommendedCoaches.slice(0, 4).map((coach: FullCoach) => (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => setSelectedCoach(coach)}
                    className="group cursor-pointer rounded-2xl border border-border bg-card p-3.5 text-center transition hover:border-accent-border hover:bg-muted hover:shadow-[0_2px_8px_rgba(20,40,75,0.04)]"
                  >
                    <div className="relative mx-auto mb-2.5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-bold text-foreground transition-transform group-hover:scale-105">
                      {coach.photo_url ? (
                        <img src={coach.photo_url} alt={coach.firstname} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(coach.firstname, coach.lastname)
                      )}
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" aria-hidden="true" />
                    </div>
                    <p className="truncate text-xs font-bold text-foreground transition-colors group-hover:text-accent-text">
                      {coach.firstname} {coach.lastname}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {(coach as FullCoach).coach_profile?.talents || 'Coach'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </PanelCard>

          {/* Upcoming sessions panel */}
          <PanelCard
            icon={<Calendar className="h-4 w-4" />}
            title={t('home.sessionsPanel', 'Upcoming Sessions')}
            subtitle={t('home.sessionsPanelSubClient', 'Your booked rehearsals')}
            viewAllHref="/client/appointments"
            viewAllLabel={t('common.viewAll', 'View all')}
          >
            <div className="space-y-2.5">
              {upcomingAppointments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('home.noSessions', 'No upcoming sessions.')}</p>
              ) : (
                upcomingAppointments.slice(0, 4).map((appt) => {
                  const d = new Date(appt.date);
                  const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const day = String(d.getDate()).padStart(2, '0');
                  const coachName = appt.coach
                    ? `${appt.coach.firstname} ${appt.coach.lastname}`
                    : 'Coach Session';

                  return (
                    <SessionRow
                      key={appt.id}
                      month={month}
                      day={day}
                      timeRange={`${appt.start_time} – ${appt.end_time}`}
                      tag="Coaching"
                      subtitle={`${(appt.coach as FullCoach)?.coach_profile?.talents || 'Dance'} · SJDM, Bulacan`}
                      status={appt.status === 'confirmed' ? 'Confirmed' : appt.status === 'pending' ? 'Pending' : 'Cancelled'}
                      showAgreementBadge={appt.status === 'pending'}
                    />
                  );
                })
              )}
            </div>
          </PanelCard>
        </div>

        {/* Studio locator */}
        <StudioLocator
          id="studios"
          title={t('home.studiosClientTitle', 'Rehearsal Studios Locator')}
          subtitle={t(
            'home.studiosClientSub',
            'Performing arts spaces in San Jose del Monte and Bulacan — curated listings plus community-sourced results'
          )}
        />
      </div>

      {/* Floating Groovey AI is provided once by DashboardLayout — no page-level copy. */}

      {/* Quick Coach Modal */}
      {selectedCoach && (
        <Modal
          open={!!selectedCoach}
          onClose={() => setSelectedCoach(null)}
          title={
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-sm font-bold text-accent-text">
                {selectedCoach.photo_url ? (
                  <img src={selectedCoach.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(selectedCoach.firstname, selectedCoach.lastname)
                )}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-foreground">
                  {selectedCoach.firstname} {selectedCoach.lastname}
                </h3>
                <p className="truncate text-xs text-accent-text font-semibold">
                  {selectedCoach.coach_profile?.talents || 'Coach'} · San Jose del Monte
                </p>
              </div>
            </div>
          }
          size="md"
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              <Link
                href={`/userprofile/${selectedCoach.id}`}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition hover:border-accent-border hover:bg-muted"
              >
                Full Profile
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href={`/messages?user=${selectedCoach.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-4 text-xs font-bold text-accent-foreground shadow-sm transition hover:bg-accent-hover"
                >
                  Message Coach
                </Link>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl border border-border bg-muted p-4 leading-relaxed text-muted-foreground">
              {selectedCoach.bio ||
                'Professional performing arts instructor dedicated to mentoring talents.'}
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-3.5">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Session Rate
                </dt>
                <dd className="mt-0.5 text-sm font-bold tabular-nums text-accent-text">
                  {formatCurrency(selectedCoach.coach_profile?.service_fee)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Standard Duration
                </dt>
                <dd className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                  {selectedCoach.coach_profile?.duration || '1 hour'}
                </dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}

      {/* Support Ticket Modal */}
      <Modal
        open={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title={
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <span>Submit Support Ticket</span>
          </div>
        }
        description="Our administration team is here to assist with bookings, coaches, or questions."
        size="md"
      >
        {ticketSent ? (
          <div className="space-y-2 py-8 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
            <p className="text-base font-bold text-foreground">Ticket Submitted Successfully</p>
            <p className="text-xs text-muted-foreground">
              Our administration will review and follow up with you promptly.
            </p>
          </div>
        ) : (
          <form id="support-ticket-form" onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
            <div>
              <label htmlFor="ticket-subject" className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                Subject *
              </label>
              <input
                id="ticket-subject"
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
                placeholder="Brief summary of inquiry"
                className="g-input h-10 w-full text-xs"
              />
            </div>

            <div>
              <label htmlFor="ticket-message" className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                Message Details *
              </label>
              <textarea
                id="ticket-message"
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                required
                rows={4}
                placeholder="Describe your inquiry, concern, or feedback..."
                className="g-input w-full p-3 resize-none text-xs leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTicketModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={ticketLoading}>
                <span>{ticketLoading ? 'Submitting...' : 'Send Ticket'}</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
