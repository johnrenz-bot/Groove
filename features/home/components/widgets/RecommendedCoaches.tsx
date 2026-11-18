'use client';

/**
 * Coaches panel for the client dashboard.
 *
 * Real, verified coaches only (account_verified = true), test accounts
 * excluded, ranked by match to the client's stated discipline from
 * client_profiles.talent. The rating shown is the real average from
 * `feedbacks` — a coach without reviews shows "No reviews yet", never stars.
 */

import React from 'react';
import Link from 'next/link';
import { BadgeCheck, Star, MapPin } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInitials, formatCurrency } from '@/lib/utils';
import type { RecommendedCoach } from '../../types';

function ratingLabel(rating: RecommendedCoach['rating']): string {
  if (!rating) return 'No reviews yet';
  return `${rating.average.toFixed(1)} ★ · ${rating.count} review${rating.count === 1 ? '' : 's'}`;
}

export function RecommendedCoachesPanel({
  coaches,
  clientTalent,
}: {
  coaches: RecommendedCoach[];
  clientTalent: string | null;
}) {
  return (
    <PanelCard
      icon={<BadgeCheck className="h-4 w-4" />}
      title="Recommended Coaches"
      viewAllHref="/client/talent"
      viewAllLabel="View all"
    >
      {coaches.length === 0 ? (
        <EmptyState
          compact
          icon={<BadgeCheck className="h-5 w-5" aria-hidden="true" />}
          title="No coaches to show yet"
          description="Verified coaches near San Jose del Monte will appear here as they join. Browse the full directory to explore every discipline."
          actionHref="/client/talent"
          action="Browse coaches"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {coaches.slice(0, 4).map((coach) => {
            const talent = (coach.coach_profile?.talents ?? '').trim() || 'Performing arts coach';
            const matched =
              clientTalent && talent.toLowerCase().includes(clientTalent.toLowerCase());
            const name = `${coach.firstname} ${coach.lastname}`.trim();
            return (
              <li
                key={coach.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={`/userprofile/${coach.id}`}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${name}'s profile`}
                  >
                    {coach.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- roster avatars keep parity with the existing directory tiles
                      <img
                        src={coach.photo_url}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(coach.firstname, coach.lastname)
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/userprofile/${coach.id}`}
                      className="block truncate text-sm font-bold text-foreground transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {name}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {coach.city_name || coach.address_summary || 'SJDM, Bulacan'}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {talent}
                      {matched ? <span className="text-accent-text"> · your discipline</span> : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-divider pt-3">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="h-3 w-3 fill-current text-accent-text" aria-hidden="true" />
                    <span className="tabular-nums">{ratingLabel(coach.rating)}</span>
                  </span>
                  <span className="text-xs font-bold tabular-nums text-accent-text">
                    {coach.coach_profile?.service_fee != null ? formatCurrency(coach.coach_profile.service_fee) : 'Rate on request'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/userprofile/${coach.id}`}
                    className="inline-flex h-8 items-center rounded-lg bg-muted px-3 text-[11px] font-semibold text-foreground transition hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Full profile
                  </Link>
                  <Link
                    href="/client/talent"
                    className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-[11px] font-bold text-accent-foreground transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Book
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}

export default RecommendedCoachesPanel;

