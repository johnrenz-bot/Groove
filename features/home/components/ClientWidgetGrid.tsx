'use client';

/**
 * Client dashboard — renders the registry in order, one bounded cell each.
 *
 * The page owns the data (it fetched once via homeService); this file maps it
 * onto the registry's props and lets the grid flow the rest.
 */

import React from 'react';
import {
  Calendar,
  MessageSquare,
  BadgeCheck,
  UserRoundCheck,
} from 'lucide-react';
import {
  CLIENT_WIDGETS,
  SIZE_CLASSES,
  type ClientWidgetDefinition,
  type ClientWidgetPropsMap,
} from '@/config/dashboard-widgets';
import { WidgetBoundary } from './widgets/WidgetShell';
import type { ClientHomeData } from '../types';
import type { StatTileInput } from './widgets/StatStrip';

/** Tiles for the full-width stat strip. All numbers are computed, never invented. */
function buildTiles(data: ClientHomeData): StatTileInput[] {
  const verified = Boolean(data.profile.account_verified);
  return [
    {
      icon: <Calendar className="h-5 w-5" />,
      value: data.upcomingCount,
      label: 'Upcoming Bookings',
      sub: 'Sessions scheduled',
      accentColor: 'yellow',
      href: '/client/messages?view=board',
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      value: data.statUnreadMessages,
      label: 'Unread Messages',
      sub: 'Open inbox',
      accentColor: 'blue',
      href: '/client/messages',
    },
    {
      icon: <BadgeCheck className="h-5 w-5" />,
      value: data.statCoachesNearby,
      label: 'Coaches Nearby',
      sub: 'Verified in SJDM',
      accentColor: 'green',
      href: '/client/talent',
    },
    {
      icon: <UserRoundCheck className="h-5 w-5" />,
      value: verified ? 'Verified' : 'Pending',
      label: 'Account Status',
      sub: data.profile.custom_id ? `#${data.profile.custom_id}` : 'No ID yet',
      accentColor: verified ? 'green' : 'yellow',
      href: '/client/profile',
    },
  ];
}

export function buildClientWidgetProps<K extends ClientWidgetDefinition['id']>(
  id: K,
  data: ClientHomeData
): ClientWidgetPropsMap[K] {
  switch (id) {
    case 'stat-strip':
      return { tiles: buildTiles(data) } as ClientWidgetPropsMap[K];
    case 'upcoming-sessions':
      return {
        role: 'client',
        sessions: data.upcomingSessions,
        emptyTitle: 'No sessions yet',
        emptyDescription:
          'Book your first rehearsal with a coach near San Jose del Monte — it will show up right here.',
        emptyAction: { label: 'Find a Coach', href: '/client/talent' },
        viewAllHref: '/client/messages?view=board',
      } as ClientWidgetPropsMap[K];
    case 'coaches':
      return { coaches: data.recommendedCoaches, clientTalent: data.clientTalent } as ClientWidgetPropsMap[K];
    case 'action-needed':
      return { items: data.actionItems } as ClientWidgetPropsMap[K];
    case 'next-session':
      return {
        session: data.nextSession,
        emptyCta: { label: 'Find a Coach', href: '/client/talent' },
        scheduleHref: '/client/messages?view=board',
      } as ClientWidgetPropsMap[K];
    case 'studio-locator':
      return {} as ClientWidgetPropsMap[K];
    case 'groovey-prompts':
      return {} as ClientWidgetPropsMap[K];
    case 'messages':
      return { conversations: data.conversations } as ClientWidgetPropsMap[K];
    case 'dance-events':
      return { events: data.danceEvents } as ClientWidgetPropsMap[K];
    case 'profile-completion':
      return { items: data.checklist, href: '/client/profile/edit' } as ClientWidgetPropsMap[K];
  }
}

/** Renders every registered client widget, in priority order. */
export function ClientWidgetGrid({ data }: { data: ClientHomeData }) {
  const ordered = [...CLIENT_WIDGETS].sort((a, b) => b.priority - a.priority);

  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12"
      aria-label="Dashboard widgets"
    >
      {ordered.map((definition) => {
        const Cell = definition.component as React.ComponentType<ClientWidgetPropsMap[typeof definition.id]>;
        const props = buildClientWidgetProps(definition.id, data);

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

