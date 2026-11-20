'use client';

import React, { useMemo } from 'react';
import { MapPin, ExternalLink, CalendarX2 } from 'lucide-react';
import type { DisciplineUpdateRecord } from '@/features/discipline/types';
import { isUpcomingEvent } from '@/features/discipline/services/disciplineService';
import { parseEventDateParts } from '@/lib/dance/types';
import { SectionHeader } from './SectionHeader.tsx';
import { ReportIssueLink } from './ReportIssueLink.tsx';
import { cn } from '@/lib/utils';

export type EventTimeframe = 'upcoming' | 'past';

interface DisciplineUpcomingEventsSectionProps {
  events: DisciplineUpdateRecord[];
  pastEvents?: DisciplineUpdateRecord[];
  loading?: boolean;
  timeframe?: EventTimeframe;
  onTimeframeChange?: (t: EventTimeframe) => void;
  /** Active org filter id — reused from the Latest Updates filter. */
  selectedOrg?: string;
  onClearFilters?: () => void;
  /** Which discipline's visual dialect to render. (Dance keeps its own component: league logo rendering differs.) */
  variant: 'singing' | 'acting' | 'theater';
}

const VARIANTS = {
  singing: {
    loadingAriaLabel: 'Upcoming singing events loading',
    loadingSr: 'Loading upcoming vocal events…',
    titleId: 'upcoming-singing-events-title',
    sectionAriaLabel: 'Upcoming singing events',
    eyebrow: 'Scheduled Choral Competitions & Recitals',
    noun: 'Vocal Events',
    description:
      'Official dates, certified concert halls, and verified registration links for chorales and vocalists.',
    pastButton: 'Past Events',
    pastAriaLabel: 'Show past events',
    emptyPast: 'No past events found for these filters',
    emptyNow: 'No upcoming events right now',
    emptyPastHint: 'Try switching back to upcoming events, or clear the organization filter to view all events.',
    emptyNowHint: 'New festival dates and auditions are added regularly. Check Latest Dispatches below.',
    categoryBadge: (cat: string | null | undefined) => cat ?? 'event',
    detailCta: 'Event Details',
    reportKind: 'Event' as const,
  },
  acting: {
    loadingAriaLabel: 'Upcoming acting events loading',
    loadingSr: 'Loading upcoming auditions and workshops…',
    titleId: 'upcoming-acting-events-title',
    sectionAriaLabel: 'Upcoming acting events',
    eyebrow: 'Scheduled Castings, Auditions & Masterclasses',
    noun: 'Acting Events',
    description:
      'Official casting calls, theater auditions, and conservatory scene study masterclasses.',
    pastButton: 'Past Events',
    pastAriaLabel: 'Show past events',
    emptyPast: 'No past acting events found for these filters',
    emptyNow: 'No upcoming audition calls right now',
    emptyPastHint: 'Try switching back to upcoming events, or reset the filter.',
    emptyNowHint: 'New auditions and casting calls are added regularly. Check Latest Dispatches below.',
    categoryBadge: (cat: string | null | undefined) => (cat === 'competition' ? 'Audition' : (cat ?? 'event')),
    detailCta: 'Audition Details',
    reportKind: 'Audition' as const,
  },
  theater: {
    loadingAriaLabel: 'Upcoming theater productions loading',
    loadingSr: 'Loading upcoming theatrical productions…',
    titleId: 'upcoming-theater-events-title',
    sectionAriaLabel: 'Upcoming theater productions',
    eyebrow: 'Curtain Calls & Opening Nights',
    noun: 'Stage Productions',
    description:
      'Official opening nights, musical seasons, and stage performance calendars.',
    pastButton: 'Past Productions',
    pastAriaLabel: 'Show past productions',
    emptyPast: 'No past productions found for these filters',
    emptyNow: 'No upcoming opening nights right now',
    emptyPastHint: 'Try switching back to upcoming productions, or clear the company filter.',
    emptyNowHint: 'New production seasons and ticket sales are announced regularly. Check Latest Dispatches below.',
    categoryBadge: (cat: string | null | undefined) => (cat === 'competition' ? 'Festival' : (cat ?? 'event')),
    detailCta: 'Production Details',
    reportKind: 'Production' as const,
  },
} as const;

