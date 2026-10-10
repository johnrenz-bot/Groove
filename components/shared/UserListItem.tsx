'use client';

import Link from 'next/link';
import { Loader2, MapPin, UserCheck, UserPlus } from 'lucide-react';
import type { FollowPerson } from '@/lib/profileFollows';
import { getInitials } from '@/lib/utils';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { cn } from '@/components/shared/cn';

/**
 * One person row, shared by the follow-lists modal and the /users directory.
 *
 * The whole left side is a Link to the person's public profile; the follow
 * control sits OUTSIDE the link because a button inside an anchor is invalid
 * nesting and a nested interactive element cannot be reliably clicked. Rows
 * that are the signed-in viewer mark themselves "You" and render no toggle.
 */

export interface UserListItemProps {
  person: FollowPerson & { followerCount?: number };
  /** Whether the signed-in viewer follows this person. `null` = unknown yet. */
  following?: boolean | null;
  /** True while a follow/unfollow write is in flight for this row. */
  busy?: boolean;
  /** Toggle handler. When omitted (signed out, or your own row) no control renders. */
  onToggleFollow?: () => void;
  /** Show the follower count on the location line (directory rows). */
  showFollowerCount?: boolean;
  /** Marks this row as the signed-in viewer. */
  isYou?: boolean;
}

export function UserListItem({
  person,
  following = null,
  busy = false,
  onToggleFollow,
  showFollowerCount = false,
  isYou = false,
}: UserListItemProps) {
  const fullName = `${person.firstname ?? ''} ${person.lastname ?? ''}`.trim();
  const display = fullName || person.username || 'Groove member';
  const location = [person.city_name, person.province_name].filter(Boolean).join(', ');
  const roleLabel = person.role === 'coach' ? 'Coach' : person.role === 'client' ? 'Client' : 'Member';

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link
        href={`/userprofile/${person.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`View ${display}'s profile`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-bold text-accent-text">
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            getInitials(person.firstname ?? 'G', person.lastname ?? 'M')
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate text-sm font-semibold text-foreground">{display}</span>
            {isYou && (
              <span className="rounded-full border border-border bg-muted px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                You
              </span>
            )}
            <span
              className={cn(
                'g-pill text-[10px] font-semibold uppercase tracking-[0.08em]',
                person.role === 'coach' ? 'g-pill-accent' : ''
              )}
            >
              {roleLabel}
            </span>
            <VerifiedBadge verified={person.account_verified} size="sm" label="" />
          </span>

          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle-foreground">
            {person.username && <span className="font-medium">@{person.username}</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {location}
              </span>
            )}
            {showFollowerCount && typeof person.followerCount === 'number' && (
              <span className="tabular-nums">
                {person.followerCount} follower{person.followerCount === 1 ? '' : 's'}
              </span>
            )}
          </span>
        </span>
      </Link>

      {onToggleFollow && (
        <button
          type="button"
          onClick={onToggleFollow}
          disabled={busy || following === null}
          aria-pressed={following === true}
          aria-label={following ? `Unfollow ${display}` : `Follow ${display}`}
          className={cn(
            'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 text-[11px] font-bold transition-all active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60',
            following
              ? 'border-accent-border bg-accent-soft text-accent-text hover:bg-accent/20'
              : 'border-accent bg-accent text-accent-foreground hover:bg-accent-hover'
          )}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : following ? (
            <UserCheck className="h-3 w-3" aria-hidden="true" />
          ) : (
            <UserPlus className="h-3 w-3" aria-hidden="true" />
          )}
          {busy ? '…' : following ? 'Following' : 'Follow'}
        </button>
      )}
    </li>
  );
}

/** Loading placeholder row, matched to the real row's height. */
export function UserListItemSkeleton() {
  return (
    <li className="flex items-center gap-3 py-2.5" aria-hidden="true">
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block h-3.5 w-2/5 animate-pulse rounded bg-muted" />
        <span className="block h-3 w-3/5 animate-pulse rounded bg-muted/70" />
      </span>
      <span className="h-8 w-[84px] shrink-0 animate-pulse rounded-full bg-muted" />
    </li>
  );
}

export default UserListItem;