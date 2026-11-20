'use client';

/**
 * The /client and /coach dashboards are intentionally ONE component.
 *
 * They shipped as two near-identical 197-line pages — the same skeleton,
 * the same error state, the same loading effect and role gate — diverging
 * only in the data fetcher, the widget grid, the greeting copy and the
 * hero/CTA content. Every difference now lives in ROLE_CONFIG below; the
 * rendering is single-sourced.
 *
 * What is NOT unified, deliberately:
 *   - the widget grids (client vs coach show different data models)
 *   - the data fetchers (different queries; RLS does the authorization)
 *   - the MaintenanceBanner (client portal shows it today; preserved as-is)
 */
import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles,
  Calendar,
  CalendarDays,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
// StudioLocator (its map + ~145 KB of client code) renders below the fold.
// Lazy-load it so the dashboards don't pay for it on first paint; the Google
// Maps script itself already defers to mount.
const StudioLocator = dynamic(
  () => import('@/components/studio/StudioLocator').then((m) => m.StudioLocator),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="h-[84svh] min-h-[560px] max-h-[900px] w-full animate-pulse rounded-3xl border border-border bg-card"
      />
    ),
  }
);
import { Greeting } from '@/components/dashboard/Greeting';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { WelcomeModal } from '@/components/shared/WelcomeModal';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';

import { ClientWidgetGrid } from './ClientWidgetGrid';
import { CoachWidgetGrid } from './CoachWidgetGrid';
import { getClientHomeData, getCoachHomeData } from '../services/homeService';
import type { ClientHomeData, CoachHomeData } from '../types';

type Role = 'client' | 'coach';
type HomeData = ClientHomeData | CoachHomeData;

