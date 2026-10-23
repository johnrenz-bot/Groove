'use client';

/**
 * The shared Showcase shell used by `/coach/talents` and `/client/talent`.
 *
 * Both pages render this, so the compact header, the floating player, the
 * two-column split, the sticky panel and the mobile stacking order cannot drift
 * apart. What
 * is passed in is the data and the role, never the presentation.
 *
 * LAYOUT
 *   Desktop  — feed 1fr (≈68%) / panel 340px (≈32%), panel sticky below the app
 *              header (4.25rem + 1rem).
 *   Tablet   — the same grid with a narrower panel.
 *   Mobile   — a single column with the panel FIRST, so the circle selector is
 *              reachable before the composer. Sticky is desktop-only; a sticky
 *              rail on a phone fights the page scroll and the bottom dock.
 */

import React from 'react';

import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { Profile } from '@/lib/types';
import type { Community } from '@/features/community/utils/community';
import CommunityFeed from '@/features/community/components/CommunityFeed';
import { DancerCircleRules } from '@/features/community/components/DancerCircleRules';
import { CommunityLeaderboard } from '@/features/community/components/CommunityLeaderboard';
import { TambayanPulseCard } from '@/features/community/components/TambayanPulseCard';
import { useBackgroundMusic, type BackgroundMusic } from '../hooks/useBackgroundMusic';
import { useTalentSelection } from '../hooks/useTalentSelection';
import { MusicMiniPlayer } from './MusicMiniPlayer';
import { TalentBannerPanel } from './TalentBannerPanel';

export interface ShowcaseShellProps {
  /** `'coach' | 'client'` — drives copy and the role-specific tagline. */
  role: 'coach' | 'client';
  currentUser: Profile | null | undefined;
  /** The member's own canonical community, or null when unset. */
  memberCommunity: Community | null;
  eyebrow: string;
  /**
   * Rendered beside the title. `/client/talent` passes its Coach Directory /
   * Community Showcase switcher here so that tab lives in the header rather than
   * above it.
   */
  headerAction?: React.ReactNode;
  loading?: boolean;
  /** Optional existing BackgroundMusic instance if managed by parent route */
  music?: BackgroundMusic;
  /**
   * When true, omits the floating player inside ShowcaseShell. `/client/talent`
   * sets this because its player must stay mounted across BOTH tabs, so it
   * renders the same component at page level instead.
   */
  hideMusicPlayer?: boolean;
}

/**
 * The shell owns the selection, so the panel and the feed can never disagree
 * about which circle is showing — there is exactly one copy of that state, and
 * the page below neither receives nor duplicates it.
 */
export function ShowcaseShell({
  role,
  currentUser,
  memberCommunity,
  eyebrow,
  headerAction,
  loading = false,
  music: externalMusic,
  hideMusicPlayer = false,
}: ShowcaseShellProps) {
  const { t } = useLanguage();

  const selection = useTalentSelection({ memberCommunity });
  const internalMusic = useBackgroundMusic({
    currentUser,
    community: memberCommunity,
  });
  const music = externalMusic ?? internalMusic;

  const isDancerCircleActive =
    selection.selectedKey === 'dancer' || (!selection.selectedKey && memberCommunity === 'Dancer');

  return (
    <div className="space-y-4">
      {/* Compact page header — same title on both routes, tighter than before. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="g-eyebrow mb-2">{eyebrow}</span>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">
            {t('showcase.headerTitle', 'Performing Arts Showcase & Community Tambayan')}
          </h1>
          <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {role === 'coach'
              ? t('showcase.headerDescCoach', 'Share choreography routines, rehearsal highlights and masterclass announcements with verified students and mentors in San Jose del Monte.')
              : t('showcase.headerDescClient', 'Follow rehearsal clips, routines and stage moments from performers and coaches in San Jose del Monte.')}
          </p>
        </div>
        {headerAction && <div className="flex shrink-0 items-center gap-2">{headerAction}</div>}
      </header>

      {/* Community Rules directly below the header on the Dancer Circle. */}
      {isDancerCircleActive && <DancerCircleRules />}

      {/* Small floating player for Groove Rehearsal Mix. It is fixed-positioned,
          so it adds no vertical space above the showcase heading. */}
      {!hideMusicPlayer && <MusicMiniPlayer music={music} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3 lg:order-1">
            <div className="g-skeleton h-14 w-full rounded-[14px]" />
            <div className="g-skeleton h-32 w-full rounded-[14px]" />
            <div className="g-skeleton h-32 w-full rounded-[14px]" />
          </div>
          <div className="g-skeleton h-40 w-full rounded-[14px] lg:order-2" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Panel first in the DOM so it stacks ABOVE the feed on mobile. */}
          <div className="order-1 lg:order-2 space-y-4">
            <TalentBannerPanel
              selectedKey={selection.selectedKey}
              postKey={selection.postKey}
              onSelect={selection.select}
            />

            {/* Filipino Tambayan Pulse & Cypher Tags */}
            <TambayanPulseCard />

            {/* Community Leaderboard */}
            <CommunityLeaderboard compact />
          </div>

          <div className="order-2 min-w-0 lg:order-1 space-y-6">
            <CommunityFeed
              currentUser={currentUser}
              // Posts always carry the member's OWN community — RLS refuses any
              // other value.
              community={memberCommunity ?? null}
              // The feed, by contrast, can be browsed by any circle the member
              // can see.
              filterCommunity={selection.banner?.talent ?? null}
              browsingLabel={selection.banner?.displayName ?? null}
            />

            {/* Community Rules moved above the feed. */}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShowcaseShell;