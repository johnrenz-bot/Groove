import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/publicProfile';
import { buildOrContains } from '@/lib/postgrest';
import { maskUsername } from '@/lib/masking';

/**
 * GET /api/users — the Users directory data source.
 *
 * Everything a member can control (search, role filter, sort, pagination, the
 * "Top followed" panel) runs HERE, against PostgREST, with the visitor's own
 * session — the page never filters or sorts a client-side snapshot.
 *
 * PRIVACY
 * Profiles are selected through `PUBLIC_PROFILE_COLUMNS` only. The profiles
 * RLS policy is row-level, so email/phone/birthdate/street are readable by any
 * client that asks; this endpoint never asks. The signed-in viewer's id is
 * returned so the UI can mark their own row "You" instead of dropping it.
 *
 * COST
 * Follower counts are tallied from public.profile_follows in this handler —
 * no new table, no view, no migration required. The "Most followers" sort
 * needs every matching edge id, so it reads the whole edges list once; fine at
 * this app's scale. A DB view could do it in SQL later if the graph grows.
 */

export const dynamic = 'force-dynamic';

/** The public row shape PostgREST returns for PUBLIC_PROFILE_COLUMNS. */
interface ProfileRow {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  photo_url: string | null;
  role: string;
  city_name: string | null;
  province_name: string | null;
  account_verified: boolean;
  created_at: string;
}

export interface DirectoryUser extends ProfileRow {
  followerCount: number;
}

interface FollowEdgeRow {
  following_id: string;
}



async function tallyFollowers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  // Chunked so a 20-50 id page never builds an over-long `in.(...)` parameter.
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const { data, error } = await supabase
      .from('profile_follows')
      .select('following_id')
      .in('following_id', chunk);
    if (error) continue;
    for (const row of (data ?? []) as unknown as FollowEdgeRow[]) {
      counts.set(row.following_id, (counts.get(row.following_id) ?? 0) + 1);
    }
  }
  return counts;
}

function toDirectoryUser(row: ProfileRow, counts: Map<string, number>, viewerId?: string | null): DirectoryUser {
  return {
    id: row.id,
    firstname: row.firstname,
    lastname: row.lastname,
    username: viewerId && viewerId === row.id ? row.username : maskUsername(row.username),
    photo_url: row.photo_url,
    role: row.role,
    city_name: row.city_name,
    province_name: row.province_name,
    account_verified: row.account_verified,
    created_at: row.created_at,
    followerCount: counts.get(row.id) ?? 0,
  };
}

/**
 * Short-lived in-memory cache for the "followers" sort.
 *
 * Building that page needs the whole filtered directory (≤1000 rows) plus a
 * tally over the follow edges — the most expensive read this route performs,
 * and the DEFAULT sort. The aggregation does not vary per viewer, so the
 * pre-mask ranked list (rows + counts, never emails) is memoised for 60s.
 * `toDirectoryUser` still applies username masking per request with the
 * caller's viewerId, so nothing viewer-specific is cached. Bounded to 32
 * distinct filter keys; entries expire 60s after they were computed.
 */
interface PreparedRow {
  row: ProfileRow;
  followerCount: number;
}
const followersCache = new Map<string, { at: number; rows: PreparedRow[] }>();
const FOLLOWERS_CACHE_TTL_MS = 60_000;
const FOLLOWERS_CACHE_MAX = 32;

function followersCacheGet(key: string): PreparedRow[] | null {
  const hit = followersCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > FOLLOWERS_CACHE_TTL_MS) {
    followersCache.delete(key);
    return null;
  }
  // Refresh recency so the cap behaves as a simple LRU.
  followersCache.delete(key);
  followersCache.set(key, hit);
  return hit.rows;
}

