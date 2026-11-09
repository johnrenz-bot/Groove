'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export type BadgeVariant =
  | 'pending'
  | 'scheduled'
  | 'approved'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'suspended'
  | 'neutral'
  | 'accent';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
}

/**
 * Status badge. Colors come from status tokens so badges stay legible in both
 * themes; the mapping of variant -> semantic role lives here and nowhere else
 * in the app. The 6px radius is the badge step of the shape scale — badges are
 * chips, not controls, so they do not use the 8px button radius.
 *
 * Borders are `-/40` rather than `-/30`: in dark mode a `-soft` tint DEEPENS the
 * card (see the note beside `--accent-soft` in globals.css), so the outline is
 * doing most of the work of separating the chip from its surface.
 *
 * `approved`/`confirmed` and `completed`/`neutral` are deliberately paired. They
 * are aliases, not oversights: both pairs carry one meaning — "this went well"
 * and "nothing to say" — and the callers that distinguish them do so with the
 * label text, not with a second shade.
 */
const VARIANT_STYLES: Record<BadgeVariant, string> = {
  pending: 'bg-warning-soft text-warning ',
  scheduled: 'bg-info-soft text-info ',
  approved: 'bg-success-soft text-success ',
  confirmed: 'bg-success-soft text-success ',
  completed: 'bg-muted text-muted-foreground ',
  cancelled: 'bg-danger-soft text-danger ',
  suspended: 'bg-danger-soft text-danger ',
  neutral: 'bg-muted text-muted-foreground ',
  accent: 'bg-accent-soft text-accent-text  font-semibold',
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  pending: 'bg-warning',
  scheduled: 'bg-info',
  approved: 'bg-success',
  confirmed: 'bg-success',
  completed: 'bg-muted-foreground',
  cancelled: 'bg-danger',
  suspended: 'bg-danger',
  neutral: 'bg-muted-foreground',
  accent: 'bg-accent',
};

export function Badge({
  variant = 'neutral',
  dot = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2.5 py-0.5 text-[11px] font-semibold',
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_STYLES[variant])} />}
      {children}
    </span>
  );
}

export default Badge;
