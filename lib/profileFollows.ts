'use client';

import { createClient } from '@/lib/supabase/client';
import { FOLLOW_PERSON_COLUMNS } from '@/lib/publicProfile';

/**
 * Profile follows — one shared implementation for admin, coach and client.
 *
 * DATA MODEL
 * Edges live in public.profile_follows (see supabase/migrations/
 * 09_profile_follows.sql). Nothing about follows is stored on public.profiles:
 * the profile table is not altered, and follower identities exist only as rows
 * in the relationship table. Counts are always DERIVED by counting rows, never
 * read from a cached column, so a count can never drift from the edges.
 *
 * SELF-FOLLOW
 * Blocked in two independent places, because either alone is insufficient:
 *   - public.profile_follows_no_self_follow CHECK (follower_id <> following_id)
 *     in the database, so a direct PostgREST call cannot bypass it;
 *   - the guard in followProfile() below, so the UI never even attempts it and
 *     does not surface a raw Postgres error to the user.
 *
 * DUPLICATE FOLLOWS
 * The primary key is (follower_id, following_id) and followProfile uses
 * ON CONFLICT DO NOTHING, so following someone twice is a no-op rather than an
 * error or a second row. The count therefore cannot double-count.
 *
 * MISSING TABLE
 * The migration is applied out of band, so this module must not explode if the
 * table is missing. Every read returns a neutral result and every write returns
 * a typed failure, and `followsTableMissing()` reports which case occurred so
 * the UI can say something honest instead of silently showing zero.
 */

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowPerson {
  id: string;
  firstname: string | null;
  lastname: string | null;
  username: string | null;
  photo_url: string | null;
  role: string | null;
  city_name?: string | null;
  province_name?: string | null;
  account_verified?: boolean;
}

const TABLE = 'profile_follows';

/** PostgREST reports an undefined table as PGRST205 (schema cache) or 42P01. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42P01') return true;
  return /profile_follows|does not exist|not found in the schema cache/i.test(
    error.message ?? ''
  );
}

/** True when the failure was the relationship table not existing yet. */
export function followsTableMissing(
  error: { code?: string; message?: string } | null
): boolean {
  return isMissingTable(error);
}

/**
 * Follower and following counts for a profile.
 *
 * Both are exact counts with no row payload (`head: true`), so this transfers
 * two integers rather than the graph. Any failure resolves to zeros: a wrong
 * count is a much smaller defect than an unhandled rejection in a header.
 */
export async function fetchFollowCounts(
  profileId: string
): Promise<FollowCounts & { missingTable: boolean }> {
  if (!profileId) return { followers: 0, following: 0, missingTable: false };
  const supabase = createClient();

  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileId),
  ]);

  // A missing table is reported rather than collapsed to zero. Zero followers
  // is a real, meaningful state; rendering it because the table does not exist
  // would be a confident lie, and it is indistinguishable to the user.
  if (isMissingTable(followersRes.error) || isMissingTable(followingRes.error)) {
    return { followers: 0, following: 0, missingTable: true };
  }

  return {
    followers: followersRes.error ? 0 : (followersRes.count ?? 0),
    following: followingRes.error ? 0 : (followingRes.count ?? 0),
    missingTable: false,
  };
}

