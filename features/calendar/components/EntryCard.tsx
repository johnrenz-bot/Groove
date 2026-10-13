'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, MapPin, Video, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/shared/cn';
import type { CalendarEntry } from '../lib/entries';
import { statusBarClass, statusVariant } from '../lib/entries';

/**
 * One appointment, rendered the same way in every view.
 *
 * Shows the time, the status, who it is with, the session type and the
 * location — the details the old two-column layout showed, but now reused by
 * the day, week and agenda views so the three cannot drift apart.
 */
export function EntryCard({
  entry,
  className,
  compact = false,
  showDate = false,
  dateLabel,
}: {
  entry: CalendarEntry;
  className?: string;
  compact?: boolean;
  showDate?: boolean;
  dateLabel?: string;
}) {
  const { appointment } = entry;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 transition hover:border-border-strong',
        statusBarClass(entry.status),
        compact && 'p-3',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {showDate && dateLabel && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-text">
              {dateLabel}
            </p>
          )}
          <p
            className={cn(
              'min-w-0 truncate font-bold text-foreground',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {entry.counterpartLabel}
          </p>
          {entry.sessionType && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.sessionType}</p>
          )}
        </div>
        <Badge variant={statusVariant(entry.status)} className="shrink-0 capitalize">
          {entry.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className={cn('mt-2.5 space-y-1.5 text-xs text-muted-foreground')}>
        <p className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="tabular-nums">{entry.timeLabel}</span>
          {entry.duration && (
            <span className="text-subtle-foreground">({entry.duration})</span>
          )}
        </p>
        {entry.location && (
          <p className="flex min-w-0 items-center gap-1.5">
            {entry.isOnline ? (
              <Video className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            ) : (
              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            )}
            <span className="truncate">{entry.location}</span>
          </p>
        )}
        {entry.isOnline && <span className="sr-only">This session is online.</span>}
      </div>

      {/* The message link is the one action the old calendar offered; it is
          preserved verbatim so no existing affordance is lost. */}
      {entry.messageHref && (
        <div className="mt-3 flex items-center justify-end border-t border-divider/60 pt-2.5">
          <Link
            href={entry.messageHref}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-text transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <MessageSquare className="h-3 w-3" aria-hidden="true" />
            Message {appointment.coach_id && entry.counterpartLabel.startsWith('Coach') ? 'Coach' : 'Student'}
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default EntryCard;