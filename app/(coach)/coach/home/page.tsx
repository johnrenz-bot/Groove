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
  Maximize2,
  Users,
  HelpCircle,
} from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
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
import { WelcomeModal } from '@/components/shared/WelcomeModal';

/**
 * Removed: a local `getGreeting()` that nothing called. Its absence is why the
 * heading said "Good morning" at every hour — `<Greeting>` now owns the
 * time-of-day salutation (see `components/dashboard/Greeting.tsx`).
 */

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
        className="mb-0 border-b border-border px-5 pb-4"
        icon={<CalendarIcon className="h-4 w-4" />}
        title={`${monthName} ${year}`}
        action={
          <Link
            href="/coach/calendar"
            aria-label="Open calendar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-accent-border hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="p-5">
        <div className="grid grid-cols-7 pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
            {user.firstname} {user.lastname}
          </span>
          <VerifiedIcon verified={user.account_verified} className="h-3.5 w-3.5 shrink-0" />
        </span>
      }
      description={
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {user.role}
        </span>
      }
      headerAccent={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft text-sm font-bold text-accent-text">
          {user.photo_url ? (
            <img src={user.photo_url} alt={user.firstname} className="h-full w-full object-cover" />
          ) : (
            getInitials(user.firstname, user.lastname)
          )}
        </span>
      }
      footer={
        <>
          <Link
            href={`/messages?user=${user.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-5 text-xs font-semibold text-foreground transition hover:border-accent-border hover:bg-muted"
          >
            Message
          </Link>
          <Link
            href={`/userprofile/${user.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover"
          >
            View Profile
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-4">
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
      title="Submit Support Ticket"
      description="Our administration team is here to assist with studio listings and coach operations."
      footer={
        success ? (
          <Button variant="outline" size="md" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="coach-support-ticket-form"
              variant="primary"
              size="md"
              loading={loading}
            >
              Send Ticket
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className="space-y-2 py-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
          <p className="text-base font-bold text-foreground">Ticket Submitted</p>
          <p className="text-xs text-muted-foreground">Our administration will follow up promptly.</p>
        </div>
      ) : (
        <form id="coach-support-ticket-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
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
        </form>
      )}
    </Modal>
  );
}

export default function CoachHomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [coach, setCoach] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<Profile[]>([]);
  const [topCoaches, setTopCoaches] = useState<FullCoach[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
 * A real failure to load the coach profile.
 *
 * The page used to have no such state: `if (loading || !coach)` showed the
 * skeleton, and every non-coach visitor left `coach` null forever — so a client
 * who reached `/coach/home` without the middleware (a stale cookie, a
 * client-side navigation the gateway did not re-check) stared at "Loading your
 * coach terminal..." indefinitely, with no error and no way forward. It also
 * redirected them to `/login`, which is the wrong destination for someone who
 * is already signed in: the middleware bounces an authenticated visitor straight
 * off `/login` again.
 */
const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Failed to load coach profile:', profileError);
        setLoadError('We could not load your profile. Please try again.');
        return;
      }

      if (!profile) {
        setLoadError(
          'Your account is signed in but has no profile yet, so there is no dashboard to show.'
        );
        return;
      }

      if (profile.role !== 'coach') {
        // A signed-in member who is not a coach belongs in their own portal —
        // not on the sign-in page, which would bounce them back here.
        router.push(profile.role === 'admin' ? '/admin/dashboard' : '/client/home');
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

  /**
   * The profile did not arrive. Previously this branch could not be reached
   * for a non-coach: `coach` stayed null, `loading` went false, and the skeleton
   * below stayed on screen forever.
   */
  if (loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <HelpCircle className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard unavailable</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{loadError}</p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => void fetchData()}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => router.push('/messages')}>
            Contact support
          </Button>
        </div>
      </div>
    );
  }

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
            <div key={i} className="g-skeleton h-32 rounded-[14px]" />
          ))}
        </div>
        <div className="g-skeleton h-[200px] rounded-[14px]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="g-skeleton h-72 rounded-[14px] lg:col-span-2" />
          <div className="g-skeleton h-72 rounded-[14px]" />
        </div>
        <p className="text-xs text-muted-foreground">{t('home.loadingTerminal', 'Loading your coach terminal...')}</p>
      </div>
    );
  }

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
        {/* Greeting */}
        <Greeting
          eyebrow={t('home.coachEyebrow', 'Coach Control Terminal')}
          role={t('home.roleCoach', 'Coach')}
          firstName={coach.firstname}
          subtitle={t(
            'home.coachSubtitle',
            'Manage your appointments, organize rehearsal sessions, and review performer requests in Bulacan.'
          )}
        />

        {/* Quick actions — single row */}
        <QuickActions
          actions={[
            { label: t('home.quickShowcase', 'Showcase Feed'), href: '/coach/talents', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
            { label: t('home.quickMessages', 'Messages'), href: '/messages', icon: <Send className="h-4 w-4" /> },
            { label: t('home.quickCalendar', 'Calendar'), href: '/coach/calendar', icon: <CalendarIcon className="h-4 w-4" /> },
            { label: t('home.quickAppointments', 'Appointments'), href: '/coach/appointments', icon: <CalendarDays className="h-4 w-4" /> },
          ]}
        />

        {/* Stat cards */}
        <div className="g-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          <StatCard
            icon={<CalendarIcon className="h-5 w-5" />}
            value={appointments.length}
            label={t('home.statAppointments', 'Appointments')}
            sub={t('home.statAppointmentsSub', 'View upcoming requests')}
            accentColor="yellow"
            href="/coach/appointments"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            value={recommendedUsers.length}
            label={t('home.statStudents', 'Students in SJDM')}
            sub={t('home.statStudentsSub', 'Registered performers')}
            accentColor="blue"
            href="/coach/talents"
          />
          <StatCard
            icon={<MapPin className="h-5 w-5" />}
            value={t('home.statRegionValue', 'SJDM, Bulacan')}
            label={t('home.statRegion', 'Platform Region')}
            sub={t('home.statRegionSub', 'Region III')}
            accentColor="red"
            href="/coach/about"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            value={t('home.statAccountValue', 'Verified Active')}
            label={t('home.statCoachStatus', 'Coach Status')}
            sub={`#${coach.custom_id || '0001'}`}
            accentColor="green"
            href="/coach/profile"
          />
        </div>

        {/* Hero banner */}
        <HeroBanner
          title={t('home.heroCoachTitle', 'Inspire the next generation of performers')}
          description={t(
            'home.heroCoachDesc',
            'Track sessions, manage contracts, and connect with talents in Bulacan.'
          )}
          primaryCta={{ label: t('home.heroCoachPrimary', 'Community Showcase'), href: '/coach/talents' }}
          secondaryCta={{ label: t('home.heroCoachSecondary', 'Manage Schedule'), href: '/coach/appointments' }}
          image="/image/hero/hero.png"
        />

        {/* Lower section — two panels side by side */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Students panel */}
          <PanelCard
            icon={<Users className="h-4 w-4" />}
            title={t('home.studentsPanel', 'Students in San Jose del Monte')}
            subtitle={`${recommendedUsers.length} active performer · Working for more`}
            viewAllHref="/coach/talents"
            viewAllLabel={t('common.viewAll', 'View all')}
          >
            {recommendedUsers.length === 0 ? (
              <EmptyState
                compact
                icon={<Users className="h-5 w-5" />}
                title="No students to show yet"
                description="Active performers near San Jose del Monte will appear here as they join. Browse the community to discover new talent."
                actionHref="/coach/talents"
                action="Browse performers"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {recommendedUsers.slice(0, 4).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className="group cursor-pointer rounded-2xl border border-border bg-card p-3.5 text-center transition hover:border-accent-border hover:bg-muted hover:shadow-[0_2px_8px_rgba(20,40,75,0.04)]"
                  >
                    <div className="relative mx-auto mb-2.5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-bold text-foreground transition-transform group-hover:scale-105">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt={user.firstname} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(user.firstname, user.lastname)
                      )}
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" aria-hidden="true" />
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
            )}
          </PanelCard>

          {/* Upcoming sessions panel */}
          <PanelCard
            icon={<CalendarIcon className="h-4 w-4" />}
            title={t('home.sessionsPanel', 'Upcoming Sessions')}
            subtitle={t('home.sessionsPanelSubCoach', 'Your scheduled rehearsals')}
            viewAllHref="/coach/appointments"
            viewAllLabel={t('common.viewAll', 'View all')}
          >
            <div className="space-y-2.5">
              {appointments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('home.noSessions', 'No upcoming sessions.')}</p>
              ) : (
                appointments.slice(0, 4).map((appt) => {
                  const d = new Date(appt.date);
                  const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const day = String(d.getDate()).padStart(2, '0');
                  const clientName = (appt as unknown as { client?: { firstname?: string; lastname?: string } }).client
                    ? `${(appt as unknown as { client?: { firstname?: string; lastname?: string } }).client!.firstname ?? ''} ${(appt as unknown as { client?: { firstname?: string; lastname?: string } }).client!.lastname ?? ''}`.trim()
                    : appt.name ?? 'Student';

                  return (
                    <SessionRow
                      key={appt.id}
                      month={month}
                      day={day}
                      timeRange={`${appt.start_time} – ${appt.end_time}`}
                      tag="Rehearsal"
                      subtitle={`Dance · SJDM, Bulacan`}
                      status={appt.status === 'confirmed' ? 'Confirmed' : appt.status === 'pending' ? 'Pending' : 'Cancelled'}
                    />
                  );
                })
              )}
            </div>
          </PanelCard>
        </div>

        {/* Studios locator */}
        <section aria-label={t('home.studiosCoachTitle', 'Studio Locator')}>
          <StudioLocator
            title={t('home.studiosCoachTitle', 'Studio Locator')}
            subtitle={t(
              'home.studiosCoachSub',
              'Find dance studios near you using the interactive Google Map. Set your search radius to discover nearby studios and view their locations and distances.'
            )}
          />
        </section>
      </div>

      {/* Floating Groovey AI is provided once by DashboardLayout — no page-level copy. */}

      {selectedUser && <ProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {showTicket && <TicketModal coach={coach} onClose={() => setShowTicket(false)} />}
      <WelcomeModal role="coach" />
    </div>
  );
}