function followersCacheSet(key: string, rows: PreparedRow[]): void {
  if (followersCache.size >= FOLLOWERS_CACHE_MAX) {
    const oldest = followersCache.keys().next().value;
    if (oldest !== undefined) followersCache.delete(oldest);
  }
  followersCache.set(key, { at: Date.now(), rows });
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const q = (sp.get('q') ?? '').trim();
    const role = sp.get('role') ?? 'all';
    const sort = sp.get('sort') ?? 'followers';
    const verified = sp.get('verified') ?? 'all';
    const requestedPage = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(sp.get('pageSize') ?? '20', 10) || 20));
    const topOnly = sp.get('top') === '1';

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const viewerId = authData?.user?.id ?? null;

    const cols = PUBLIC_PROFILE_COLUMNS.join(', ');

    // Base query: public columns, members only (admins have no public face).
    // `count: 'exact'` on the original select means the paginated read below
    // returns the total alongside the page.
    let base = supabase.from('profiles').select(cols, { count: 'exact' }).neq('role', 'admin');

    if (role === 'coach' || role === 'client') {
      base = base.eq('role', role);
    }
    // Verification filter. `account_verified` is already in PUBLIC_PROFILE_COLUMNS,
    // so this adds no new column to the response and leaks nothing — it only
    // narrows rows the caller was already entitled to read. Anything other than
    // 'yes'/'no' is ignored rather than treated as a filter, so an old client
    // sending no parameter keeps the previous unfiltered behaviour.
    if (verified === 'yes') {
      base = base.eq('account_verified', true);
    } else if (verified === 'no') {
      base = base.eq('account_verified', false);
    }
    if (q) {
      // Built with the shared PostgREST escaping helper rather than string
      // concatenation. `.or()` takes raw filter grammar: a `q` containing a
      // comma or a closing paren used to end the filter early and start a new
      // one, on an endpoint that needs no authentication. See lib/postgrest.ts.
      base = base.or(
        buildOrContains(['firstname', 'lastname', 'username'], q)
      );
    }

    // ── "Top followed": the six most-followed members, independent of filters. ──
    if (topOnly) {
      const { data: all, error } = await base.order('created_at', { ascending: false }).limit(100);
      if (error) {
        console.error('[users] Supabase error:', error.message);
        return NextResponse.json({ users: [], error: 'Failed to load users.' }, { status: 500 });
      }
      const rows = (all ?? []) as unknown as ProfileRow[];
      const counts = await tallyFollowers(
        supabase,
        rows.map((u) => u.id)
      );
      const users = rows
        .map((u) => toDirectoryUser(u, counts, viewerId))
        .sort((a, b) => b.followerCount - a.followerCount || a.firstname.localeCompare(b.firstname))
        .slice(0, 6);
      return NextResponse.json({ users, viewerId });
    }

    // ── "Most followers" sort needs the counts globally before a page can be
    //    cut, so all matching ids are collected first. ──
    if (sort === 'followers') {
      const cacheKey = `followers|${q}|${role}|${verified}`;
      const cached = followersCacheGet(cacheKey);
      let prepared: PreparedRow[];
      if (cached) {
        prepared = cached;
      } else {
        const { data: all, error } = await base.limit(1000);
        if (error) {
          console.error('[users] Supabase error:', error.message);
          return NextResponse.json({ users: [], error: 'Failed to load users.' }, { status: 500 });
        }
        const rows = (all ?? []) as unknown as ProfileRow[];
        const counts = await tallyFollowers(
          supabase,
          rows.map((u) => u.id)
        );
        prepared = rows
          .map((row) => ({ row, followerCount: counts.get(row.id) ?? 0 }))
          .sort((a, b) => b.followerCount - a.followerCount || a.row.firstname.localeCompare(b.row.firstname));
        followersCacheSet(cacheKey, prepared);
      }

      const ranked = prepared.map(({ row, followerCount }) => ({
        ...toDirectoryUser(row, new Map([[row.id, followerCount]]), viewerId),
        followerCount,
      }));

      const start = (requestedPage - 1) * pageSize;
      const pageRows = ranked.slice(start, start + pageSize);
      return NextResponse.json({
        users: pageRows,
        total: ranked.length,
        page: requestedPage,
        pageSize,
        hasMore: start + pageSize < ranked.length,
        viewerId,
      });
    }

    // ── Newest / A-Z sorts can be pushed down to Postgres. ──
    const ordered =
      sort === 'newest'
        ? base.order('created_at', { ascending: false })
        : base.order('firstname', { ascending: true }).order('lastname', { ascending: true });

    const start = (requestedPage - 1) * pageSize;
    const { data, count, error } = await ordered.range(start, start + pageSize - 1);
    if (error) {
      console.error('[users] Supabase error:', error.message);
      return NextResponse.json({ users: [], error: 'Failed to load users.' }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as ProfileRow[];
    const counts = await tallyFollowers(
      supabase,
      rows.map((u) => u.id)
    );

    return NextResponse.json({
      users: rows.map((u) => toDirectoryUser(u, counts, viewerId)),
      total: count ?? rows.length,
      page: requestedPage,
      pageSize,
      hasMore: start + rows.length < (count ?? 0),
      viewerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[users] Unexpected error:', message);
    return NextResponse.json({ users: [], error: 'Failed to load users.' }, { status: 500 });
  }
}