'use client';

/**
 * Client dashboard — /client/home
 *
 * Renders from the shared widget registry (config/dashboard-widgets.ts). All
 * numbers come from the database via features/home/services/homeService —
 * never invented, never a decorative zero.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
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

import { ClientWidgetGrid } from '@/features/home/components/ClientWidgetGrid';
import { getClientHomeData } from '@/features/home/services/homeService';
import type { ClientHomeData } from '@/features/home/types';

export default function ClientHomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<ClientHomeData | null>(null);
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
        if (profileRow.role !== 'client') {
          router.push(profileRow.role === 'coach' ? '/coach/home' : '/admin/dashboard');
          return;
        }

        const dashboard = await getClientHomeData(authUser.id);
        if (cancelled) return;
        setData(dashboard);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
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
          <Button variant="ghost" onClick={() => router.push('/client/messages')}>
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
        <MaintenanceBanner />

        <Greeting
          eyebrow={t('home.clientEyebrow', 'Client Control Terminal')}
          role=""
          firstName={data.profile.firstname}
          subtitle={t(
            'home.clientSubtitle',
            'Find coaches, book rehearsals, and track your performance journey in Bulacan.'
          )}
        />

        <QuickActions
          actions={[
            { label: t('home.quickShowcase', 'Showcase Feed'), href: '/client/talent', icon: <Sparkles className="h-4 w-4" />, variant: 'primary' },
            { label: t('home.quickMessages', 'Messages'), href: '/client/messages', icon: <MessageSquare className="h-4 w-4" /> },
            { label: t('home.quickCalendar', 'Calendar'), href: '/client/calendar', icon: <Calendar className="h-4 w-4" /> },
            { label: t('home.quickBookings', 'Messages & Bookings'), href: '/client/messages?view=board', icon: <CalendarDays className="h-4 w-4" /> },
          ]}
        />

        {/* Widgets — rendered from the shared registry */}
        <ClientWidgetGrid data={data} />

        <HeroBanner
          title={t('home.heroClientTitle', 'Find your coach. Own the stage.')}
          description={t(
            'home.heroClientDesc',
            'Book sessions, share your showcases, and grow with a community of performers in Bulacan.'
          )}
          primaryCta={{ label: t('home.heroClientPrimary', 'Find a Coach'), href: '/client/talent' }}
          secondaryCta={{ label: t('home.heroClientSecondary', 'My Schedule'), href: '/client/messages?view=board' }}
          image="/image/hero/client/hero.png"
        />

        {/* Full Studio Locator — kept available, anchored for the compact widget */}
        <StudioLocator
          id="studios"
          title={t('home.studiosClientTitle', 'Studio Locator')}
          subtitle={t(
            'home.studiosClientSub',
            'Find dance studios near you using the interactive Google Map. Set your search radius to discover nearby studios and view their locations and distances.'
          )}
        />
      </div>

      <WelcomeModal role="client" />
    </div>
  );
}