function matchesOrg(evt: DisciplineUpdateRecord, selectedOrg?: string): boolean {
  if (!selectedOrg || selectedOrg === 'all') return true;
  const org = (evt.organization ?? '').toLowerCase();
  return org.includes(selectedOrg.toLowerCase()) || selectedOrg.toLowerCase().includes(org);
}

export function DisciplineUpcomingEventsSection({
  events,
  pastEvents = [],
  loading,
  timeframe = 'upcoming',
  onTimeframeChange,
  selectedOrg = 'all',
  onClearFilters,
  variant,
}: DisciplineUpcomingEventsSectionProps) {
  const v = VARIANTS[variant];
  const upcomingFiltered = useMemo(() => {
    return events
      .filter((e) => matchesOrg(e, selectedOrg))
      .filter((e) => isUpcomingEvent(e))
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
  }, [events, selectedOrg]);

  const pastFiltered = useMemo(() => {
    return pastEvents
      .filter((e) => matchesOrg(e, selectedOrg))
      .sort((a, b) => new Date(b.event_date!).getTime() - new Date(a.event_date!).getTime());
  }, [pastEvents, selectedOrg]);

  const visible = timeframe === 'past' ? pastFiltered : upcomingFiltered;
  const hasOrgFilter = selectedOrg !== 'all';

  if (loading) {
    return (
      <section id="upcoming-events" aria-label={v.loadingAriaLabel} className="scroll-mt-24">
        <div className="h-6 w-48 animate-pulse rounded bg-muted/40" aria-hidden="true" />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
        <span className="sr-only">{v.loadingSr}</span>
      </section>
    );
  }

  return (
    <section id="upcoming-events" aria-labelledby={v.titleId} className="scroll-mt-24">
      <SectionHeader
        eyebrow={v.eyebrow}
        title={
          <span id={v.titleId}>
            {timeframe === 'past' ? 'Past' : 'Upcoming'}{' '}
            <span className="font-normal text-muted-foreground">{v.noun}</span>
          </span>
        }
        description={v.description}
        meta={
          <div
            role="group"
            aria-label="Event timeframe"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card p-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onTimeframeChange?.('upcoming')}
              aria-pressed={timeframe === 'upcoming'}
              aria-label="Show upcoming events"
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                timeframe === 'upcoming'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => onTimeframeChange?.('past')}
              aria-pressed={timeframe === 'past'}
              aria-label={v.pastAriaLabel}
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                timeframe === 'past'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v.pastButton}
            </button>
          </div>
        }
      />

      {visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <CalendarX2 className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {timeframe === 'past' ? v.emptyPast : v.emptyNow}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {timeframe === 'past' ? v.emptyPastHint : v.emptyNowHint}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {timeframe === 'upcoming' && pastFiltered.length > 0 && (
              <button
                type="button"
                onClick={() => onTimeframeChange?.('past')}
                className="inline-flex items-center justify-center rounded-full border border-border bg-muted/30 px-5 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                View past {variant === 'theater' ? 'productions' : 'events'}
              </button>
            )}
            {hasOrgFilter && onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center justify-center rounded-full border border-border bg-muted/30 px-5 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((evt) => {
            const dateParts = evt.event_date ? parseEventDateParts(evt.event_date) : null;
            const monthStr = dateParts ? dateParts.month.toUpperCase() : 'TBD';
            const dayStr = dateParts ? String(dateParts.day) : '--';
            const yearStr = dateParts ? dateParts.year : null;

            return (
              <div
                key={evt.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-border-strong"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-accent/40 bg-accent/10 text-accent-text">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-text/80">
                      {monthStr}
                    </span>
                    <span className="mt-0.5 text-2xl font-black leading-none text-accent-text">{dayStr}</span>
                    {yearStr && <span className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{yearStr}</span>}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
                      {evt.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-text">
                        {evt.organization}
                      </span>
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-text">
                        {v.categoryBadge(evt.category)}
                      </span>
                    </div>
                  </div>
                </div>

                {evt.location && (
                  <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="line-clamp-2">{evt.location}</span>
                  </p>
                )}

                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between gap-3 border-t border-divider pt-3">
                    <a
                      href={evt.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-foreground transition hover:text-accent-text"
                    >
                      <span>{v.detailCta}</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>

                    <ReportIssueLink itemTitle={evt.title} itemId={evt.id} kind={v.reportKind} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
