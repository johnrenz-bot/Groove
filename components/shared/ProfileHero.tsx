'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  BadgeCheck,
  UserPlus,
  UserCheck,
  Eye,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchFollowCounts,
  fetchIsFollowing,
  followProfile,
  unfollowProfile,
  type FollowCounts,
} from '@/lib/profileFollows';
import { ProfileFollowList } from '@/components/shared/ProfileFollowList';
import { PhilippineFlag } from '@/components/ui/PhilippineFlag';

/**
 * The redesigned identity header, shared by /client/profile and /coach/profile.
 *
 * ONE component for both roles. Those pages each had their own ad-hoc identity
 * card and the two had drifted apart, so the visual language is defined once
 * here and each page supplies only its own data.
 *
 * COUNTS ARE REAL
 * Follower/following numbers come from public.profile_follows; nothing is
 * hardcoded. If that table does not exist yet the counts render as an em dash
 * and the follow control is disabled with an explanation, rather than showing a
 * confident "0" that would be indistinguishable from a real zero.
 *
 * PHILIPPINE FLAG
 * A static platform mark. There is no country or nationality column on
 * public.profiles and this component does not invent one — the flag identifies
 * the platform, not the individual.
 */

/** A nullable column that the generated Profile type may also mark optional. */
type MaybeText = string | null | undefined;

interface ProfileHeroProps {
  profileId: string;
  firstname: MaybeText;
  lastname: MaybeText;
  username: MaybeText;
  role: 'client' | 'coach' | 'admin';
  photoUrl: MaybeText;
  bio: MaybeText;
  cityName: MaybeText;
  provinceName: MaybeText;
  /** One extra stat for the row, e.g. "Reviews" or "Disciplines". */
  extraStat?: { label: string; value: string | number };
  /** The public profile route, used by the Preview link. */
  publicHref: string;
  /** The page's own primary action, e.g. Edit Profile. */
  actions?: React.ReactNode;
  /** Optional chips under the bio: talents, specialties. */
  children?: React.ReactNode;
}

