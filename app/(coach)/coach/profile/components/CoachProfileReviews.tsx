'use client';

import { Star } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Feedback } from '@/lib/types';

interface CoachProfileReviewsProps {
  feedbacks: Feedback[];
}

export function CoachProfileReviews({ feedbacks }: CoachProfileReviewsProps) {
  if (feedbacks.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-5 w-5" />}
        title="No reviews yet"
        description="Reviews and feedback from completed coaching appointments will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {feedbacks.map((fb) => (
        <div key={fb.id} className="g-card space-y-3 p-5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-text">
                {fb.user?.firstname?.[0]}
              </span>
              <p className="font-bold text-foreground">
                {fb.user?.firstname} {fb.user?.lastname}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 font-bold text-accent-text">
              <Star className="h-3.5 w-3.5 fill-accent" aria-hidden="true" />
              {fb.rating} / 5
            </span>
          </div>
          <p className="leading-relaxed text-muted-foreground italic">
            &ldquo;{fb.comment}&rdquo;
          </p>
        </div>
      ))}
    </div>
  );
}

