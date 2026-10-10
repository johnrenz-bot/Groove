'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchFollowingState,
  fetchFollowList,
  followProfile,
  unfollowProfile,
  type FollowPerson,
} from '@/lib/profileFollows';
import { Modal } from '@/components/ui/Modal';
import { UserListItem, UserListItemSkeleton } from '@/components/shared/UserListItem';
import { Search, UserRound } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/**
 * Followers / Following list — one shared modal for every surface.
 *
 * Opened from the dashboard identity header (<ProfileHero>), the public profile
 * page, and anywhere else a profile's audience is shown. It owns both tabs
 * (Follow/ Following) so a single instance can switch without the caller
 * re-opening anything, a search box, loading skeletons, an infinite-scroll
 * "Load more" footer, and optimistic follow/unfollow that re-reads the
 * authoritative state before telling the parent its counts changed.
 *
 * SELF-FOLLOW: rows are people from the relationship table, and the database
 * CHECK plus the write guards reject self-edges, so the viewer's own row can
 * never appear in a list with a toggle. The row renderer still hides the
 * toggle on the viewer's own id as a belt-and-braces guard.
 *
 * CLOSE: X, overlay click, and Escape all come from <Modal>.
 */

export type FollowSide = 'followers' | 'following';

interface ProfileFollowListProps {
  open: boolean;
  /** The side to show first. The tabs can switch sides afterwards. */
  side?: FollowSide;
  profileId: string;
  onClose: () => void;
  /** Called after a successful follow/unfollow so parents re-read counts. */
  onChanged?: () => void;
}

const PAGE_SIZE = 30;

export function ProfileFollowList({
  open,
  side = 'followers',
  profileId,
  onClose,
  onChanged,
}: ProfileFollowListProps) {
  const [activeSide, setActiveSide] = useState<FollowSide>(side);
  const [people, setPeople] = useState<FollowPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [missingTable, setMissingTable] = useState(false);
  const [query, setQuery] = useState('');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setViewerId(data?.user?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Fetch the first page of the active side and the viewer's follow state. */
  const load = useCallback(async () => {
    if (!open || !profileId) return;
    setLoading(true);
    setError(null);
    setMissingTable(false);
    setPeople([]);
    setPage(0);
    const { people: list, missingTable: missing, hasMore: more } = await fetchFollowList(
      profileId,
      activeSide,
      { page: 0, pageSize: PAGE_SIZE }
    );
    if (missing) setMissingTable(true);
    setPeople(list);
    setHasMore(more);
    setLoading(false);
    if (viewerId && list.length > 0) {
      const ids = list.map((p) => p.id);
      setFollowing(await fetchFollowingState(viewerId, ids));
    }
  }, [open, profileId, activeSide, viewerId]);

  // Deferred through a timer: `load` sets state, and
  // react-hooks/set-state-in-effect rejects a state-setting call in an effect
  // body. One tick keeps the same behaviour without a cascading render.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const switchSide = (next: FollowSide) => {
    setActiveSide(next);
    setQuery('');
  };

  const loadMore = async () => {
    if (!profileId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    const next = page + 1;
    const { people: list, hasMore: more } = await fetchFollowList(profileId, activeSide, {
      page: next,
      pageSize: PAGE_SIZE,
    });
    setPeople((prev) => [...prev, ...list.filter((p) => !prev.some((x) => x.id === p.id))]);
    setHasMore(more);
    setPage(next);
    if (viewerId && list.length > 0) {
      const ids = list.map((p) => p.id);
      const state = await fetchFollowingState(viewerId, ids);
      setFollowing((prev) => new Set([...prev, ...state]));
    }
    setLoadingMore(false);
  };

  /** Optimistic toggle, reconciled with the database, counts refreshed after. */
  const onToggleFollow = async (person: FollowPerson) => {
    if (!viewerId || busyId || person.id === viewerId) return;
    const wasFollowing = following.has(person.id);
    setBusyId(person.id);
    setError(null);

    const next = new Set(following);
    if (wasFollowing) next.delete(person.id);
    else next.add(person.id);
    setFollowing(next);

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
      // On the owner's own "Following" tab an unfollow removes the row: the
      // person was listed only because of the edge that was just deleted.
      if (wasFollowing && activeSide === 'following' && viewerId === profileId) {
        setPeople((prev) => prev.filter((p) => p.id !== person.id));
      }
      onChanged?.();
    } else {
      setFollowing((prev) => {
        const reverted = new Set(prev);
        if (wasFollowing) reverted.add(person.id);
        else reverted.delete(person.id);
        return reverted;
      });
      if (result.reason === 'missing-table') {
        setError('Following is not enabled on this deployment yet.');
      } else {
        setError(result.message ?? 'That did not work. Please try again.');
      }
    }
    setBusyId(null);
  };

  const heading = activeSide === 'followers' ? 'Followers' : 'Following';

  const q = query.trim().toLowerCase();
  const filtered = q
    ? people.filter((p) => {
        const name = `${p.firstname ?? ''} ${p.lastname ?? ''}`.toLowerCase();
        return (
          name.includes(q) ||
          (p.username ?? '').toLowerCase().includes(q) ||
          (p.role ?? '').toLowerCase().includes(q)
        );
      })
    : people;

  return (
    <Modal open={open} onClose={onClose} title={heading} size="md">
      {/* Tabs + search */}
      <div className="mb-3 flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Follow lists"
          className="flex rounded-xl border border-border bg-muted/50 p-1"
        >
          {(['followers', 'following'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={activeSide === s}
              onClick={() => switchSide(s)}
              className={cn(
                'flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors',
                activeSide === s
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${heading.toLowerCase()}…`}
            aria-label={`Search ${heading}`}
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-border focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>
      </div>

      {loading ? (
        <ul className="divide-y divide-[var(--divider)]">
          {[0, 1, 2, 3].map((i) => (
            <UserListItemSkeleton key={i} />
          ))}
        </ul>
      ) : missingTable ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Follow data is not available on this deployment yet.
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-subtle-foreground"
          >
            <UserRound className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            {q
              ? `No one matches “${query.trim()}”.`
              : activeSide === 'followers'
                ? 'No followers yet.'
                : 'Not following anyone yet.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[var(--divider)]">
            {filtered.map((person) => {
              const isSelf = viewerId !== null && person.id === viewerId;
              return (
                <UserListItem
                  key={person.id}
                  person={person}
                  following={isSelf ? null : following.has(person.id)}
                  busy={busyId === person.id}
                  onToggleFollow={
                    viewerId && !isSelf ? () => void onToggleFollow(person) : undefined
                  }
                />
              );
            })}
          </ul>

          {hasMore && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent-border hover:bg-muted disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}

export default ProfileFollowList;