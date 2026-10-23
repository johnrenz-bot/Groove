'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Trophy,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { AppHeader } from '@/components/header/AppHeader';
import { PageHeader } from '@/components/shared/SectionHeader';
import {
  UserListItem,
  UserListItemSkeleton,
  type UserListItemProps,
} from '@/components/shared/UserListItem';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import {
  fetchFollowingState,
  followProfile,
  unfollowProfile,
  type FollowPerson,
} from '@/lib/profileFollows';
import type { Profile } from '@/lib/types';
import { cn } from '@/components/shared/cn';
import { formatDate, getInitials } from '@/lib/utils';

/**
 * /users — the member directory, shared by coaches and clients.
 *
 * Data still comes from /api/users, which runs search, the role filter, the new
 * verification filter, sort and pagination server-side (PostgREST). This page
 * owns only the inputs, the view mode, and optimistic follow state. It still
 * never filters or sorts a client-side snapshot.
 *
 * WHAT IS NEW HERE, AND WHAT IS NOT
 *   New: a view toggle (grid / list), a verification filter, a live result
 *   summary, member-count stat tiles, and a card layout for wide screens.
 *   Unchanged on purpose: the route, the endpoint contract (the new `verified`
 *   parameter is optional and defaults to the previous behaviour), the follow
 *   round trip model (one query per page, never one per row), and
 *   `UserListItem`, which the follow-lists modal also renders. The list view IS
 *   that component — reusing it is what keeps the two surfaces identical.
 *
 * PRIVACY
 *   Rows carry only PUBLIC_PROFILE_COLUMNS. `status` is deliberately NOT shown:
 *   it is a presence signal, not a directory attribute, and the RLS on
 *   `public.profiles` is row-level, so requesting it would put every member's
 *   live presence in this endpoint's response for no editorial benefit.
 */