interface RoleConfig {
  /** Queries run under RLS; the role gate (profiles.role) re-checks the portal. */
  fetchHomeData: (userId: string) => Promise<HomeData>;
  /** The portal the member belongs to; used for the role-gate redirect. */
  ownPath: string;
  messagesPath: string;
  /** Maintenance banner is currently a client-portal surface — preserved. */
  showMaintenanceBanner: boolean;
  greetingRole: string;
  eyebrowKey: string;
  eyebrowDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  /**
   * Labels follow the original wiring: client uses `home.quick*` (present in the
   * dictionaries), coach uses `home.coachQuick*` (not present → English
   * defaults, exactly as before).
   */
  quickActions: Array<{ labelKey: string; labelDefault: string; href: string; icon: React.ReactNode; variant?: 'primary' | 'default' }>;
  hero: {
    titleKey: string;
    titleDefault: string;
    descKey: string;
    descDefault: string;
    primary: { key: string; default: string; href: string };
    secondary: { key: string; default: string; href: string };
    image: string;
  };
  studios: { titleKey: string; titleDefault: string; subKey: string; subDefault: string };
}

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  client: {
    fetchHomeData: getClientHomeData,
    ownPath: '/client/home',
    messagesPath: '/client/messages',
    showMaintenanceBanner: true,
    greetingRole: '',
    eyebrowKey: 'home.clientEyebrow',
    eyebrowDefault: 'Client Control Terminal',
    subtitleKey: 'home.clientSubtitle',
    subtitleDefault:
      'Find coaches, book rehearsals, and track your performance journey in Bulacan.',
    quickActions: [
      { labelKey: 'home.quickShowcase', labelDefault: 'Showcase Feed', href: '/client/talent', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
      { labelKey: 'home.quickMessages', labelDefault: 'Messages', href: '/client/messages', icon: <MessageSquare className="h-4 w-4" /> },
      { labelKey: 'home.quickCalendar', labelDefault: 'Calendar', href: '/client/calendar', icon: <Calendar className="h-4 w-4" /> },
      { labelKey: 'home.quickBookings', labelDefault: 'Messages & Bookings', href: '/client/messages?view=board', icon: <CalendarDays className="h-4 w-4" /> },
    ],
    hero: {
      titleKey: 'home.heroClientTitle',
      titleDefault: 'Find your coach. Own the stage.',
      descKey: 'home.heroClientDesc',
      descDefault:
        'Book sessions, share your showcases, and grow with a community of performers in Bulacan.',
      primary: { key: 'home.heroClientPrimary', default: 'Find a Coach', href: '/client/talent' },
      secondary: { key: 'home.heroClientSecondary', default: 'My Schedule', href: '/client/messages?view=board' },
      image: '/image/hero/client/hero.png',
    },
    studios: {
      titleKey: 'home.studiosClientTitle',
      titleDefault: 'Studio Locator',
      subKey: 'home.studiosClientSub',
      subDefault:
        'Find dance studios near you using the interactive Google Map. Set your search radius to discover nearby studios and view their locations and distances.',
    },
  },
  coach: {
    fetchHomeData: getCoachHomeData,
    ownPath: '/coach/home',
    messagesPath: '/coach/messages',
    showMaintenanceBanner: false,
    greetingRole: 'Coach',
    eyebrowKey: 'home.coachEyebrow',
    eyebrowDefault: 'Coach Control Terminal',
    subtitleKey: 'home.coachSubtitle',
    subtitleDefault:
      'Manage your bookings, showcase your craft, and grow your studio in Bulacan.',
    quickActions: [
      { labelKey: 'home.coachQuickShowcase', labelDefault: 'Showcase Feed', href: '/coach/talents', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
      { labelKey: 'home.coachQuickMessages', labelDefault: 'Messages', href: '/coach/messages', icon: <MessageSquare className="h-4 w-4" /> },
      { labelKey: 'home.coachQuickCalendar', labelDefault: 'Calendar', href: '/coach/calendar', icon: <Calendar className="h-4 w-4" /> },
      { labelKey: 'home.coachQuickBookings', labelDefault: 'Messages & Bookings', href: '/coach/messages?view=board', icon: <CalendarDays className="h-4 w-4" /> },
    ],
    hero: {
      titleKey: 'home.heroCoachTitle',
      titleDefault: 'Inspire the next generation.',
      descKey: 'home.heroCoachDesc',
      descDefault:
        'Coach your students, share your craft, and build your studio’s name in the Philippine performing-arts scene.',
      primary: { key: 'home.heroCoachPrimary', default: 'Community Showcase', href: '/coach/talents' },
      secondary: { key: 'home.heroCoachSecondary', default: 'Manage Schedule', href: '/coach/messages?view=board' },
      image: '/image/hero/hero.png',
    },
    studios: {
      titleKey: 'home.studiosCoachTitle',
      titleDefault: 'Studio Locator',
      subKey: 'home.studiosCoachSub',
      subDefault:
        'Find dance studios and rehearsal spaces near you or anywhere in the Philippines.',
    },
  },
};

export function HomeDashboard({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<HomeData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
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

        // Role gate + the data the widgets need, fetched once.
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (cancelled) return;

        if (!profileRow) {
          setLoadError(
            'Your account is signed in but has no profile yet, so there is no dashboard to show.'
          );
          return;
        }
        if (profileRow.role !== role) {
          router.push(
            profileRow.role === 'admin'
              ? '/admin/dashboard'
              : profileRow.role === 'coach'
                ? '/coach/home'
                : '/client/home'
          );
          return;
        }

        const dashboard = await cfg.fetchHomeData(authUser.id);
        if (cancelled) return;
        setData(dashboard);
      } catch (err) {
        console.error(`Failed to load ${role} dashboard:`, err);
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'We could not load your dashboard. Please try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, role, reloadToken]);

  /** After an accept/decline, refetch the widget data. */
  const refreshData = () => setReloadToken((n) => n + 1);

  if (loading) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading your dashboard"
      >
        <div className="space-y-3">
          <div className="g-skeleton h-3 w-32" />
          <div className="g-skeleton h-9 w-72 max-w-full" />
          <div className="g-skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="g-skeleton h-32 rounded-[14px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="g-skeleton h-72 rounded-[14px] lg:col-span-8" />
          <div className="g-skeleton h-72 rounded-[14px] lg:col-span-4" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          <div className="g-skeleton h-64 rounded-[14px] lg:col-span-8" />
          <div className="g-skeleton h-64 rounded-[14px] lg:col-span-4" />
        </div>
      </div>
    );
  }

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
          <Button variant="ghost" onClick={() => router.push(cfg.messagesPath)}>
            Contact support
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        {cfg.showMaintenanceBanner && <MaintenanceBanner />}

        <Greeting
          eyebrow={t(cfg.eyebrowKey, cfg.eyebrowDefault)}
          role={cfg.greetingRole}
          firstName={data.profile.firstname}
          subtitle={t(cfg.subtitleKey, cfg.subtitleDefault)}
        />

        <QuickActions
          actions={cfg.quickActions.map((a) => ({
            label: t(a.labelKey, a.labelDefault),
            href: a.href,
            icon: a.icon,
            variant: a.variant,
          }))}
        />

        {/* Widgets — rendered from the shared registry; data is role-specific */}
        {role === 'client' ? (
          // The fetcher for this branch is fixed: getClientHomeData. The assertion
          // is sound by construction and isolated to this line.
          <ClientWidgetGrid data={data as ClientHomeData} />
        ) : (
          <CoachWidgetGrid data={data as CoachHomeData} onRefreshData={refreshData} />
        )}

        <section aria-label={t(cfg.studios.titleKey, cfg.studios.titleDefault)}>
          <StudioLocator
            id="studios"
            title={t(cfg.studios.titleKey, cfg.studios.titleDefault)}
            subtitle={t(cfg.studios.subKey, cfg.studios.subDefault)}
          />
        </section>
      </div>

      <WelcomeModal role={role} />
    </div>
  );
}

export default HomeDashboard;
