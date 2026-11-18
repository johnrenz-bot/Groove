'use client';

/**
 * Upcoming sessions / today's schedule — shared by both dashboards.
 *
 * Empty state is deliberate: "No sessions yet" plus the exact action that
 * gets the user one (find a coach). Never a blank panel, never a made-up row.
 */

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { SessionRow } from '@/components/dashboard/SessionRow';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SessionWithClient, SessionWithCoach } from '../../types';

export interface SessionsPanelProps {
  role: 'client' | 'coach';
  sessions: Array<SessionWithCoach | SessionWithClient>;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction: { label: string; href: string };
  viewAllHref: string;
  /** Full list cap — small enough to fit the card without scroll. */
  limit?: number;
}

export function SessionsPanel({
  role,
  sessions,
  emptyTitle,
  emptyDescription,
  emptyAction,
  viewAllHref,
  limit = 3,
}: SessionsPanelProps) {
  const appointmentsHref = role === 'client' ? '/client/messages?view=board' : '/coach/messages?view=board';
  const shown = sessions.slice(0, limit);

  return (
    <PanelCard
      icon={<Calendar className="h-4 w-4" />}
      title={role === 'client' ? 'Upcoming Sessions' : "Today's Schedule"}
      viewAllHref={viewAllHref}
      viewAllLabel="View all"
    >
      {shown.length === 0 ? (
        <EmptyState
          compact
          icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
          title={emptyTitle}
          description={emptyDescription}
          actionHref={emptyAction.href}
          action={emptyAction.label}
        />
      ) : (
        <ul className="space-y-2.5" aria-label="Upcoming sessions">
          {shown.map((session) => {
            const d = new Date(session.date);
            const month = Number.isNaN(d.getTime())
              ? ''
              : d.toLocaleString('default', { month: 'short' }).toUpperCase();
            const day = Number.isNaN(d.getTime()) ? '' : String(d.getDate()).padStart(2, '0');

            const personName =
              role === 'client'
                ? session.coach
                  ? `${session.coach.firstname} ${session.coach.lastname}`.trim()
                  : 'Your coach'
                : session.client
                  ? `${session.client.firstname} ${session.client.lastname}`.trim()
                  : 'Your student';

            const place = session.is_online
              ? 'Online session'
              : session.location?.trim()
                ? session.location
                : 'SJDM, Bulacan';

            const mapsHref =
              !session.is_online && place
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
                : null;

            return (
              <li key={session.id}>
                <SessionRow
                  month={month}
                  day={day}
                  timeRange={`${session.start_time} – ${session.end_time}`}
                  tag={role === 'client' ? 'Coaching' : 'Rehearsal'}
                  subtitle={`${personName} · ${place}`}
                  status={
                    session.status === 'confirmed'
                      ? 'Confirmed'
                      : session.status === 'pending'
                        ? 'Pending'
                        : 'Cancelled'
                  }
                  showAgreementBadge={session.status === 'pending'}
                />
                <div className="mt-1 flex flex-wrap items-center gap-2 pl-14 sm:pl-16">
                  <Link
                    href={appointmentsHref}
                    className="inline-flex h-7 items-center rounded-full px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Details
                  </Link>
                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      Directions
                    </a>
                  )}
                  <Link
                    href={appointmentsHref}
                    className="inline-flex h-7 items-center rounded-full px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Reschedule
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

export default SessionsPanel;

