'use client';

import { useEffect, useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchFollowCounts,
  fetchIsFollowing,
  followProfile,
  unfollowProfile,
  type FollowCounts,
} from '@/lib/profileFollows';

/**
 * The one Follow control, shared by the public profile and the owner dashboards.
 *
 * WHY A SHARED COMPONENT
 * The follow write path already lives in lib/profileFollows.ts. This owns only
 * the interaction: read state, optimistic update, rollback, and the button. Two
 * copies of that logic is exactly how a public profile and a dashboard end up
 * disagreeing about whether you are following someone.
 *
 * All of it is real database state — there is no optimistic-only or demo mode.
 * A follow inserts a row in public.profile_follows; unfollowing deletes it. The
 * composite primary key (follower_id, following_id) means a duplicate follow is
 * a no-op rather than a second row, and a CHECK constraint rejects self-follow
 * even if this guard were bypassed.
 *
 * CALLER CONTRACT
 * Pass the PROFILE BEING VIEWED, not the viewer. The viewer is resolved from the
 * Supabase session, which is why the button hides itself entirely on your own
 * profile: there is nothing to follow, and showing a disabled control there
 * would be noise.
 */

interface FollowButtonProps {
  /** The profile being viewed (public.profiles.id). */
  profileId: string;
  /** Visual shape, so it matches the buttons already on the page. */
  shape?: 'pill' | 'rounded';
  /** Called after any successful change, so a parent can refresh its own counts. */
  onChanged?: (counts: FollowCounts) => void;
  className?: string;
}

export function FollowButton({
  profileId,
  shape = 'pill',
  onChanged,
  className = '',
}: FollowButtonProps) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  /** True until the first read settles, so the button never flashes "Follow". */
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
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

  // One deferred read that settles BOTH the follow state and the "loaded" flag.
  // Keeping them in the same timer means `ready` can never be set in an effect
  // body, and the two can never disagree.
  useEffect(() => {
    if (!viewerId || viewerId === profileId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchIsFollowing(viewerId, profileId).then((following) => {
        // The component may have unmounted, or the viewer may have signed out,
        // while the read was in flight.
        if (cancelled) return;
        setIsFollowing(following);
        setReady(true);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [viewerId, profileId]);

  const onToggle = async () => {
    if (!viewerId || busy || viewerId === profileId) return;
    setBusy(true);
    setError(null);

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    const result = wasFollowing
      ? await unfollowProfile(viewerId, profileId)
      : await followProfile(viewerId, profileId);

    if (result.ok) {
      // Re-read the authoritative state rather than trusting the local guess, so
      // a duplicate-follow no-op or a concurrent tab cannot desync the label.
      const next = await fetchIsFollowing(viewerId, profileId);
      setIsFollowing(next);
      if (onChanged) {
        const counts = await fetchFollowCounts(profileId);
        onChanged(counts);
      }
    } else {
      setIsFollowing(wasFollowing);
      if (result.reason === 'missing-table') {
        setUnavailable(true);
      } else {
        setError(result.message ?? 'That did not work. Please try again.');
      }
    }
    setBusy(false);
  };

  // Signed out, or looking at yourself: render nothing at all.
  if (!viewerId || viewerId === profileId) return null;

  const radius = shape === 'pill' ? 'rounded-full' : 'rounded-lg';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy || unavailable || !ready}
        aria-pressed={isFollowing}
        aria-label={isFollowing ? 'Unfollow this member' : 'Follow this member'}
        className={`inline-flex cursor-pointer items-center gap-1.5 border px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 ${radius} ${
          isFollowing
            ? 'border-accent-border bg-accent-soft text-accent-text hover:bg-accent/20'
            : 'border-accent bg-accent text-accent-foreground shadow-[var(--shadow-accent)] hover:bg-accent-hover'
        }`}
      >
        <span
          className={`transition-transform duration-200 ${
            busy ? 'scale-90 opacity-70' : isFollowing ? 'scale-100' : 'scale-100'
          }`}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : isFollowing ? (
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
        {busy ? 'Working…' : isFollowing ? 'Following' : 'Follow'}
      </button>

      {error && (
        <p role="alert" className="mt-1 text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default FollowButton;
