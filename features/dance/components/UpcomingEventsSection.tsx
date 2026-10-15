'use client';

import React, { useMemo } from 'react';
import { MapPin, ExternalLink, Ticket, CalendarX2 } from 'lucide-react';
import type { DanceUpdateRecord } from '../services/danceService';
import { isUpcomingEvent } from '../services/danceService';
import { getOrgLogo } from '../data/danceOrgs';
import { parseEventDateParts } from '@/lib/dance/types';
import { SectionHeader } from './SectionHeader';
import { ReportIssueLink } from './ReportIssueLink';
import { SafeImage } from './SafeImage';
import { cn } from '@/components/shared/cn';

export type EventTimeframe = 'upcoming' | 'past';

interface UpcomingEventsSectionProps {
  events: DanceUpdateRecord[];
  pastEvents?: DanceUpdateRecord[];
  loading?: boolean;
  timeframe?: EventTimeframe;
  onTimeframeChange?: (t: EventTimeframe) => void;
  /** Active league filter id (e.g. "hhi", "all") — reused from the Latest Updates filter. */
  selectedOrg?: string;
  onClearFilters?: () => void;
}

function matchesOrg(evt: DanceUpdateRecord, selectedOrg?: string): boolean {
  if (!selectedOrg || selectedOrg === 'all') return true;
  const needle = selectedOrg.toLowerCase();
  return (
    evt.organization.toLowerCase().includes(needle) ||
    evt.title.toLowerCase().includes(needle)
  );
}

export function UpcomingEventsSection({
  events,
  pastEvents = [],
  loading,
  timeframe = 'upcoming',
  onTimeframeChange,
  selectedOrg = 'all',
  onClearFilters,
}: UpcomingEventsSectionProps) {
  const upcomingFiltered = useMemo(() => {
    return events
      .filter((e) => matchesOrg(e, selectedOrg))
      .filter((e) => isUpcomingEvent(e))
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
  }, [events, selectedOrg]);

  const pastFiltered = useMemo(() => {
    const base = pastEvents.length > 0 ? pastEvents : events;
    return base
      .filter((e) => matchesOrg(e, selectedOrg))
      .filter((e) => {
        if (!e.event_date) return false;
        const when = new Date(e.event_date);
        if (Number.isNaN(when.getTime())) return false;
        return !isUpcomingEvent(e);
      })
      .sort((a, b) => new Date(b.event_date!).getTime() - new Date(a.event_date!).getTime())
      .slice(0, 9);
  }, [events, pastEvents, selectedOrg]);

  const visible = timeframe === 'past' ? pastFiltered : upcomingFiltered;
  const hasLeagueFilter = selectedOrg !== 'all';

  if (loading) {
    return (
      <section id="upcoming-events" aria-label="Upcoming events loading" className="scroll-mt-24">
        <div className="h-6 w-48 animate-pulse rounded bg-muted/40" aria-hidden="true" />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
        <span className="sr-only">Loading upcoming events…</span>
      </section>
    );
  }

  return (
    <section id="upcoming-events" aria-labelledby="upcoming-events-title" className="scroll-mt-24">
      <SectionHeader
        eyebrow="Scheduled Battles & Competitions"
        title={
          <span id="upcoming-events-title">
            {timeframe === 'past' ? 'Past' : 'Upcoming'}{' '}
            <span className="font-normal italic text-muted-foreground">Events</span>
          </span>
        }
        description="Official dates, certified locations, and direct registration links for league battles."
        meta={
          <div
            role="group"
            aria-label="Show upcoming or past events"
            className="flex items-center rounded-full border border-border bg-muted/20 p-1"
          >
            <button
              type="button"
              onClick={() => onTimeframeChange?.('upcoming')}
              aria-pressed={timeframe === 'upcoming'}
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                timeframe === 'upcoming'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => onTimeframeChange?.('past')}
              aria-pressed={timeframe === 'past'}
              aria-label="Show past events"
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                timeframe === 'past'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Past Events
            </button>
          </div>
        }
      />

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
            <CalendarX2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">
            {timeframe === 'past'
              ? 'No past events found for these filters'
              : 'No upcoming events right now'}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {timeframe === 'past'
              ? 'Try switching back to upcoming events, or clear the league filter to see the full archive.'
              : 'New battles are announced regularly. Check Latest Updates below, or view past results instead.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {timeframe === 'upcoming' && pastFiltered.length > 0 && (
              <button
                type="button"
                onClick={() => onTimeframeChange?.('past')}
                className="inline-flex items-center justify-center rounded-full border border-border bg-muted/30 px-5 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                View past events
              </button>
            )}
            {hasLeagueFilter && onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((evt) => {
            const dateParts = parseEventDateParts(evt.event_date);
            const monthStr = dateParts ? dateParts.month.toUpperCase() : 'TBD';
            const dayStr = dateParts ? String(dateParts.day) : '--';
            const yearStr = dateParts ? dateParts.year : null;
            const orgLogoInfo = getOrgLogo(evt.organization, evt.title);

            return (
              <div
                key={evt.id}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md sm:p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-muted/30 px-3.5 py-2"
                      title={yearStr ? `${dayStr} ${monthStr} ${yearStr}` : undefined}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {monthStr}
                      </span>
                      <span className="text-xl font-bold text-foreground sm:text-2xl">{dayStr}</span>
                      {yearStr && (
                        <span className="text-[9px] font-medium tabular-nums text-muted-foreground/80">
                          {yearStr}
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col items-end gap-1.5">
                      {orgLogoInfo.isVerified && orgLogoInfo.logoUrl ? (
                        <div className="relative flex h-8 items-center justify-end">
                          <SafeImage
                            src={orgLogoInfo.logoUrl}
                            alt={orgLogoInfo.alt}
                            fill={false}
                            width={96}
                            height={30}
                            className="h-7 w-auto max-w-[96px] object-contain object-right opacity-90 transition-opacity group-hover:opacity-100"
                            fallback={null}
                          />
                        </div>
                      ) : (
                        <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
                          {evt.organization}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        {orgLogoInfo.isVerified && orgLogoInfo.logoUrl && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {evt.organization}
                          </span>
                        )}
                        <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                          {evt.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 title={evt.title} className="mt-4 line-clamp-2 text-base font-bold text-foreground transition group-hover:text-accent-text">
                    {evt.title}
                  </h3>

                  {evt.location && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-1" title={evt.location}>{evt.location}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-divider pt-4">
                  <a
                    href={evt.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-muted/30 py-2 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    <span>Register / Event Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="mt-2.5 flex items-center justify-end">
                    <ReportIssueLink itemTitle={evt.title} itemId={evt.id} kind="Event" />
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
