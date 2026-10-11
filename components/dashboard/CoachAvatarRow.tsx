'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { FullCoach } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { getInitials } from '@/lib/utils';

export interface CoachAvatarRowProps {
  coaches: FullCoach[];
  loading?: boolean;
  viewAllHref: string;
}

export function CoachAvatarRow({ coaches, loading = false, viewAllHref }: CoachAvatarRowProps) {
  return (
    <Card padding="md">
      <CardHeader
        icon={<Sparkles className="h-4 w-4" />}
        title="Recommended Coaches"
        subtitle="Verified performing arts mentors matching your profile"
        action={
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-accent-text"
          >
            <span>View directory</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />

      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="g-skeleton h-28 rounded-2xl" aria-hidden />
            ))}
          </div>
        ) : coaches.length === 0 ? (
          <EmptyState
            compact
            icon={<Sparkles className="h-5 w-5" />}
            title="No coaches yet."
            description="Check back soon."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {coaches.slice(0, 4).map((coach) => (
              <Link
                key={coach.id}
                href={`/userprofile/${coach.id}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-accent-border hover:bg-muted"
              >
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-bold text-foreground transition group-hover:border-accent-border">
                  {coach.photo_url ? (
                    <img
                      src={coach.photo_url}
                      alt={coach.firstname}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(coach.firstname, coach.lastname)
                  )}
                </span>
                <span className="w-full truncate text-xs font-bold text-foreground group-hover:text-accent-text">
                  {coach.firstname} {coach.lastname}
                </span>
                <span className="truncate text-[10px] capitalize text-muted-foreground">
                  {coach.coach_profile?.talents ?? 'Performing Arts'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CoachAvatarRow;
