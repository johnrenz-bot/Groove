/**
 * Shared shapes for the home dashboards (client + coach).
 *
 * Everything here comes from a real query against the GroovePH database —
 * no widget may invent a number, a name, or an event. If the database has
 * nothing, the widget gets an empty state, never a fabricated zero.
 */

import type { Appointment, FullCoach, Profile } from '@/lib/types';
import type { ConversationSummary } from '@/lib/messenger/queries';

export interface SessionWithCoach extends Appointment {
  coach: Profile | null;
}

export interface SessionWithClient extends Appointment {
  client: Profile | null;
}

export interface DanceEventBrief {
  id: string;
  title: string;
  organization: string | null;
  location: string | null;
  event_date: string;
  source_url: string;
  category: string | null;
}

/** One row of the profile-completion checklist. `href` deep-links to the fix. */
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

export interface ActionItem {
  id: string;
  kind: 'agreement' | 'booking';
  title: string;
  subtitle: string;
  href: string;
}

/** A recommended coach with their real average rating (if any). */
export type RecommendedCoach = FullCoach & {
  rating: { average: number; count: number } | null;
};

/** Per-widget data contract for the client dashboard. */
export interface ClientHomeData {
  profile: Profile;
  /** Exact count of upcoming (today onward) sessions, not the length of a page. */
  upcomingCount: number;
  statUnreadMessages: number;
  statCoachesNearby: number;
  /** The client's stated discipline, used to explain coach matches. */
  clientTalent: string | null;
  upcomingSessions: SessionWithCoach[];
  nextSession: SessionWithCoach | null;
  actionItems: ActionItem[];
  recommendedCoaches: RecommendedCoach[];
  conversations: ConversationSummary[];
  danceEvents: DanceEventBrief[];
  checklist: ChecklistItem[];
  profilePhoto: string | null;
}

/** Per-widget data contract for the coach dashboard. */
export interface CoachHomeData {
  profile: Profile;
  coachProfile: CoachProfileRow | null;
  todaySessions: SessionWithClient[];
  upcomingCount: number;
  statUnreadMessages: number;
  pendingRequests: SessionWithClient[];
  nextSession: SessionWithClient | null;
  rating: { average: number; count: number } | null;
  recentReviews: CoachReview[];
  showcase: { postCount: number | null; reactsReceived: number | null };
  danceEvents: DanceEventBrief[];
  checklist: ChecklistItem[];
  profilePhoto: string | null;
  conversations: ConversationSummary[];
  students: StudentSummary[];
}

export interface StudentSummary {
  id: string;
  firstname: string;
  lastname: string;
  photo_url: string | null;
  talent: string | null;
}

export interface CoachProfileRow {
  service_fee?: number | null;
  duration?: string | null;
  talents?: string | null;
  genres?: string | null;
  valid_id_path?: string | null;
  id_selfie_path?: string | null;
}

export interface CoachReview {
  id: number | string;
  rating: number;
  comment: string;
  created_at: string;
  reviewerName: string;
  reviewerPhoto: string | null;
}

/* ------------------------------ test accounts ------------------------------ */

const TEST_NAME_RE = /^(test|demo|fake|sample|mock|dummy)/i;

/**
 * Whether an account is a test/demo/fake artifact rather than a real member.
 *
 * There is no `is_test` flag in this schema, so the check is name-shaped:
 * a leading test-ish token on firstname, lastname, username or email. Live
 * coaches (Vimi, Chips, HQ) never match; 'Test Client' matches on firstname.
 */
export function isTestAccount(identity: {
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string | null;
}): boolean {
  const first = identity.firstname?.trim() ?? '';
  const last = identity.lastname?.trim() ?? '';
  const username = identity.username?.trim() ?? '';
  const email = identity.email?.trim() ?? '';
  return TEST_NAME_RE.test(first) || TEST_NAME_RE.test(last) || TEST_NAME_RE.test(username) || TEST_NAME_RE.test(email);
}

/** PostgREST `.not(column, 'ilike', 'test%')` filters for the common test names. */
export const TEST_ACCOUNT_NOT_FILTERS: Array<[string, string, string]> = [
  ['firstname', 'ilike', 'test%'],
  ['firstname', 'ilike', 'demo%'],
  ['firstname', 'ilike', 'fake%'],
  ['username', 'ilike', 'test%'],
  ['username', 'ilike', 'demo%'],
  ['username', 'ilike', 'fake%'],
];
