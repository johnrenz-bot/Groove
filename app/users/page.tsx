'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Search, Trophy, Users as UsersIcon } from 'lucide-react';
import { AppHeader } from '@/components/shared/Navbar';
import { PageHeader } from '@/components/shared/SectionHeader';
import {
  UserListItem,
  UserListItemSkeleton,
  type UserListItemProps,
} from '@/components/shared/UserListItem';
import { createClient } from '@/lib/supabase/client';
import {
  fetchFollowingState,
  followProfile,
  unfollowProfile,
  type FollowPerson,
} from '@/lib/profileFollows';
import type { Profile } from '@/lib/types';
import { cn } from '@/components/shared/cn';

/**
 * /users — the member directory, shared by coaches and clients.
 *
 * Data comes from /api/users, which runs the search, role filter, sort and
 * pagination server-side (PostgREST) — this page only owns the input and the
 * optimistic follow state. The search input is debounced so a keystroke does
 * not fire a request; every query change resets to page one.
 *
 * Rows use the same <UserListItem> as the follow-lists modal, and follow
 * state is loaded in one round trip per page via fetchFollowingState, so a
 * page never fires one query per row.
 */

type RoleFilter = 'all' | 'coach' | 'client';
type SortKey = 'followers' | 'newest' | 'az';

interface DirectoryUser extends FollowPerson {
  created_at: string;
  followerCount: number;
}

