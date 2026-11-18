'use client';

/**
 * Coach dashboard — /coach/home
 *
 * Renders from the shared widget registry (config/dashboard-widgets.ts). All
 * numbers come from the database via features/home/services/homeService —
 * including "Verified" status, which reads the real account_verified flag
 * (the old page hardcoded "Verified Active" for every account).
 */

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
import { StudioLocator } from '@/components/studio/StudioLocator';
import { Greeting } from '@/components/dashboard/Greeting';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { WelcomeModal } from '@/components/shared/WelcomeModal';

import { CoachWidgetGrid } from '@/features/home/components/CoachWidgetGrid';
import { getCoachHomeData } from '@/features/home/services/homeService';
import type { CoachHomeData } from '@/features/home/types';

export default function CoachHomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<CoachHomeData | null>(null);
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
        if (profileRow.role !== 'coach') {
          router.push(profileRow.role === 'client' ? '/client/home' : '/admin/dashboard');
          return;
        }

        const dashboard = await getCoachHomeData(authUser.id);
        if (cancelled) return;
        setData(dashboard);
      } catch (err) {
        console.error('Failed to load coach dashboard:', err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'We could not load your dashboard. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [router, reloadToken]);

  /** After an accept/decline, refetch the widget data. */
  const refreshData = () => setReloadToken((n) => n + 1);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite" aria-busy="true" aria-label="Loading your dashboard">
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
          <Button variant="ghost" onClick={() => router.push('/coach/messages')}>
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
        <Greeting
          eyebrow={t('home.coachEyebrow', 'Coach Control Terminal')}
          role="Coach"
          firstName={data.profile.firstname}
          subtitle={t(
            'home.coachSubtitle',
            'Manage your bookings, showcase your craft, and grow your studio in Bulacan.'
          )}
        />

        <QuickActions
          actions={[
            { label: t('home.coachQuickShowcase', 'Showcase Feed'), href: '/coach/talents', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
            { label: t('home.coachQuickMessages', 'Messages'), href: '/coach/messages', icon: <MessageSquare className="h-4 w-4" /> },
            { label: t('home.coachQuickCalendar', 'Calendar'), href: '/coach/calendar', icon: <Calendar className="h-4 w-4" /> },
            { label: t('home.coachQuickBookings', 'Messages & Bookings'), href: '/coach/messages?view=board', icon: <CalendarDays className="h-4 w-4" /> },
          ]}
        />

        {/* Widgets — rendered from the shared registry */}
        <CoachWidgetGrid data={data} onRefreshData={refreshData} />

        <HeroBanner
          title={t('home.heroCoachTitle', 'Inspire the next generation.')}
          description={t(
            'home.heroCoachDesc',
            'Coach your students, share your craft, and build your studio’s name in the Philippine performing-arts scene.'
          )}
          primaryCta={{ label: t('home.heroCoachPrimary', 'Community Showcase'), href: '/coach/talents' }}
          secondaryCta={{ label: t('home.heroCoachSecondary', 'Manage Schedule'), href: '/coach/messages?view=board' }}
          image="/image/hero/hero.png"
        />

        <section aria-label={t('home.studiosCoachTitle', 'Studio Locator')}>
          <StudioLocator
            id="studios"
            title={t('home.studiosCoachTitle', 'Studio Locator')}
            subtitle={t(
              'home.studiosCoachSub',
              'Find dance studios and rehearsal spaces near you or anywhere in the Philippines.'
            )}
          />
        </section>
      </div>

      <WelcomeModal role="coach" />
    </div>
  );
}