export function ProfileHero({
  profileId,
  firstname,
  lastname,
  username,
  role,
  photoUrl,
  bio,
  cityName,
  provinceName,
  extraStat,
  publicHref,
  actions,
  children,
}: ProfileHeroProps) {
  const [counts, setCounts] = useState<FollowCounts | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [listSide, setListSide] = useState<'followers' | 'following' | null>(null);

  const fullName = `${firstname ?? ''} ${lastname ?? ''}`.trim() || 'Groove member';
  const initials = `${firstname?.[0] ?? ''}${lastname?.[0] ?? ''}`.toUpperCase() || 'G';
  const location = [cityName, provinceName].filter(Boolean).join(', ');
  const isCoach = role === 'coach';
  const isOwnProfile = viewerId === profileId;

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
    if (!profileId) return;
    const c = await fetchFollowCounts(profileId);
    if (c.missingTable) {
      setUnavailable(true);
      setCounts(null);
      return;
    }
    setUnavailable(false);
    setCounts({ followers: c.followers, following: c.following });
    if (viewerId && viewerId !== profileId) {
      setIsFollowing(await fetchIsFollowing(viewerId, profileId));
    }
  }, [profileId, viewerId]);

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

  const onToggleFollow = async () => {
    if (!viewerId || busy) return;
    setBusy(true);
    setError(null);

    // Optimistic, then reconciled against the database. A follow that waits on
    // a round trip reads as broken; a follow that lies about the result is
    // worse, so a failure rolls the optimistic change straight back.
    const wasFollowing = isFollowing;
    const delta = wasFollowing ? -1 : 1;
    setIsFollowing(!wasFollowing);
    setCounts((c) => (c ? { ...c, followers: Math.max(0, c.followers + delta) } : c));

    const result = wasFollowing
      ? await unfollowProfile(viewerId, profileId)
      : await followProfile(viewerId, profileId);

    if (result.ok) {
      // Re-read so the displayed number is authoritative, not a local guess.
      await load();
    } else {
      setIsFollowing(wasFollowing);
      setCounts((c) => (c ? { ...c, followers: Math.max(0, c.followers - delta) } : c));
      if (result.reason === 'missing-table') {
        setUnavailable(true);
        setError('Following is not enabled on this deployment yet.');
      } else {
        setError(result.message ?? 'That did not work. Please try again.');
      }
    }
    setBusy(false);
  };

  return (
    <section className="g-card relative overflow-hidden" aria-label="Profile identity">
      {/* One soft accent wash. A gradient mesh here would fight the avatar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-accent/[0.06]"
      />

      <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="relative shrink-0">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-accent-border bg-muted shadow-[var(--shadow-sm)] sm:h-28 sm:w-28">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-accent-text">
                  {initials}
                </span>
              )}
            </div>
            {isCoach && (
              <span
                aria-hidden="true"
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-card"
              >
                <BadgeCheck className="h-4 w-4" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">
                {fullName}
              </h1>
              <span className="g-eyebrow">
                {isCoach ? 'Coach' : role === 'admin' ? 'Admin' : 'Performer'}
              </span>
              <span
                title="Philippines"
                aria-label="Philippines"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-xs"
              >
                <PhilippineFlag />
                <span>Philippines</span>
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {username && <span className="font-medium">@{username}</span>}
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                  {location}
                </span>
              )}
            </div>

            {bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {bio}
              </p>
            )}

            {children}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-divider pt-5 lg:flex-row lg:items-center lg:justify-between">
          <dl className="flex items-center gap-5 sm:gap-7">
            <Stat
              label="Followers"
              value={unavailable || counts === null ? '—' : counts.followers}
              onClick={
                unavailable || counts === null ? undefined : () => setListSide('followers')
              }
            />
            <Stat
              label="Following"
              value={unavailable || counts === null ? '—' : counts.following}
              onClick={
                unavailable || counts === null ? undefined : () => setListSide('following')
              }
            />
            {extraStat && (
              <div>
                <dt className="sr-only">{extraStat.label}</dt>
                <dd className="text-lg font-bold tabular-nums tracking-[-0.02em] text-foreground">
                  {extraStat.value}
                </dd>
                <span className="text-[11px] text-subtle-foreground">{extraStat.label}</span>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={publicHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground transition hover:border-accent-border hover:bg-muted"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Preview Profile
            </Link>

            {/* Self-follow is never offered, and the control is inert until the
                relationship table exists. */}
            {viewerId && !isOwnProfile && (
              <button
                type="button"
                onClick={onToggleFollow}
                disabled={busy || unavailable}
                aria-pressed={isFollowing}
                className={`inline-flex h-9 min-w-[108px] items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
                  isFollowing
                    ? 'border border-accent-border bg-accent-soft text-accent-text hover:bg-accent/20'
                    : 'bg-accent text-accent-foreground hover:bg-accent-hover'
                }`}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : isFollowing ? (
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {busy ? 'Working…' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}

            {actions}
          </div>
        </div>

        {unavailable && (
          <p className="mt-3 text-[11px] text-subtle-foreground">
            Follower counts appear once the follows feature is enabled on this deployment.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <ProfileFollowList
        open={listSide !== null}
        side={listSide ?? 'followers'}
        profileId={profileId}
        onClose={() => setListSide(null)}
        onChanged={() => void load()}
      />
    </section>
  );
}

function Stat({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number | string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <dd className="text-lg font-bold tabular-nums tracking-[-0.02em] text-foreground transition-colors group-hover/stat:text-accent-text">
        {value}
      </dd>
      <span className="text-[11px] text-subtle-foreground transition-colors group-hover/stat:text-accent-text">
        {label}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div>
        <dt className="sr-only">{label}</dt>
        {body}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className="group/stat cursor-pointer text-left">
      <dt className="sr-only">{label}</dt>
      {body}
    </button>
  );
}

export default ProfileHero;