interface ListResponse {
  users: DirectoryUser[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  viewerId?: string | null;
  error?: string;
}

export default function UsersDirectoryPage() {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<'client' | 'coach' | 'admin'>('client');
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sort, setSort] = useState<SortKey>('followers');

  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topUsers, setTopUsers] = useState<DirectoryUser[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  /** Viewer's follow state for the loaded rows, as a Set of ids. */
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const fetchedFollowingFor = useRef<string | null>(null);

  // Identity for the header, once. Own row → full read is fine (own data),
  // matching how the public profile page resolves the viewer.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data?.user || cancelled) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (!profile || cancelled) return;
      setViewerId(profile.id);
      setViewerProfile(profile as Profile);
      if (profile.role === 'coach' || profile.role === 'client' || profile.role === 'admin') {
        setViewerRole(profile.role);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce the search box.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadPage = useCallback(
    async (pageToLoad: number, mode: 'reset' | 'more') => {
      if (mode === 'reset') {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      setToggleError(null);

      try {
        const url = new URL('/api/users', window.location.origin);
        url.searchParams.set('q', debouncedQuery);
        url.searchParams.set('role', roleFilter);
        url.searchParams.set('sort', sort);
        url.searchParams.set('page', String(pageToLoad));
        url.searchParams.set('pageSize', '20');
        const res = await fetch(url.toString());
        const body = (await res.json()) as ListResponse;
        if (!res.ok || body.error) {
          setError(body.error ?? `The directory could not be loaded (${res.status}).`);
          return;
        }
        const key = `${debouncedQuery}|${roleFilter}|${sort}|${viewerId ?? 'anon'}`;
        if (mode === 'reset' || fetchedFollowingFor.current !== key) {
          fetchedFollowingFor.current = key;
          setFollowing(await fetchFollowingState(viewerId ?? '', body.users.map((u) => u.id)));
        } else {
          const more = await fetchFollowingState(viewerId ?? '', body.users.map((u) => u.id));
          setFollowing((prev) => new Set([...prev, ...more]));
        }
        setUsers((prev) => (mode === 'reset' ? body.users : [...prev, ...body.users]));
        setTotal(body.total ?? null);
        setHasMore(Boolean(body.hasMore));
        setPage(pageToLoad);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The directory could not be loaded.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedQuery, roleFilter, sort, viewerId]
  );

  {/* Initial + query/filter/sort changes: always back to page one. */}
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage(1, 'reset');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

  // "Top followed" panel, independent of the active filters.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/users?top=1');
        const body = (await res.json()) as ListResponse;
        if (!cancelled && !body.error) setTopUsers(body.users);
      } catch {
        // The panel is optional chrome; a failure must not break the page.
      } finally {
        if (!cancelled) setTopLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Optimistic follow/unfollow on a row, reconciled with the database. */
  const onToggleFollow = async (person: FollowPerson) => {
    if (!viewerId || busyId || person.id === viewerId) return;
    const wasFollowing = following.has(person.id);
    setBusyId(person.id);
    setToggleError(null);

    const next = new Set(following);
    if (wasFollowing) next.delete(person.id);
    else next.add(person.id);
    setFollowing(next);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === person.id
          ? { ...u, followerCount: Math.max(0, u.followerCount + (wasFollowing ? -1 : 1)) }
          : u
      )
    );

    const result = wasFollowing
      ? await unfollowProfile(viewerId, person.id)
      : await followProfile(viewerId, person.id);

    if (result.ok) {
      setFollowing((prev) => {
        const reconciled = new Set(prev);
        if (wasFollowing) reconciled.delete(person.id);
        else reconciled.add(person.id);
        return reconciled;
      });
    } else {
      setFollowing((prev) => {
        const reverted = new Set(prev);
        if (wasFollowing) reverted.add(person.id);
        else reverted.delete(person.id);
        return reverted;
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === person.id
            ? { ...u, followerCount: Math.max(0, u.followerCount + (wasFollowing ? 1 : -1)) }
            : u
        )
      );
      setToggleError(
        result.reason === 'missing-table'
          ? 'Following is not enabled on this deployment yet.'
          : (result.message ?? 'That did not work. Please try again.')
      );
    }
    setBusyId(null);
  };

  const rowProps = (user: DirectoryUser): UserListItemProps => {
    const isSelf = viewerId !== null && user.id === viewerId;
    return {
      person: user,
      following: isSelf ? null : following.has(user.id),
      busy: busyId === user.id,
      showFollowerCount: true,
      isYou: isSelf,
      onToggleFollow:
        viewerId && !isSelf ? () => void onToggleFollow(user) : undefined,
    };
  };

  const roleTabs: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'coach', label: 'Coaches' },
    { value: 'client', label: 'Clients' },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <AppHeader
        role={viewerRole}
        user={viewerProfile ?? undefined}
        userRole={viewerRole}
      />

      <main className="mx-auto max-w-4xl px-4 pt-8 md:px-8 md:pt-10">
        <PageHeader
          eyebrow="Community"
          title="Members"
          description="Find coaches and performers around Groove. Search by name or username, filter by role, and follow the people whose work you want to see."
        />

        {/* Search + role tabs + sort */}
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or @username…"
              aria-label="Search members"
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-border focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort members"
            className="h-[42px] cursor-pointer rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground focus:border-accent-border focus:outline-none focus:ring-2 focus:ring-accent/25"
          >
            <option value="followers">Most followers</option>
            <option value="newest">Newest</option>
            <option value="az">A–Z</option>
          </select>
        </div>

        <div
          role="tablist"
          aria-label="Filter by role"
          className="mb-6 inline-flex rounded-xl border border-border bg-muted/50 p-1"
        >
          {roleTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={roleFilter === tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={cn(
                'cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold transition-colors',
                roleFilter === tab.value
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top followed */}
        {topUsers.length > 0 && !query && roleFilter === 'all' && (
          <section className="g-card mb-6 overflow-hidden" aria-label="Top followed members">
            <h2 className="flex items-center gap-2 border-b border-divider px-5 py-4 text-sm font-bold tracking-[-0.01em] text-foreground">
              <Trophy className="h-4 w-4 text-warning" aria-hidden="true" />
              Top followed
            </h2>
            <ul className="divide-y divide-[var(--divider)] px-5">
              {topUsers.slice(0, 5).map((user) => (
                <UserListItem key={user.id} {...rowProps(user)} />
              ))}
            </ul>
          </section>
        )}
        {topLoading && !error && (
          <div className="g-card mb-6 overflow-hidden" aria-hidden="true">
            <div className="h-12 animate-pulse border-b border-divider bg-muted/60" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-b border-divider px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <span className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Directory */}
        {error ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center">
            <span className="text-sm text-muted-foreground">{error}</span>
            <button
              type="button"
              onClick={() => void loadPage(1, 'reset')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground transition hover:bg-accent-hover"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="g-card overflow-hidden">
            <ul className="divide-y divide-[var(--divider)] px-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <UserListItemSkeleton key={i} />
              ))}
            </ul>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-subtle-foreground">
              <UsersIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">
              {query
                ? `No members match “${debouncedQuery}”.`
                : 'No members here yet — be the first to join the community.'}
            </p>
          </div>
        ) : (
          <div className="g-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-divider px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                {typeof total === 'number' ? `${total} member${total === 1 ? '' : 's'}` : 'Members'}
              </span>
              {debouncedQuery && (
                <span className="text-xs text-muted-foreground">
                  results for “{debouncedQuery}”
                </span>
              )}
            </div>
            <ul className="divide-y divide-[var(--divider)] px-5">
              {users.map((user) => (
                <UserListItem key={user.id} {...rowProps(user)} />
              ))}
              {loadingMore &&
                [0, 1].map((i) => <UserListItemSkeleton key={`more-${i}`} />)}
            </ul>

            {hasMore && (
              <div className="border-t border-divider py-4 text-center">
                <button
                  type="button"
                  onClick={() => void loadPage(page + 1, 'more')}
                  disabled={loadingMore}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent-border hover:bg-muted disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}

        {toggleError && (
          <p role="alert" className="mt-4 text-xs text-danger">
            {toggleError}
          </p>
        )}
      </main>
    </div>
  );
}