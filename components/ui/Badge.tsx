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
 * Pill status badge. Colors come from status tokens so badges stay legible in
 * both themes; the mapping of variant -> semantic role lives here and nowhere
 * else in the app.
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
  pending: 'bg-warning-soft text-warning border-warning/40',
  scheduled: 'bg-info-soft text-info border-info/40',
  approved: 'bg-success-soft text-success border-success/40',
  confirmed: 'bg-success-soft text-success border-success/40',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-danger-soft text-danger border-danger/40',
  suspended: 'bg-danger-soft text-danger border-danger/40',
  neutral: 'bg-muted text-muted-foreground border-border',
  accent: 'bg-accent-soft text-accent-text border-accent-border font-semibold',
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
        'inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
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
