import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/publicProfile';

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

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
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

function toDirectoryUser(row: ProfileRow, counts: Map<string, number>): DirectoryUser {
  return {
    id: row.id,
    firstname: row.firstname,
    lastname: row.lastname,
    username: row.username,
    photo_url: row.photo_url,
    role: row.role,
    city_name: row.city_name,
    province_name: row.province_name,
    account_verified: row.account_verified,
    created_at: row.created_at,
    followerCount: counts.get(row.id) ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const q = (sp.get('q') ?? '').trim();
    const role = sp.get('role') ?? 'all';
    const sort = sp.get('sort') ?? 'followers';
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
    if (q) {
      const needle = `%${escapeLike(q)}%`;
      base = base.or(
        `firstname.ilike.${needle},lastname.ilike.${needle},username.ilike.${needle}`
      );
    }

    // ── "Top followed": the six most-followed members, independent of filters. ──
    if (topOnly) {
      const { data: all, error } = await base.order('created_at', { ascending: false }).limit(100);
      if (error) {
        return NextResponse.json({ users: [], error: error.message }, { status: 500 });
      }
      const rows = (all ?? []) as unknown as ProfileRow[];
      const counts = await tallyFollowers(
        supabase,
        rows.map((u) => u.id)
      );
      const users = rows
        .map((u) => toDirectoryUser(u, counts))
        .sort((a, b) => b.followerCount - a.followerCount || a.firstname.localeCompare(b.firstname))
        .slice(0, 6);
      return NextResponse.json({ users, viewerId });
    }

    // ── "Most followers" sort needs the counts globally before a page can be
    //    cut, so all matching ids are collected first. ──
    if (sort === 'followers') {
      const { data: all, error } = await base.limit(1000);
      if (error) {
        return NextResponse.json({ users: [], error: error.message }, { status: 500 });
      }
      const rows = (all ?? []) as unknown as ProfileRow[];
      const counts = await tallyFollowers(
        supabase,
        rows.map((u) => u.id)
      );
      const ranked = rows
        .map((u) => toDirectoryUser(u, counts))
        .sort((a, b) => b.followerCount - a.followerCount || a.firstname.localeCompare(b.firstname));

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
      return NextResponse.json({ users: [], error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as ProfileRow[];
    const counts = await tallyFollowers(
      supabase,
      rows.map((u) => u.id)
    );

    return NextResponse.json({
      users: rows.map((u) => toDirectoryUser(u, counts)),
      total: count ?? rows.length,
      page: requestedPage,
      pageSize,
      hasMore: start + rows.length < (count ?? 0),
      viewerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ users: [], error: message }, { status: 500 });
  }
}