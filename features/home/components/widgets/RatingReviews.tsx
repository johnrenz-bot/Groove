'use client';

/**
 * Rating & latest reviews — coach side.
 *
 * The average and count are real (computed over `feedbacks` for this coach).
 * With no reviews it shows the honest empty state. Reviewer names come from
 * the `feedbacks.user_id` join; nothing is invented.
 */

import React from 'react';
import { Star, Quote } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInitials } from '@/lib/utils';
import type { CoachReview } from '../../types';

export function RatingReviews({
  rating,
  reviews,
}: {
  rating: { average: number; count: number } | null;
  reviews: CoachReview[];
}) {
  return (
    <PanelCard
      icon={<Star className="h-4 w-4" />}
      title="Rating & Reviews"
      viewAllHref="/coach/profile"
      viewAllLabel="View all"
    >
      {!rating ? (
        <EmptyState
          compact
          icon={<Star className="h-5 w-5" aria-hidden="true" />}
          title="No reviews yet"
          description="After your first session, your student can leave a review — it will show up here."
        />
      ) : (
        <>
          <div className="flex items-end justify-between gap-3 border-b border-divider pb-4">
            <div>
              <p className="font-sans text-5xl font-bold tabular-nums leading-none tracking-tight text-foreground">
                {rating.average.toFixed(1)}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="flex text-accent-text" aria-label={`${rating.average.toFixed(1)} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= Math.round(rating.average) ? 'fill-current' : 'opacity-25'}`}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              </p>
            </div>
            <p className="text-right text-[11px] leading-snug text-muted-foreground">
              <span className="block text-base font-bold tabular-nums text-foreground">{rating.count}</span>
              review{rating.count === 1 ? '' : 's'}
            </p>
          </div>

          <ul className="mt-3 space-y-2.5">
            {reviews.slice(0, 3).map((review) => (
              <li key={review.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[11px] leading-snug text-foreground">{review.comment}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-foreground"
                      aria-hidden="true"
                    >
                      {getInitials(review.reviewerName.split(' ')[0], review.reviewerName.split(' ').slice(1).join(' ') || undefined)}
                    </span>
                    <span className="truncate">{review.reviewerName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{review.rating}/5</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </PanelCard>
  );
}

export default RatingReviews;