/** Whether `viewerId` already follows `profileId`. */
export async function fetchIsFollowing(
  viewerId: string,
  profileId: string
): Promise<boolean> {
  if (!viewerId || !profileId || viewerId === profileId) return false;
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('follower_id')
    .eq('follower_id', viewerId)
    .eq('following_id', profileId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/**
 * List the people on one side of the relationship.
 *
 * PostgREST cannot join an arbitrary embedded resource through a
 * many-to-many relationship without a FK hint, so this reads the edge UUIDs
 * first and then fetches the profiles in one second query. Two round trips,
 * no N+1, and no view or function required in the database.
 *
 * PAGES: pass `page`/`pageSize` to page through the edges. The list is capped
 * at whatever the caller asks for; `hasMore` is a heuristic (a full page
 * means a next page probably exists), which is all an infinite scroll needs.
 */
export async function fetchFollowList(
  profileId: string,
  side: 'followers' | 'following',
  opts?: { page?: number; pageSize?: number }
): Promise<{ people: FollowPerson[]; missingTable: boolean; hasMore: boolean }> {
  if (!profileId) return { people: [], missingTable: false, hasMore: false };
  const supabase = createClient();

  const page = Math.max(0, opts?.page ?? 0);
  const pageSize = Math.min(50, Math.max(1, opts?.pageSize ?? 30));

  // Two roles for the two columns. `anchor` is the profile the list is ABOUT
  // (the filter column); `peopleCol` is the OTHER endpoint of each edge — the
  // people actually filling the list. Extracting the anchor would return the
  // profile itself as its own follower/following entry.
  const anchor = side === 'followers' ? 'following_id' : 'follower_id';
  const peopleCol = side === 'followers' ? 'follower_id' : 'following_id';

  const { data: edges, error } = await supabase
    .from(TABLE)
    .select(`${peopleCol}`)
    .eq(anchor, profileId)
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (error) {
    return { people: [], missingTable: isMissingTable(error), hasMore: false };
  }

  // PostgREST returns a differently-shaped object per selected column, so the
  // union cannot be indexed by a variable. Widening to a record is honest here:
  // the value is a UUID string either way.
  const ids = [
    ...new Set(
      (edges ?? [])
        .map((r) => (r as Record<string, unknown>)[peopleCol])
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    ),
  ];
  if (ids.length === 0) return { people: [], missingTable: false, hasMore: false };

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select(FOLLOW_PERSON_COLUMNS.join(', '))
    .in('id', ids);

  if (profileErr) return { people: [], missingTable: false, hasMore: false };

  return {
    people: (profiles ?? []) as unknown as FollowPerson[],
    missingTable: false,
    hasMore: (edges ?? []).length === pageSize,
  };
}

/**
 * Which of `profileIds` the viewer currently follows, as a Set of ids.
 *
 * One round trip for a whole list, so a modal or directory never fires one
 * `fetchIsFollowing` per row. Edge rows are tiny (two UUIDs), so the read is
 * cheap even at a page of 30-50 people.
 */
export async function fetchFollowingState(
  viewerId: string,
  profileIds: string[]
): Promise<Set<string>> {
  if (!viewerId || profileIds.length === 0) return new Set();
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('following_id')
    .eq('follower_id', viewerId)
    .in('following_id', profileIds);
  if (error) return new Set();
  return new Set(
    (data ?? [])
      .map((r) => r.following_id)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
  );
}

export type FollowResult =
  | { ok: true }
  | { ok: false; reason: 'self' | 'missing-table' | 'error'; message?: string };

/** Create the edge. Idempotent: following twice is a no-op, not an error. */
export async function followProfile(
  viewerId: string,
  profileId: string
): Promise<FollowResult> {
  if (!viewerId) return { ok: false, reason: 'error', message: 'You need to sign in first.' };
  if (!profileId) return { ok: false, reason: 'error', message: 'Unknown profile.' };
  if (viewerId === profileId) {
    return { ok: false, reason: 'self', message: "You can't follow your own profile." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from(TABLE)
    .insert({ follower_id: viewerId, following_id: profileId });

  if (error) {
    if (isMissingTable(error)) return { ok: false, reason: 'missing-table' };
    // 23505 = unique violation, which means the edge already existed. Treat as
    // success: the desired state is reached either way.
    if (error.code === '23505') return { ok: true };
    return { ok: false, reason: 'error', message: error.message };
  }
  return { ok: true };
}

/** Remove the edge. Deleting a non-existent edge is also a success. */
export async function unfollowProfile(
  viewerId: string,
  profileId: string
): Promise<FollowResult> {
  if (!viewerId) return { ok: false, reason: 'error', message: 'You need to sign in first.' };
  if (!profileId) return { ok: false, reason: 'error', message: 'Unknown profile.' };

  const supabase = createClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('follower_id', viewerId)
    .eq('following_id', profileId);

  if (error) {
    if (isMissingTable(error)) return { ok: false, reason: 'missing-table' };
    return { ok: false, reason: 'error', message: error.message };
  }
  return { ok: true };
}
