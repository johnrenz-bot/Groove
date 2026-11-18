'use client';

/**
 * Upcoming dance events — real published rows from the dance_updates table
 * via the public /api/dance/events/upcoming endpoint.
 *
 * Leagues are resolved through the verified league registry (never invented).
 * "Add to calendar" renders a Google Calendar template with the real start
 * time; each event links back to its official source.
 */

import React from 'react';
import { CalendarDays, ArrowUpRight, Plus } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { leagueForOrganization } from '@/features/dance/data/leagues';
import type { DanceEventBrief } from '../../types';

function toGoogleCalendarDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function DanceEvents({ events }: { events: DanceEventBrief[] }) {
  return (
    <PanelCard
      icon={<CalendarDays className="h-4 w-4" />}
      title="Upcoming Dance Events"
      viewAllHref="/community/performing-arts/dance"
      viewAllLabel="All events"
    >
      {events.length === 0 ? (
        <EmptyState
          compact
          icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
          title="No published events yet"
          description="Verified battles, championships and workshops from the leagues will appear here as they are announced."
          actionHref="/community/performing-arts/dance"
          action="Explore the dance community"
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const league = leagueForOrganization(event.organization);
            const start = toGoogleCalendarDate(event.event_date);
            const calUrl = start
              ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                  event.title
                )}&dates=${start}/${start}&details=${encodeURIComponent(
                  `${event.organization ? `${event.organization} — ` : ''}official details: ${event.source_url}`
                )}&location=${encodeURIComponent(event.location ?? '')}`
              : null;
            const d = new Date(event.event_date);
            const month = Number.isNaN(d.getTime())
              ? ''
              : d.toLocaleString('default', { month: 'short' }).toUpperCase();
            const day = Number.isNaN(d.getTime()) ? '' : String(d.getDate());

            return (
              <li
                key={event.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3 transition-colors hover:border-border-strong hover:bg-muted/40"
              >
                <div className="flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-card">
                  <span className="text-[9px] font-bold uppercase leading-none tracking-wider text-muted-foreground">
                    {month}
                  </span>
                  <span className="mt-0.5 text-sm font-bold leading-none tabular-nums text-foreground">
                    {day}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground">
                    {event.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {league ? league.shortName : event.organization ?? 'Dance event'}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Source
                      <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
                    </a>
                    {calUrl && (
                      <a
                        href={calUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="h-2.5 w-2.5" aria-hidden="true" />
                        Add to calendar
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}

export default DanceEvents;