type RoleFilter = 'all' | 'coach' | 'client';
type VerifiedFilter = 'all' | 'yes' | 'no';
type SortKey = 'followers' | 'newest' | 'az';
type ViewMode = 'grid' | 'list';

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
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all');
  const [sort, setSort] = useState<SortKey>('followers');
  const [view, setView] = useState<ViewMode>('grid');

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
        url.searchParams.set('verified', verifiedFilter);
        url.searchParams.set('sort', sort);
        url.searchParams.set('page', String(pageToLoad));
        url.searchParams.set('pageSize', '20');
        const res = await fetch(url.toString());
        const body = (await res.json()) as ListResponse;
        if (!res.ok || body.error) {
          setError(body.error ?? `The directory could not be loaded (${res.status}).`);
          return;
        }
        const key = `${debouncedQuery}|${roleFilter}|${verifiedFilter}|${sort}|${viewerId ?? 'anon'}`;
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
    [debouncedQuery, roleFilter, verifiedFilter, sort, viewerId]
  );

  // Initial + query/filter/sort changes: always back to page one.
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

  /** Counts for the stat tiles, from what is actually loaded right now. */
  const stats = useMemo(() => {
    const coaches = users.filter((u) => u.role === 'coach').length;
    const clients = users.filter((u) => u.role === 'client').length;
    const verified = users.filter((u) => u.account_verified).length;
    return { coaches, clients, verified };
  }, [users]);

  const filtersActive = Boolean(debouncedQuery) || roleFilter !== 'all' || verifiedFilter !== 'all';

  const resetFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setVerifiedFilter('all');
    setSort('followers');
  };

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <AppHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-8 md:px-8 md:pt-10">
        <PageHeader
          eyebrow="Community"
          title="Members"
          description="Find coaches and performers around Groove. Search by name or username, filter by role, and follow the people whose work you want to see."
        />

        {/* ── Stat tiles. Derived from the loaded page, not a second query. ── */}
        {!loading && users.length > 0 && (
          <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Showing', value: users.length, hint: 'on this page' },
              {
                label: 'Total',
                value: typeof total === 'number' ? total : users.length,
                hint: filtersActive ? 'match your filters' : 'members',
              },
              { label: 'Coaches', value: stats.coaches, hint: 'on this page' },
              { label: 'Verified', value: stats.verified, hint: 'on this page' },
            ].map((tile) => (
              <div key={tile.label} className="g-card px-4 py-3">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {tile.label}
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">{tile.value}</dd>
                <p className="text-[10px] text-subtle-foreground">{tile.hint}</p>
              </div>
            ))}
          </dl>
        )}

        {/* ── Search + sort ── */}
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
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
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
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

          {/* View toggle */}
          <div
            role="group"
            aria-label="Change layout"
            className="flex h-[42px] items-center rounded-xl border border-border bg-muted/50 p-1"
          >
            {(
              [
                { value: 'grid', label: 'Cards', Icon: LayoutGrid },
                { value: 'list', label: 'List', Icon: ListIcon },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-pressed={view === value}
                aria-label={`${label} view`}
                title={`${label} view`}
                className={cn(
                  'flex h-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors',
                  view === value
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter by role"
            className="inline-flex rounded-xl border border-border bg-muted/50 p-1"
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

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filter by verification" className="flex gap-1.5">
              {(
                [
                  { value: 'all', label: 'Any' },
                  { value: 'yes', label: 'Verified' },
                  { value: 'no', label: 'Unverified' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={verifiedFilter === opt.value}
                  onClick={() => setVerifiedFilter(opt.value)}
                  className={cn(
                    'inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition',
                    verifiedFilter === opt.value
                      ? 'border-accent-border bg-accent-soft text-accent-text'
                      : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                  )}
                >
                  {opt.value === 'yes' && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                  {opt.label}
                </button>
              ))}
            </div>

            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-border-strong hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Top followed ── */}
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

        {/* ── Results ── */}
        {error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-2xl border border-danger/30 bg-danger-soft px-6 py-12 text-center"
          >
            <span className="text-sm text-danger">{error}</span>
            <Button
              size="sm"
              onClick={() => void loadPage(1, 'reset')}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Try again
            </Button>
          </div>
        ) : loading ? (
          view === 'grid' ? (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              role="status"
              aria-live="polite"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="g-card space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <span className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <span className="block h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                      <span className="block h-3 w-1/2 animate-pulse rounded bg-muted/70" />
                    </div>
                  </div>
                  <span className="block h-3 w-3/4 animate-pulse rounded bg-muted/70" />
                </div>
              ))}
            </div>
          ) : (
            <div className="g-card overflow-hidden" role="status" aria-live="polite">
              <ul className="divide-y divide-[var(--divider)] px-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <UserListItemSkeleton key={i} />
                ))}
              </ul>
            </div>
          )
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-subtle-foreground">
              <UsersIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">
              {debouncedQuery
                ? `No members match “${debouncedQuery}”.`
                : filtersActive
                  ? 'No members match these filters.'
                  : 'No members here yet — be the first to join the community.'}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground transition hover:bg-accent-hover"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                {typeof total === 'number'
                  ? `${total} member${total === 1 ? '' : 's'}`
                  : `${users.length} member${users.length === 1 ? '' : 's'}`}
              </span>
              {debouncedQuery && (
                <span className="text-xs text-muted-foreground">
                  results for “{debouncedQuery}”
                </span>
              )}
            </div>

            {view === 'grid' ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => {
                  const isSelf = viewerId !== null && user.id === viewerId;
                  const isFollowing = following.has(user.id);
                  const display =
                    `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() ||
                    user.username ||
                    'Groove member';
                  const location = [user.city_name, user.province_name].filter(Boolean).join(', ');

                  return (
                    <li
                      key={user.id}
                      className="g-card flex flex-col p-5 transition-colors hover:border-accent-border"
                    >
                      <div className="flex items-start gap-3">
                        <Link
                          href={`/userprofile/${user.id}`}
                          aria-label={`View ${display}'s profile`}
                          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-bold text-accent-text">
                            {user.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              getInitials(user.firstname ?? 'G', user.lastname ?? 'M')
                            )}
                          </span>
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/userprofile/${user.id}`}
                            className="truncate text-sm font-bold text-foreground hover:text-accent-text hover:underline hover:underline-offset-4"
                          >
                            {display}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={user.role === 'coach' ? 'accent' : 'neutral'}
                              className="text-[10px]"
                            >
                              {user.role === 'coach' ? 'Coach' : 'Client'}
                            </Badge>
                            {user.account_verified && (
                              <Badge variant="confirmed" className="text-[10px]">
                                <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                                Verified
                              </Badge>
                            )}
                            {isSelf && (
                              <Badge variant="neutral" className="text-[10px]">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <dl className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
                        {user.username && (
                          <div className="flex items-center gap-1.5">
                            <dt className="sr-only">Username</dt>
                            <dd className="truncate font-medium">@{user.username}</dd>
                          </div>
                        )}
                        {location && (
                          <div className="flex items-center gap-1.5">
                            <dt className="sr-only">Location</dt>
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <dd className="truncate">{location}</dd>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <dt className="sr-only">Statistics</dt>
                          <dd className="tabular-nums">
                            {user.followerCount} follower{user.followerCount === 1 ? '' : 's'}
                          </dd>
                          <dd className="tabular-nums text-subtle-foreground">
                            Joined {formatDate(user.created_at)}
                          </dd>
                        </div>
                      </dl>

                      {/* The follow control sits OUTSIDE the profile link: a button
                          inside an anchor is invalid nesting and cannot be
                          reliably clicked. Same rule as UserListItem. */}
                      {viewerId && !isSelf && (
                        <div className="mt-4 border-t border-divider pt-3">
                          <Button
                            size="sm"
                            variant={isFollowing ? 'outline' : 'primary'}
                            loading={busyId === user.id}
                            onClick={() => void onToggleFollow(user)}
                            icon={<UserPlus className="h-3.5 w-3.5" />}
                            className="w-full"
                          >
                            {busyId === user.id
                              ? 'Updating…'
                              : isFollowing
                                ? 'Following'
                                : 'Follow'}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="g-card overflow-hidden">
                <ul className="divide-y divide-[var(--divider)] px-5">
                  {users.map((user) => (
                    <UserListItem key={user.id} {...rowProps(user)} />
                  ))}
                </ul>
              </div>
            )}

            {loadingMore && (
              <div className="mt-4 flex justify-center" role="status" aria-live="polite">
                <Loader2 className="h-5 w-5 animate-spin text-accent-text" aria-hidden="true" />
                <span className="sr-only">Loading more members</span>
              </div>
            )}

            {hasMore && (
              <div className="mt-5 border-t border-divider pt-4 text-center">
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
          </>
        )}

        {toggleError && (
          <p role="alert" className="mt-4 text-xs text-danger">
            {toggleError}
          </p>
        )}

        {viewerProfile && !loading && users.length > 0 && (
          <p className="mt-8 text-center text-[11px] text-subtle-foreground">
            Showing public profile information only. Contact details stay private.
          </p>
        )}
      </main>
    </div>
  );
}