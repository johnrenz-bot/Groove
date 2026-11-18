'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';
import { maskUsername } from '@/lib/masking';
import { formatDate } from '@/lib/utils';
import type { DirectoryUser } from '@/app/users/page';
import { UserPlus, MapPin, CheckCircle2 } from 'lucide-react';

export interface UserGridCardProps {
  user: DirectoryUser;
  viewerId: string | null;
  following: boolean;
  busy: boolean;
  onToggleFollow?: () => void;
}

export function UserGridCard({ user, viewerId, following, busy, onToggleFollow }: UserGridCardProps) {
  const isSelf = viewerId !== null && user.id === viewerId;
  const display =
    `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || user.username || 'Groove member';
  const location = [user.city_name, user.province_name].filter(Boolean).join(', ');

  return (
    <li className="g-card flex flex-col p-5 transition-colors hover:">
      <div className="flex items-start gap-3">
        <Link
          href={`/userprofile/${user.id}`}
          aria-label={`View ${display}'s profile`}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background "
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
            <Badge variant={user.role === 'coach' ? 'accent' : 'neutral'} className="text-[10px]">
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
            <dd className="truncate font-medium">@{isSelf ? user.username : maskUsername(user.username)}</dd>
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

      {viewerId && !isSelf && onToggleFollow && (
        <div className="mt-4   pt-3">
          <Button
            size="sm"
            variant={following ? 'outline' : 'primary'}
            loading={busy}
            onClick={onToggleFollow}
            icon={<UserPlus className="h-3.5 w-3.5" />}
            className="w-full"
          >
            {busy ? 'Updating…' : following ? 'Following' : 'Follow'}
          </Button>
        </div>
      )}
    </li>
  );
}

