/**
 * The four Community Showcase communities.
 *
 * The database is the authority for which community a user belongs to — see
 * `public.my_community()` in supabase/community_feed.sql, which reads the user's
 * own profile. This module mirrors that mapping so the UI can label things
 * without a round trip, and so the two vocabularies cannot drift.
 *
 * WHY THE MAPPING IS TOLERANT
 *   A user's community comes from `client_profiles.talent` /
 *   `coach_profiles.talents`, which are free-text columns holding 'Dance'.
 *   The communities are named Dancer / Singer / Acting / Theater. Rather than
 *   rewriting real profile data (which the Coach directory filters on), both
 *   spellings resolve to the same slug here and in SQL.
 *
 * MATCHES THE SQL EXACTLY
 *   `community_slug()` uses prefix matching, in this order. Any change must be
 *   made in both places or members will see an empty feed.
 */

import type { Profile } from '@/lib/types';

export type Community = 'Dancer' | 'Singer' | 'Acting' | 'Theater';

export const COMMUNITIES: readonly Community[] = [
  'Dancer',
  'Singer',
  'Acting',
  'Theater',
] as const;

/**
 * Map a free-text talent value onto a community slug.
 *
 * Prefix matching, same order as the SQL function, so `'dancing'` and `'Dancer'`
 * both land on `Dancer`. Returns null when unrecognised — the caller must then
 * say so honestly rather than silently posting into the wrong community, which
 * RLS would refuse anyway.
 */
export function communitySlug(value: string | null | undefined): Community | null {
  const v = (value ?? '').trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith('danc')) return 'Dancer';
  if (v.startsWith('sing')) return 'Singer';
  if (v.startsWith('act')) return 'Acting';
  if (v.startsWith('theat') || v.startsWith('drama')) return 'Theater';
  return null;
}

/** Narrow a stored value that is already expected to be a canonical slug. */
export function isCommunity(value: unknown): value is Community {
  return typeof value === 'string' && (COMMUNITIES as readonly string[]).includes(value);
}

/**
 * The community a signed-in member belongs to.
 *
 * `talent` / `talents` are passed in rather than fetched here: both dashboards
 * already hold the profile row (and, on the coach side, the coach detail row)
 * by the time the feed renders, so re-querying would be a round trip for a value
 * that is already in hand.
 */
export function communityOf(
  profile: Profile | null | undefined,
  talent?: string | null
): Community | null {
  if (!profile || profile.role === 'admin') return null;
  return communitySlug(talent ?? null);
}

/**
 * A member whose talent is unset or unrecognised has no community.
 *
 * The UI must show this rather than defaulting them into the first community:
 * RLS compares `talent = my_community()`, so a guessed community would produce a
 * post the database then refuses to save.
 */
export function hasCommunity(profile: Profile | null | undefined, talent?: string | null) {
  return communityOf(profile, talent) !== null;
}
