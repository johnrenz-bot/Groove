'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { VerifiedIcon } from '@/features/verification/components/VerifiedBadge';
import { Profile, FullCoach, Appointment, Announcement } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Sparkles,
  MapPin,
  CheckCircle2,
  Send,
  Ticket as TicketIcon,
  Maximize2,
  Users,
} from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/shared/SectionHeader';
import { StudioLocator } from '@/components/studio/StudioLocator';

import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { StatRow } from '@/components/dashboard/StatRow';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingSessionsWidget } from '@/components/dashboard/UpcomingSessionsWidget';
import { BadgeMiniWidget } from '@/components/dashboard/BadgeMiniWidget';
import { SupportCallout } from '@/components/dashboard/SupportCallout';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function MiniCalendar() {
  const [date] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = date.toLocaleString('default', { month: 'long' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = date.getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader
        className="mb-0 border-b border-divider px-5 pb-4"
        icon={<CalendarIcon className="h-4 w-4" />}
        title={`${monthName} ${year}`}
        action={
          <Link
            href="/coach/calendar"
            aria-label="Open calendar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="p-5">
        <div className="grid grid-cols-7 pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
            <span key={idx}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {cells.map((d, i) => (
            <div
              key={i}
              className={`rounded-lg py-1.5 text-[11px] font-semibold tabular-nums transition ${
                d === today
                  ? 'bg-accent font-bold text-accent-foreground'
                  : d
                  ? 'cursor-default text-foreground'
                  : ''
              }`}
            >
              {d ?? ''}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ProfileModal({ user, onClose }: { user: Profile | null; onClose: () => void }) {
  if (!user) return null;
  return (
    <Modal
      open={!!user}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-bold text-foreground">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.firstname} className="h-full w-full object-cover" />
            ) : (
              getInitials(user.firstname, user.lastname)
            )}
          </div>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <span className="truncate">{user.firstname} {user.lastname}</span>
              <VerifiedIcon verified={user.account_verified} className="h-3.5 w-3.5" />
            </h2>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">{user.role}</p>
          </div>
        </div>
      }
      footer={
        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Link
            href={`/messages?user=${user.id}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-muted"
          >
            Message
          </Link>
          <Link
            href={`/userprofile/${user.id}`}
            className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            View Profile
          </Link>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        <div className="space-y-2 rounded-2xl border border-border bg-muted/60 p-4">
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            <span>{user.city_name || user.address_summary || 'San Jose del Monte, Bulacan'}</span>
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {user.bio || 'Performer actively collaborating on Groove.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

function TicketModal({ coach, onClose }: { coach: Profile | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: coach ? `${coach.firstname} ${coach.lastname}`.trim() : '',
    email: coach?.email || '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('tickets').insert({
        user_id: coach?.id,
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        status: 'open',
        priority: 'medium',
      });
      if (err) throw err;
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch {
      setError('Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2.5">
          <TicketIcon className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <span>Submit Support Ticket</span>
        </div>
      }
      description="Our administration team is here to assist with studio listings and coach operations."
    >
      {success ? (
        <div className="space-y-2 py-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
          <p className="text-base font-bold text-foreground">Ticket Submitted</p>
          <p className="text-xs text-muted-foreground">Our administration will follow up promptly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground" htmlFor="ticket-subject">
              Subject *
            </label>
            <input
              id="ticket-subject"
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief summary of inquiry"
              className="g-input h-10 w-full text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground" htmlFor="ticket-message">
              Message Details *
            </label>
            <textarea
              id="ticket-message"
              rows={4}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your inquiry, studio issue, or schedule question..."
              className="g-input w-full p-3 resize-none text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-divider">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
            >
              Send Ticket
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function CoachHomePage() {
  const router = useRouter();
  const [coach, setCoach] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<Profile[]>([]);
  const [topCoaches, setTopCoaches] = useState<FullCoach[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'coach') {
        router.push('/login');
        return;
      }
      setCoach(profile as Profile);

      // Appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_id(*)
        `)
        .eq('coach_id', profile.id)
        .order('date', { ascending: false })
        .limit(6);
      setAppointments(appts || []);

      // Recommended performers
      const { data: recs } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .limit(8);
      setRecommendedUsers((recs as Profile[]) || []);

      // Top verified coaches
      const { data: coaches } = await supabase
        .from('profiles')
        .select(`*, coach_profile:coach_profiles(*)`)
        .eq('role', 'coach')
        .limit(5);
      setTopCoaches((coaches as FullCoach[]) || []);

      // Latest announcement
      const { data: ann } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ann) setAnnouncement(ann);
    } catch (err) {
      console.error('Error loading coach home:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !coach) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <div className="space-y-3">
          <div className="g-skeleton h-3 w-32" />
          <div className="g-skeleton h-8 w-72 max-w-full" />
          <div className="g-skeleton h-4 w-full max-w-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="g-skeleton h-32 rounded-[20px]" />
          ))}
        </div>
        <div className="g-skeleton h-[200px] rounded-[20px]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="g-skeleton h-72 rounded-[20px] lg:col-span-2" />
          <div className="g-skeleton h-72 rounded-[20px]" />
        </div>
        <p className="text-xs text-muted-foreground">Loading your coach terminal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Page header */}
      <PageHeader
        eyebrow="Coach Control Terminal"
        title={
          <>
            {getGreeting()},{' '}
            <span className="text-accent-text">Coach {coach.firstname}</span>
          </>
        }
        description="Manage appointments, organize rehearsal sessions, and review performer requests in Bulacan."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/coach/talents"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold tracking-[-0.01em] text-accent-foreground shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-accent-hover"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Showcase Feed</span>
            </Link>
            <Link
              href="/messages"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold tracking-[-0.01em] text-foreground transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-muted"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Messages</span>
            </Link>
          </div>
        }
      />

      {/* Quick actions */}
      <QuickActions
        actions={[
          { label: 'Showcase Feed', href: '/coach/talents', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
          { label: 'Messages', href: '/messages', icon: <Send className="h-4 w-4" /> },
          { label: 'Calendar', href: '/coach/calendar', icon: <CalendarIcon className="h-4 w-4" /> },
          { label: 'Appointments', href: '/coach/appointments', icon: <CalendarDays className="h-4 w-4" /> },
        ]}
      />

      {/* Stat row */}
      <StatRow
        stats={[
          {
            value: appointments.length,
            label: 'Appointments',
            description: 'Total session records',
            icon: <CalendarIcon className="h-5 w-5" />,
          },
          {
            value: recommendedUsers.length,
            label: 'Students in SJDM',
            description: 'Registered performers',
            icon: <Users className="h-5 w-5" />,
          },
          {
            value: <span className="text-2xl sm:text-3xl">SJDM, Bulacan</span>,
            label: 'Platform Region',
            description: 'Region III',
            icon: <MapPin className="h-5 w-5" />,
          },
          {
            value: (
              <span className="flex items-center gap-2 text-xl sm:text-2xl">
                <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />
                Verified Active
              </span>
            ),
            label: 'Coach Status',
            description: `#${coach.custom_id || '0001'}`,
            icon: <CheckCircle2 className="h-5 w-5" />,
          },
        ]}
      />

      {/* Hero banner */}
      <HeroBanner
        eyebrow="Coach Instructor Workspace"
        headline="Inspire the next generation of performers"
        subline="Track session confirmations, negotiate digital coaching contracts, and connect with talents in Bulacan."
        primaryCta={{ label: 'Community Showcase', href: '/coach/talents' }}
        secondaryCta={{ label: 'Manage Schedule', href: '/coach/appointments' }}
        announcement={announcement}
      />

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {/* 2-col main */}
        <div className="space-y-4 sm:space-y-5 lg:col-span-2">
          <UpcomingSessionsWidget
            appointments={appointments}
            perspective="coach"
            viewAllHref="/coach/appointments"
          />
          <BadgeMiniWidget userId={coach.id} role="coach" />
          <SupportCallout onSubmitTicket={() => setShowTicket(true)} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 sm:space-y-5">
          <MiniCalendar />

          {/* Students card */}
          <Card padding="none">
            <CardHeader
              className="mb-0 px-5 pb-4 sm:px-6 sm:pb-5"
              icon={<Users className="h-4 w-4" />}
              title="Students in San Jose del Monte"
              subtitle="Local performers looking for mentorship"
            />
            <div className="grid grid-cols-2 gap-3.5 px-5 pb-6 sm:px-6">
              {recommendedUsers.slice(0, 4).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUser(user)}
                  className="group cursor-pointer rounded-2xl border border-border bg-card p-3.5 text-center transition hover:border-accent-border hover:bg-muted/60"
                >
                  <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-bold text-foreground transition-transform group-hover:scale-105">
                    {user.photo_url ? (
                      <img src={user.photo_url} alt={user.firstname} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(user.firstname, user.lastname)
                    )}
                  </div>
                  <p className="truncate text-xs font-bold text-foreground transition-colors group-hover:text-accent-text">
                    {user.firstname} {user.lastname}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {user.role}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      {/* Studio locator */}
      <StudioLocator
        title="Rehearsal Studios Directory"
        subtitle="Dance and performing arts studios around San Jose del Monte, Bulacan — curated listings plus community-sourced results"
        padding="none"
      />

      {selectedUser && <ProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {showTicket && <TicketModal coach={coach} onClose={() => setShowTicket(false)} />}
    </div>
  );
}
