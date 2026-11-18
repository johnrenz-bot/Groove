/**
 * config/dashboard-widgets.ts
 *
 * The single registry both home dashboards render from. Each entry carries:
 *   id        — stable key, also the props-map key in the renderers
 *   title     — used for the boundary's error label and aria labelling
 *   role      — which dashboard the widget belongs to
 *   size      — grid cell (sm | md | lg | full)
 *   priority  — ordering in the grid (lower renders earlier)
 *   component — the widget component; its props come from the role's props map
 *
 * Sizes on the grid: mobile 1 col, tablet md: 2 cols, desktop lg: 12 cols.
 */

import type { ComponentType } from 'react';
import type {
  ActionItem,
  ChecklistItem,
  DanceEventBrief,
  RecommendedCoach,
  SessionWithClient,
  SessionWithCoach,
  StudentSummary,
} from '@/features/home/types';
import type { ConversationSummary } from '@/lib/messenger/queries';
import { StatStrip, type StatTileInput } from '@/features/home/components/widgets/StatStrip';
import { SessionsPanel, type SessionsPanelProps } from '@/features/home/components/widgets/SessionsPanel';
import { NextSessionCountdown } from '@/features/home/components/widgets/NextSessionCountdown';
import { ActionNeeded } from '@/features/home/components/widgets/ActionNeeded';
import { RecommendedCoachesPanel } from '@/features/home/components/widgets/RecommendedCoaches';
import { CoachStudentsPanel } from '@/features/home/components/widgets/CoachStudentsPanel';
import { UnreadMessages } from '@/features/home/components/widgets/UnreadMessages';
import { DanceEvents } from '@/features/home/components/widgets/DanceEvents';
import { ProfileCompletion } from '@/features/home/components/widgets/ProfileCompletion';
import { StudioLocatorCompact } from '@/features/home/components/widgets/StudioLocatorCompact';
import { GrooveyPrompts } from '@/features/home/components/widgets/GrooveyPrompts';
import { BookingRequests } from '@/features/home/components/widgets/BookingRequests';
import { AvailabilityToggle } from '@/features/home/components/widgets/AvailabilityToggle';
import { RatingReviews } from '@/features/home/components/widgets/RatingReviews';
import { ShowcaseStats } from '@/features/home/components/widgets/ShowcaseStats';
import type { CoachReview } from '@/features/home/types';

export type WidgetSize = 'sm' | 'md' | 'lg' | 'full';

export const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: 'md:col-span-1 lg:col-span-3',
  md: 'md:col-span-1 lg:col-span-4',
  lg: 'md:col-span-2 lg:col-span-8',
  full: 'md:col-span-2 lg:col-span-12',
};

/* ------------------------------- client map -------------------------------- */

export interface ClientWidgetPropsMap {
  'stat-strip': { tiles: StatTileInput[] };
  'upcoming-sessions': SessionsPanelProps;
  'coaches': { coaches: RecommendedCoach[]; clientTalent: string | null };
  'action-needed': { items: ActionItem[] };
  'next-session': {
    session: SessionWithCoach | null;
    emptyCta: { label: string; href: string };
    scheduleHref?: string;
  };
  'studio-locator': Record<string, never>;
  'messages': { conversations: ConversationSummary[] };
  'dance-events': { events: DanceEventBrief[] };
  'profile-completion': { items: ChecklistItem[]; href: string };
  'groovey-prompts': Record<string, never>;
}

export type ClientWidgetDefinition = {
  [K in keyof ClientWidgetPropsMap]: {
    id: K;
    title: string;
    role: 'client';
    size: WidgetSize;
    priority: number;
    component: ComponentType<ClientWidgetPropsMap[K]>;
  };
}[keyof ClientWidgetPropsMap];

