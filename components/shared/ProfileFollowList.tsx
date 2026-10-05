'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchFollowList, type FollowPerson } from '@/lib/profileFollows';
import { Modal } from '@/components/ui/Modal';
import { X, UserRound } from 'lucide-react';

/**
 * Followers / Following list.
 *
 * One modal for both sides: `side` decides the heading and which relationship is
 * queried, and the body is identical. Reading the people happens here, through
 * the shared lib, so the two-round-trip edge-then-profile read lives in one
 * place rather than in each caller's component.
 */

interface ProfileFollowListProps {
  open: boolean;
  side: 'followers' | 'following';
  profileId: string;
  onClose: () => void;
  /** Called after a successful unfollow so the parent can re-read its counts. */
  onChanged?: () => void;
}

export function ProfileFollowList({
  open,
  side,
  profileId,
  onClose,
  onChanged,
}: ProfileFollowListProps) {
  const [people, setPeople] = useState<FollowPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
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

  const load = useCallback(async () => {
    if (!open || !profileId) return;
    setLoading(true);
    setError(null);
    const { people: list, missingTable: missing } = await fetchFollowList(profileId, side);
    if (missingTable) return;
    setPeople(list);
    setMissingTable(missing);
    setLoading(false);
  }, [open, profileId, side, missingTable]);

  // Scheduled through a timer rather than called in the effect body. `load` sets
  // state, and react-hooks/set-state-in-effect rejects a state-setting call in an
  // effect body; deferring it one tick keeps the same behaviour without a
  // cascading render before paint.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const onUnfollow = async (targetId: string) => {
    if (!viewerId || removing) return;
    setRemoving(targetId);
    setError(null);
    try {
      const { unfollowProfile } = await import('@/lib/profileFollows');
      const result = await unfollowProfile(viewerId, targetId);
      if (!result.ok) {
        setError(result.message ?? 'Could not unfollow. Please try again.');
      } else {
        setPeople((p) => p.filter((x) => x.id !== targetId));
        onChanged?.();
      }
    } finally {
      setRemoving(null);
    }
  };

  const heading = side === 'followers' ? 'Followers' : 'Following';

  return (
    <Modal open={open} onClose={onClose} title={heading} size="md">
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : missingTable ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Follow data is not available on this deployment yet.
        </p>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-subtle-foreground"
          >
            <UserRound className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            {side === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--divider)]">
          {people.map((person) => {
            const name = `${person.firstname ?? ''} ${person.lastname ?? ''}`.trim();
            const display = name || person.username || 'Groove member';
            return (
              <li key={person.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[11px] font-bold text-accent-text">
                  {person.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (person.firstname?.[0] ?? '') + (person.lastname?.[0] ?? '')
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {display}
                  </span>
                  <span className="block truncate text-[11px] text-subtle-foreground">
                    {person.username ? `@${person.username}` : ''}
                    {person.role ? ` · ${person.role}` : ''}
                  </span>
                </span>
                {viewerId && side === 'following' && (
                  <button
                    type="button"
                    onClick={() => onUnfollow(person.id)}
                    disabled={removing === person.id}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-muted-foreground transition hover:border-danger/50 hover:text-danger disabled:opacity-50"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    {removing === person.id ? '…' : 'Unfollow'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
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
