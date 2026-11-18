'use client';

/**
 * Coach dashboard — same registry contract as the client grid, coach flavour.
 */

import React from 'react';
import {
  Calendar,
  Inbox,
  Star,
  UserRoundCheck,
} from 'lucide-react';
import {
  COACH_WIDGETS,
  SIZE_CLASSES,
  type CoachWidgetDefinition,
  type CoachWidgetPropsMap,
} from '@/config/dashboard-widgets';
import { WidgetBoundary } from './widgets/WidgetShell';
import type { CoachHomeData } from '../types';
import type { StatTileInput } from './widgets/StatStrip';

function buildTiles(data: CoachHomeData): StatTileInput[] {
  const verified = Boolean(data.profile.account_verified);
  return [
    {
      icon: <Calendar className="h-5 w-5" />,
      value: data.upcomingCount,
      label: "Today's Sessions",
      sub: 'Sessions scheduled',
      accentColor: 'yellow',
      href: '/coach/messages?view=board',
    },
    {
      icon: <Inbox className="h-5 w-5" />,
      value: data.pendingRequests.length,
      label: 'Pending Requests',
      sub: 'Needs your response',
      accentColor: data.pendingRequests.length > 0 ? 'red' : 'green',
      href: '/coach/messages?view=board',
    },
    {
      icon: <Star className="h-5 w-5" />,
      value: data.rating ? data.rating.average.toFixed(1) : '—',
      label: 'Rating',
      sub: data.rating ? `${data.rating.count} review${data.rating.count === 1 ? '' : 's'}` : 'No reviews yet',
      accentColor: 'green',
      href: '/coach/profile',
    },
    {
      icon: <UserRoundCheck className="h-5 w-5" />,
      value: verified ? 'Verified' : 'Pending',
      label: 'Account Status',
      sub: data.profile.custom_id ? `#${data.profile.custom_id}` : 'No ID yet',
      accentColor: verified ? 'green' : 'yellow',
      href: '/coach/profile',
    },
  ];
}

export function buildCoachWidgetProps<K extends CoachWidgetDefinition['id']>(
  id: K,
  data: CoachHomeData,
  onRefreshData: () => void
): CoachWidgetPropsMap[K] {
  switch (id) {
    case 'stat-strip':
      return { tiles: buildTiles(data) } as CoachWidgetPropsMap[K];
    case 'today-schedule':
      return {
        role: 'coach',
        sessions: data.todaySessions,
        emptyTitle: 'No sessions today',
        emptyDescription:
          'When a client books a session with you, it lands on your calendar — and here first.',
        emptyAction: { label: 'Open your calendar', href: '/coach/calendar' },
        viewAllHref: '/coach/messages?view=board',
      } as CoachWidgetPropsMap[K];
    case 'booking-requests':
      return { requests: data.pendingRequests, onChanged: onRefreshData } as CoachWidgetPropsMap[K];
    case 'students':
      return { students: data.students } as CoachWidgetPropsMap[K];
    case 'rating-reviews':
      return { rating: data.rating, reviews: data.recentReviews } as CoachWidgetPropsMap[K];
    case 'availability':
      return { userId: data.profile.id, currentStatus: data.profile.status } as CoachWidgetPropsMap[K];
    case 'messages':
      return { conversations: data.conversations } as CoachWidgetPropsMap[K];
    case 'showcase':
      return { postCount: data.showcase.postCount, reactsReceived: data.showcase.reactsReceived } as CoachWidgetPropsMap[K];
    case 'next-session':
      return {
        session: data.nextSession,
        emptyCta: { label: 'Open your calendar', href: '/coach/calendar' },
        scheduleHref: '/coach/messages?view=board',
      } as CoachWidgetPropsMap[K];
    case 'dance-events':
      return { events: data.danceEvents } as CoachWidgetPropsMap[K];
    case 'profile-completion':
      return { items: data.checklist, href: '/coach/profile/edit' } as CoachWidgetPropsMap[K];
  }
}

/** Renders every registered coach widget, in priority order. */
export function CoachWidgetGrid({
  data,
  onRefreshData,
}: {
  data: CoachHomeData;
  onRefreshData: () => void;
}) {
  const ordered = [...COACH_WIDGETS].sort((a, b) => b.priority - a.priority);

  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12"
      aria-label="Dashboard widgets"
    >
      {ordered.map((definition) => {
        const Cell = definition.component as React.ComponentType<CoachWidgetPropsMap[typeof definition.id]>;
        const props = buildCoachWidgetProps(definition.id, data, onRefreshData);

        return (
          <div key={definition.id} className={`${SIZE_CLASSES[definition.size]} h-full`}>
            <WidgetBoundary title={definition.title}>
              <Cell {...props} />
            </WidgetBoundary>
          </div>
        );
      })}
    </div>
  );
}