export const CLIENT_WIDGETS: readonly ClientWidgetDefinition[] = [
  { id: 'stat-strip', title: 'Quick stats', role: 'client', size: 'full', priority: 100, component: StatStrip },
  { id: 'upcoming-sessions', title: 'Upcoming sessions', role: 'client', size: 'lg', priority: 90, component: SessionsPanel as ComponentType<SessionsPanelProps> },
  { id: 'action-needed', title: 'Action needed', role: 'client', size: 'md', priority: 80, component: ActionNeeded },
  { id: 'coaches', title: 'Recommended coaches', role: 'client', size: 'lg', priority: 70, component: RecommendedCoachesPanel },
  { id: 'next-session', title: 'Next session', role: 'client', size: 'md', priority: 60, component: NextSessionCountdown as ComponentType<ClientWidgetPropsMap['next-session']> },
  { id: 'messages', title: 'Messages', role: 'client', size: 'md', priority: 50, component: UnreadMessages },
  { id: 'studio-locator', title: 'Studio locator', role: 'client', size: 'lg', priority: 40, component: StudioLocatorCompact as ComponentType<Record<string, never>> },
  { id: 'groovey-prompts', title: 'Ask Groovey AI', role: 'client', size: 'md', priority: 35, component: GrooveyPrompts as ComponentType<Record<string, never>> },
  { id: 'dance-events', title: 'Upcoming dance events', role: 'client', size: 'md', priority: 30, component: DanceEvents },
  { id: 'profile-completion', title: 'Profile completion', role: 'client', size: 'md', priority: 20, component: ProfileCompletion },
];

/* ------------------------------- coach map --------------------------------- */

export interface CoachWidgetPropsMap {
  'stat-strip': { tiles: StatTileInput[] };
  'today-schedule': SessionsPanelProps;
  'booking-requests': { requests: SessionWithClient[]; onChanged: () => void };
  'students': { students: StudentSummary[] };
  'rating-reviews': { rating: { average: number; count: number } | null; reviews: CoachReview[] };
  'availability': { userId: string; currentStatus: string | null };
  'messages': { conversations: ConversationSummary[] };
  'showcase': { postCount: number | null; reactsReceived: number | null };
  'next-session': {
    session: SessionWithClient | null;
    emptyCta: { label: string; href: string };
    scheduleHref?: string;
  };
  'dance-events': { events: DanceEventBrief[] };
  'profile-completion': { items: ChecklistItem[]; href: string };
}

export type CoachWidgetDefinition = {
  [K in keyof CoachWidgetPropsMap]: {
    id: K;
    title: string;
    role: 'coach';
    size: WidgetSize;
    priority: number;
    component: ComponentType<CoachWidgetPropsMap[K]>;
  };
}[keyof CoachWidgetPropsMap];

export const COACH_WIDGETS: readonly CoachWidgetDefinition[] = [
  { id: 'stat-strip', title: 'Quick stats', role: 'coach', size: 'full', priority: 100, component: StatStrip },
  { id: 'today-schedule', title: "Today's schedule", role: 'coach', size: 'lg', priority: 90, component: SessionsPanel as ComponentType<SessionsPanelProps> },
  { id: 'booking-requests', title: 'Booking requests', role: 'coach', size: 'md', priority: 80, component: BookingRequests },
  { id: 'students', title: 'Students', role: 'coach', size: 'lg', priority: 70, component: CoachStudentsPanel },
  { id: 'rating-reviews', title: 'Rating and reviews', role: 'coach', size: 'md', priority: 60, component: RatingReviews },
  { id: 'availability', title: 'Availability', role: 'coach', size: 'sm', priority: 55, component: AvailabilityToggle },
  { id: 'next-session', title: 'Next session', role: 'coach', size: 'sm', priority: 50, component: NextSessionCountdown as ComponentType<CoachWidgetPropsMap['next-session']> },
  { id: 'messages', title: 'Messages', role: 'coach', size: 'md', priority: 45, component: UnreadMessages },
  { id: 'showcase', title: 'Showcase performance', role: 'coach', size: 'md', priority: 40, component: ShowcaseStats },
  { id: 'dance-events', title: 'Upcoming dance events', role: 'coach', size: 'md', priority: 30, component: DanceEvents },
  { id: 'profile-completion', title: 'Profile completion', role: 'coach', size: 'md', priority: 20, component: ProfileCompletion },
];
