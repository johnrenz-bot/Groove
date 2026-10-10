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
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  X,
  Send,
  Ticket as TicketIcon,
  Maximize2,
  Volume2,
  Users,
} from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/SectionHeader';
import { StudioLocator } from '@/components/studio/StudioLocator';

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
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 rounded-[20px] border border-border bg-card p-6">
              <div className="g-skeleton h-11 w-11 rounded-full" />
              <div className="g-skeleton h-8 w-16" />
              <div className="g-skeleton h-3 w-24" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Loading your coach terminal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
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

      {/* Technical Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        <StatCard
          value={appointments.length}
          label="Appointments"
          description="Total session records"
          icon={<CalendarIcon className="h-5 w-5" />}
        />
        <StatCard
          value={recommendedUsers.length}
          label="Students in SJDM"
          description="Registered performers"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          value={<span className="text-2xl sm:text-3xl">SJDM, Bulacan</span>}
          label="Platform Region"
          description="Region III"
          icon={<MapPin className="h-5 w-5" />}
        />
        <StatCard
          value={<span className="flex items-center gap-2 text-xl sm:text-2xl">
            <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />
            Verified Active
          </span>}
          label="Coach Status"
          description={`#${coach.custom_id || '0001'}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

        {/* Hero Banner (Muted Accent Wash + Clean Video) */}
        <section className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-[20px] border border-border bg-muted sm:h-[300px]">
          <video autoPlay loop muted playsInline aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40">
            <source src="/media/Groove.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-overlay" />

          <div className="relative z-10 max-w-2xl px-6 text-center">
            <span className="g-eyebrow mb-4">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>Coach Instructor Workspace</span>
            </span>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
              Inspire the next generation of performers
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Track session confirmations, negotiate digital coaching contracts, and connect with talents in Bulacan.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/coach/talents"
                className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold tracking-[-0.01em] text-accent-foreground shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                Community Showcase
              </Link>
              <Link
                href="/coach/appointments"
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-semibold tracking-[-0.01em] text-foreground transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-muted"
              >
                Manage Schedule
              </Link>
            </div>
          </div>

          {/* Announcement Floating Card */}
          {announcement && (
            <div className="absolute bottom-3 right-3 z-20 hidden max-w-xs items-start gap-2.5 rounded-2xl border border-border bg-card p-3.5 text-foreground shadow-[var(--shadow-panel)] sm:flex">
              <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text">
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{announcement.title || 'Platform Notice'}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{announcement.message}</p>
                {announcement.cta_url && (
                  <Link
                    href={announcement.cta_url}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-text underline-offset-2 hover:underline"
                  >
                    <span>{announcement.cta_label || 'Learn more'}</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-4 sm:space-y-5 lg:col-span-2">
            {/* Recommended Performers */}
            <Card padding="none">
              <CardHeader
                className="mb-0 px-5 pb-4 sm:px-6 sm:pb-5"
                icon={<Users className="h-4 w-4" />}
                title="Students in San Jose del Monte"
                subtitle="Local performers looking for mentorship and rehearsal guidance"
              />

              <div className="grid grid-cols-2 gap-3.5 px-5 pb-6 sm:grid-cols-4 sm:px-6">
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

            {/* Recent Appointments */}
            <Card padding="none">
              <CardHeader
                className="mb-0 px-5 pb-4 sm:px-6 sm:pb-5"
                icon={<CalendarIcon className="h-4 w-4" />}
                title="Recent Appointment Requests"
                subtitle="Client rehearsal slot submissions"
                action={
                  <Link
                    href="/coach/appointments"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent-text transition hover:underline underline-offset-4"
                  >
                    View all
                  </Link>
                }
              />

              <div className="px-5 pb-6 sm:px-6">
                {appointments.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<CalendarIcon className="h-6 w-6" />}
                    title="No appointment requests yet."
                    description="New bookings from performers will show up here."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {appointments.map((appt) => {
                      const badgeVariant =
                        appt.status === 'confirmed'
                          ? 'approved'
                          : appt.status === 'pending'
                          ? 'pending'
                          : 'neutral';

                      return (
                        <div
                          key={appt.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-3.5 text-xs transition hover:border-border-strong"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-bold text-foreground">
                              {appt.name} · <span className="font-normal text-muted-foreground">{appt.session_type}</span>
                            </p>
                            <p className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1 tabular-nums">
                                <CalendarIcon className="h-3 w-3" aria-hidden="true" /> {new Date(appt.date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1 tabular-nums">
                                <Clock className="h-3 w-3" aria-hidden="true" /> {appt.start_time} - {appt.end_time}
                              </span>
                            </p>
                          </div>
                          <Badge variant={badgeVariant} dot={true}>
                            {appt.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar Column */}
          <aside className="space-y-4 sm:space-y-5">
            <MiniCalendar />

            {/* Support Ticket Box */}
            <Card hoverable className="flex flex-col items-center gap-3.5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text">
                <TicketIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Need Help or Support?</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Reach out to the Groove administration for studio listings and account verification.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowTicket(true)}
                className="w-full"
              >
                Submit Ticket
              </Button>
            </Card>
          </aside>
        </div>

        {/* Studios Map. The same shared locator the client dashboard uses; the
            `padding="none"` treatment keeps this card's edge-to-edge map. */}
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
