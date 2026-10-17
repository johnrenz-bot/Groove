'use client';

import React from 'react';
import { MapPin, ExternalLink, Calendar, Drama } from 'lucide-react';
import type { DanceUpdateRecord } from '@/features/dance/services/danceService';
import { isUpcomingEvent } from '@/features/dance/services/danceService';
import { formatEventDate } from '@/lib/dance/types';
import { ReportIssueLink } from '@/features/dance/components/ReportIssueLink';
import { getCountdownLabel } from '@/features/dance/utils/countdown';
import { SafeImage } from '@/features/dance/components/SafeImage';

interface ActingUpdateCardProps {
  update: DanceUpdateRecord;
  language: 'en' | 'tl';
}

export function ActingUpdateCard({ update, language }: ActingUpdateCardProps) {
  const eventDate = React.useMemo(() => formatEventDate(update.event_date), [update.event_date]);

  const isPast = React.useMemo(
    () => Boolean(eventDate) && !isUpcomingEvent(update),
    [eventDate, update]
  );

  const countdownLabel = React.useMemo(
    () => getCountdownLabel(update.event_date),
    [update.event_date]
  );

  const summaryText = language === 'tl' && update.summary_tl ? update.summary_tl : update.summary;
  const hasImage = Boolean(update.image_url);

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      <div>
        {hasImage ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border bg-muted/20">
            <SafeImage
              src={update.image_url!}
              alt={update.image_alt || update.title}
              sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
              className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"
            />
            {update.image_credit && (
              <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
                {update.image_credit}
              </span>
            )}
          </div>
        ) : (
          <div className="relative flex h-24 w-full items-center justify-between border-b border-border bg-gradient-to-br from-muted/30 via-muted/10 to-background px-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-accent-text">
              <Drama className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {update.region === 'international' ? '🌐 International' : '🇵🇭 Philippines'}
            </span>
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
              {update.organization}
            </span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-text">
              {update.category === 'competition' ? 'Audition' : update.category}
            </span>
            {countdownLabel && !isPast && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                {countdownLabel}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-base font-bold text-foreground transition-colors group-hover:text-accent-text sm:text-lg">
            {update.title}
          </h3>

          <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
            {eventDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{eventDate}</span>
              </div>
            )}
            {update.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{update.location}</span>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {summaryText}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-divider px-5 py-3 text-xs sm:px-6">
        <a
          href={update.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-foreground transition hover:text-accent-text"
        >
          <span>Audition Link</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>

        <ReportIssueLink itemTitle={update.title} itemId={update.id} kind="Audition" />
      </div>
    </article>
  );
}
