/**
 * The four Community Showcase talent categories — one place, strongly typed.
 *
 * WHY THE DISPLAY/STORE SPLIT
 *   The database is the authority. `community_posts.talent` is
 *   `VARCHAR(50)` with a CHECK constraint of exactly
 *
 *       ('Dancer', 'Singer', 'Acting', 'Theater')
 *
 *   (supabase/community_feed.sql) and `my_community()` returns one of those four
 *   via `community_slug()`. Note `Acting`, not `Actor` — the brief asks for the
 *   display label "Actor", so `displayName` says Actor while `talent` carries the
 *   value that actually goes into the column and into every RLS comparison.
 *   Changing `talent` here without a migration would break inserts, because RLS
 *   compares it to `my_community()`.
 *
 * WHY THE GRADIENTS ARE UTILITY CLASSES
 *   Each banner gradient is expressed with Tailwind utilities over the design
 *   tokens (`accent`, `danger`, `brand-sunburst`, `foreground`) rather than a
 *   hex value, so a banner re-themes with the rest of the app and adds no colour
 *   that is not already in the five-colour brand. No remote image is fetched, so
 *   a banner can never fail to paint.
 */

import type { Community } from '@/features/community/utils/community';

/** Stable key used in URLs, state and tests. */
export type TalentKey = 'dancer' | 'singer' | 'actor' | 'theater';

export interface TalentBanner {
  /** Stable key — safe for state, storage and test selectors. */
  key: TalentKey;
  /**
   * The value written to `community_posts.talent`. This is the CHECK-constrained
   * slug, NOT the display label.
   */
  talent: Community;
  /** What the member reads. `talent: 'Acting'` presents as "Actor". */
  displayName: string;
  description: string;
  /** The badge, e.g. "Dancer Circle". */
  circleLabel: string;
  /** Token-driven gradient classes applied to the banner surface. */
  gradient: string;
  /** Ring / border tint used on the active selector button. */
  activeRing: string;
}

export const talentBanners: Record<TalentKey, TalentBanner> = {
  dancer: {
    key: 'dancer',
    talent: 'Dancer',
    displayName: 'Dancer',
    description:
      'Share choreography, movement, training, and performance moments.',
    circleLabel: 'Dancer Circle',
    gradient: 'bg-gradient-to-br from-accent/18 via-accent/6 to-transparent',
    activeRing: 'ring-accent/45',
  },
  singer: {
    key: 'singer',
    talent: 'Singer',
    displayName: 'Singer',
    description:
      'Connect through vocal practice, music, and live performances.',
    circleLabel: 'Singer Circle',
    gradient: 'bg-gradient-to-br from-danger/16 via-danger/6 to-transparent',
    activeRing: 'ring-danger/45',
  },
  actor: {
    key: 'actor',
    // The stored value is 'Acting'. See the note at the top of this file.
    talent: 'Acting',
    displayName: 'Actor',
    description:
      'Share acting exercises, monologues, auditions, and stage or screen work.',
    circleLabel: 'Actor Circle',
    gradient: 'bg-gradient-to-br from-brand-sunburst/22 via-brand-sunburst/8 to-transparent',
    activeRing: 'ring-brand-sunburst/50',
  },
  theater: {
    key: 'theater',
    talent: 'Theater',
    displayName: 'Theater',
    description:
      'Explore stagecraft, productions, rehearsals, and collaborative storytelling.',
    circleLabel: 'Theater Circle',
    gradient: 'bg-gradient-to-br from-foreground/12 via-foreground/5 to-transparent',
    activeRing: 'ring-foreground/30',
  },
};

/** Display order: Dancer, Singer, Actor, Theater. */
export const TALENT_KEYS: readonly TalentKey[] = [
  'dancer',
  'singer',
  'actor',
  'theater',
] as const;

export const TALENT_BANNERS: readonly TalentBanner[] = TALENT_KEYS.map(
  (key) => talentBanners[key]
);

/** Stored community slug -> display key. */
const COMMUNITY_TO_KEY: Record<Community, TalentKey> = {
  Dancer: 'dancer',
  Singer: 'singer',
  Acting: 'actor',
  Theater: 'theater',
};

export function talentKeyFor(community: Community | null | undefined): TalentKey | null {
  return community ? COMMUNITY_TO_KEY[community] ?? null : null;
}

export function bannerFor(key: TalentKey): TalentBanner {
  return talentBanners[key];
}