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
import { PageHeader } from '@/components/shared/SectionHeader';
import { StudioLocator } from '@/components/studio/StudioLocator';

import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { StatRow } from '@/components/dashboard/StatRow';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingSessionsWidget } from '@/components/dashboard/UpcomingSessionsWidget';
import { CoachAvatarRow } from '@/components/dashboard/CoachAvatarRow';
import { BadgeMiniWidget } from '@/components/dashboard/BadgeMiniWidget';
import { SupportCallout } from '@/components/dashboard/SupportCallout';

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
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="g-skeleton h-3 w-32" />
          <div className="g-skeleton h-9 w-72 max-w-full" />
          <div className="g-skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="g-skeleton h-32 rounded-[20px]" />
          ))}
        </div>
        <div className="g-skeleton h-[200px] rounded-[20px]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="g-skeleton h-72 rounded-[20px] lg:col-span-2" />
          <div className="g-skeleton h-72 rounded-[20px]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <MaintenanceBanner />

      <div className="space-y-6 sm:space-y-8">
        {/* Page header */}
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

        {/* Quick actions */}
        <QuickActions
          actions={[
            { label: 'Find Coach', href: '/client/talent', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
            { label: 'Appointments', href: '/client/appointments', icon: <Calendar className="h-4 w-4" /> },
            { label: 'Calendar', href: '/client/calendar', icon: <CalendarDays className="h-4 w-4" /> },
            { label: 'Ask Groovey AI', href: '/client/groovey', icon: <Bot className="h-4 w-4" /> },
            { label: 'Messages', href: '/messages', icon: <MessageSquare className="h-4 w-4" /> },
          ]}
        />

        {/* Stat row */}
        <StatRow
          stats={[
            {
              value: upcomingAppointments.length,
              label: 'Upcoming Sessions',
              description: 'Scheduled appointments',
              icon: <Calendar className="h-5 w-5" />,
            },
            {
              value: recommendedCoaches.length,
              label: 'Verified Coaches',
              description: 'Active in your region',
              icon: <BadgeCheck className="h-5 w-5" />,
            },
            {
              value: 'SJDM, Bulacan',
              label: 'Platform Region',
              description: 'Region III Hub',
              icon: <MapPin className="h-5 w-5" />,
            },
            {
              value: (
                <span className="flex items-center gap-2 text-2xl sm:text-3xl">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" aria-hidden="true" />{' '}
                  Verified Active
                </span>
              ),
              label: 'Account Status',
              description: `#${user.custom_id || '0001'}`,
              icon: <BadgeCheck className="h-5 w-5" />,
            },
          ]}
        />

        {/* Hero banner */}
        <HeroBanner
          eyebrow="San Jose del Monte Coaching Hub"
          headline="Elevate your performing arts craft"
          subline="Connect with top dance, vocal, theater, and instrument coaches. Secure your rehearsal slots with verifiable digital agreements."
          primaryCta={{ label: 'Browse All Coaches', href: '/client/talent' }}
          secondaryCta={{ label: 'Studio Locator', href: '#studios' }}
          announcement={announcement}
        />

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 space-y-5 lg:col-span-2 lg:space-y-6">
            <CoachAvatarRow coaches={recommendedCoaches} viewAllHref="/client/talent" />
            <BadgeMiniWidget userId={user.id} role="client" />
            <SupportCallout onSubmitTicket={() => setShowTicketModal(true)} />
          </div>
          <UpcomingSessionsWidget
            appointments={upcomingAppointments}
            perspective="client"
            viewAllHref="/client/appointments"
            className="min-w-0 lg:h-full"
          />
        </div>

        {/* Studio locator */}
        <StudioLocator
          id="studios"
          title="Rehearsal Studios Locator"
          subtitle="Performing arts spaces in San Jose del Monte and Bulacan — curated listings plus community-sourced results"
        />
      </div>

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
                className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
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
            <div className="rounded-2xl border border-border bg-muted/40 p-4 leading-relaxed text-muted-foreground">
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

            <div className="flex justify-end gap-2.5 pt-2 border-t border-divider">
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
    </>
  );
}
