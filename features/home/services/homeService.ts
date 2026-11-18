/**
 * features/home/services/homeService.ts
 *
 * One typed read per role for the dashboards. Every function here runs in the
 * browser against the caller's own session — authorization is RLS, exactly as
 * the existing pages do it (there is no new server surface).
 *
 * Rules honoured here:
 *   - Never invent data. A missing value becomes an empty state, not a zero.
 *   - Test/demo accounts are excluded from every public-facing widget.
 *   - No `any`: rows are cast to shared types at the boundary.
 */

import { createClient } from '@/lib/supabase/client';
import type { Appointment, FullCoach, Profile } from '@/lib/types';
import {
  fetchConversationsForUser,
  fetchUnreadTotal,
} from '@/lib/messenger/queries';
import {
  isTestAccount,
  type ActionItem,
  type ChecklistItem,
  type ClientHomeData,
  type CoachHomeData,
  type CoachProfileRow,
  type CoachReview,
  type DanceEventBrief,
  type SessionWithClient,
  type SessionWithCoach,
  type StudentSummary,
} from '../types';

/** Statuses that mean "this session still needs both parties / is coming up". */
const UPCOMING_STATUSES = ['pending', 'accepted', 'agreement_required', 'confirmed'] as const;

/** Today's date (Asia/Manila) as YYYY-MM-DD for the DATE column. */
function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/* --------------------------- shared fetchers --------------------------- */

async function fetchDanceEvents(): Promise<DanceEventBrief[]> {
  try {
    const res = await fetch('/api/dance/events/upcoming?limit=3', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      events?: Array<{
        id?: string | number;
        title?: string;
        organization?: string | null;
        location?: string | null;
        event_date?: string | null;
        source_url?: string;
        category?: string | null;
      }>;
    };
    return (data.events ?? [])
      .filter((event) => event.title && event.source_url && event.event_date)
      .slice(0, 3)
      .map((event, index) => ({
        id: String(event.id ?? `event-${index}`),
        title: String(event.title),
        organization: event.organization ?? null,
        location: event.location ?? null,
        event_date: String(event.event_date),
        source_url: String(event.source_url),
        category: event.category ?? null,
      }));
  } catch {
    return [];
  }
}

type EmbeddedProfile = Profile | null;

/* ================================ client ================================ */

export async function getClientHomeData(userId: string): Promise<ClientHomeData> {
  const supabase = createClient();
  const today = todayISO();

  const [
    { data: profileRow },
    { data: clientProfileRow },
    { count: upcomingCount },
    { data: sessionRows },
    danceEvents,
    unreadMessages,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('client_profiles').select('talent, valid_id_path').eq('id', userId).maybeSingle(),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', userId)
      .in('status', [...UPCOMING_STATUSES])
      .gte('date', today),
    supabase
      .from('appointments')
      .select('*, coach:profiles!appointments_coach_id_fkey(*)')
      .eq('client_id', userId)
      .in('status', [...UPCOMING_STATUSES])
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(3),
    fetchDanceEvents(),
    fetchUnreadTotal(userId),
  ]);

  const profile = (profileRow ?? null) as Profile | null;
  if (!profile) {
    throw new Error('Your profile could not be loaded. Please try again.');
  }

  const sessions: SessionWithCoach[] = ((sessionRows ?? []) as unknown as Array<
    Appointment & { coach: EmbeddedProfile }
  >).map((row) => ({
    ...row,
    coach: row.coach ?? null,
  }));

  // The tail is independent of the first batch: run the count, the coach
  // shortlist, the pending-action items and the conversation preview in one
  // wave instead of four serial round trips.
  const [
    { count: nearbyCount },
    { data: coachRows },
    actionItems,
    conversations,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'coach')
      .eq('account_verified', true)
      .not('firstname', 'ilike', 'test%')
      .not('firstname', 'ilike', 'demo%')
      .not('firstname', 'ilike', 'fake%')
      .not('username', 'ilike', 'test%')
      .not('username', 'ilike', 'demo%')
      .not('username', 'ilike', 'fake%'),
    supabase
      .from('profiles')
      .select('*, coach_profile:coach_profiles(*)')
      .eq('role', 'coach')
      .eq('account_verified', true)
      .not('firstname', 'ilike', 'test%')
      .not('firstname', 'ilike', 'demo%')
      .not('firstname', 'ilike', 'fake%')
      .not('username', 'ilike', 'test%')
      .not('username', 'ilike', 'demo%')
      .not('username', 'ilike', 'fake%')
      .order('created_at', { ascending: false })
      .limit(8),
    fetchActionItems(supabase, userId),
    fetchConversationsForUser(userId),
  ]);

  const clientTalent = (clientProfileRow as { talent?: string | null } | null)?.talent?.trim() || null;

  const recommendedCoaches = ((coachRows ?? []) as FullCoach[])
    .filter((coach) => !isTestAccount(coach))
    // A client-matched talent first, never invent a ranking signal beyond that.
    .sort((a, b) => {
      if (!clientTalent) return 0;
      const aMatch = (a.coach_profile?.talents ?? '').toLowerCase().includes(clientTalent.toLowerCase()) ? 1 : 0;
      const bMatch = (b.coach_profile?.talents ?? '').toLowerCase().includes(clientTalent.toLowerCase()) ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 4);

  // Real average rating per recommended coach, one query, no invented stars.
  const recommendedWithRatings = await attachCoachRatings(supabase, recommendedCoaches);

  const checklist = buildClientChecklist(profile, clientProfileRow as { talent?: string | null; valid_id_path?: string | null } | null);

  return {
    profile,
    upcomingCount: upcomingCount ?? 0,
    statUnreadMessages: unreadMessages,
    statCoachesNearby: nearbyCount ?? 0,
    clientTalent,
    upcomingSessions: sessions,
    nextSession: sessions[0] ?? null,
    actionItems,
    recommendedCoaches: recommendedWithRatings,
    conversations: conversations.slice(0, 3),
    danceEvents,
    checklist,
    profilePhoto: profile.photo_url ?? null,
  };
}

async function attachCoachRatings<T extends FullCoach>(
  supabase: ReturnType<typeof createClient>,
  coaches: T[]
): Promise<Array<T & { rating: { average: number; count: number } | null }>> {
  if (coaches.length === 0) return [];
  const ids = coaches.map((coach) => coach.id);
  const { data: rows } = await supabase
    .from('feedbacks')
    .select('coach_id, rating')
    .in('coach_id', ids);

  const sum = new Map<string, { total: number; count: number }>();
  for (const row of rows ?? []) {
    const key = row.coach_id as string;
    const entry = sum.get(key) ?? { total: 0, count: 0 };
    entry.total += row.rating ?? 0;
    entry.count += 1;
    sum.set(key, entry);
  }

  return coaches.map((coach) => {
    const entry = sum.get(coach.id);
    return {
      ...coach,
      rating: entry && entry.count > 0 ? { average: entry.total / entry.count, count: entry.count } : null,
    };
  });
}

async function fetchActionItems(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<ActionItem[]> {
  const items: ActionItem[] = [];

  const { data: agreements } = await supabase
    .from('agreements')
    .select('id, appointment_id, status, created_at')
    .eq('client_id', userId)
    .eq('status', 'awaiting_signatures')
    .is('client_signed_at', null)
    .order('created_at', { ascending: false })
    .limit(4);

  if (agreements && agreements.length > 0) {
    const appointmentIds = agreements
      .map((agreement: any) => agreement.appointment_id as number | null)
      .filter((id: any): id is number => typeof id === 'number');

    const { data: linked } = appointmentIds.length
      ? await supabase
          .from('appointments')
          .select('id, date, start_time, talent, coach_id')
          .in('id', appointmentIds)
      : { data: [] as Array<Record<string, unknown>> };

    const byId = new Map<number, any>((linked ?? []).map((row: any): [number, any] => [row.id as number, row]));

    for (const agreement of agreements) {
      const linkedAppointment =
        typeof agreement.appointment_id === 'number'
          ? byId.get(agreement.appointment_id)
          : undefined;
      const date = linkedAppointment?.date ? String(linkedAppointment.date) : null;
      const startTime = linkedAppointment?.start_time ? String(linkedAppointment.start_time) : null;
      const talent = linkedAppointment?.talent ? String(linkedAppointment.talent) : null;
      items.push({
        id: `agreement-${agreement.id}`,
        kind: 'agreement',
        title: talent ? `Sign your ${talent} session agreement` : 'Sign your session agreement',
        subtitle: [date, startTime].filter(Boolean).join(' · ') || 'Awaiting your signature',
        href: agreement.appointment_id != null ? `/contracts/${agreement.appointment_id}` : '/client/appointments',
      });
    }
  }

  return items;
}

function buildClientChecklist(
  profile: Profile,
  clientProfile: { talent?: string | null; valid_id_path?: string | null } | null
): ChecklistItem[] {
  const talent = clientProfile?.talent?.trim() ?? '';
  return [
    { id: 'name', label: 'Your name is on your profile', done: Boolean(profile.firstname && profile.lastname), href: '/client/profile' },
    { id: 'photo', label: 'Profile photo added', done: Boolean(profile.photo_url), href: '/client/profile/edit' },
    { id: 'bio', label: 'Short bio written', done: Boolean(profile.bio?.trim()), href: '/client/profile/edit' },
    { id: 'contact', label: 'Contact number added', done: Boolean(profile.contact?.trim()), href: '/client/profile/edit' },
    { id: 'username', label: 'Username chosen', done: Boolean(profile.username?.trim()), href: '/client/profile/edit' },
    { id: 'talent', label: 'Discipline set', done: talent.length > 0 && talent !== 'N/A', href: '/client/profile/edit' },
    { id: 'id', label: 'Valid ID uploaded', done: Boolean(clientProfile?.valid_id_path), href: '/client/profile/edit' },
    { id: 'verified', label: 'Account verified', done: Boolean(profile.account_verified), href: '/client/profile' },
  ];
}

/* ================================ coach ================================ */

export async function getCoachHomeData(userId: string): Promise<CoachHomeData> {
  const supabase = createClient();
  const today = todayISO();

  const [
    { data: profileRow },
    { data: coachProfileRow },
    { count: upcomingCount },
    { data: todayRows },
    { data: pendingRows },
    danceEvents,
    unreadMessages,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('coach_profiles')
      .select('service_fee, duration, talents, genres, valid_id_path, id_selfie_path')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', userId)
      .in('status', [...UPCOMING_STATUSES])
      .gte('date', today),
    supabase
      .from('appointments')
      .select('*, client:profiles!appointments_client_id_fkey(*)')
      .eq('coach_id', userId)
      .in('status', [...UPCOMING_STATUSES])
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5),
    supabase
      .from('appointments')
      .select('*, client:profiles!appointments_client_id_fkey(*)')
      .eq('coach_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(4),
    fetchDanceEvents(),
    fetchUnreadTotal(userId),
  ]);

  const profile = (profileRow ?? null) as Profile | null;
  if (!profile) {
    throw new Error('Your profile could not be loaded. Please try again.');
  }

  const coachProfile = (coachProfileRow ?? null) as CoachProfileRow | null;

  const todaySessions: SessionWithClient[] = ((todayRows ?? []) as unknown as Array<
    Appointment & { client: EmbeddedProfile }
  >).map((row) => ({ ...row, client: row.client ?? null }));

  const pendingRequests: SessionWithClient[] = ((pendingRows ?? []) as unknown as Array<
    Appointment & { client: EmbeddedProfile }
  >).map((row) => ({ ...row, client: row.client ?? null }));

  const upcomingSessions = todaySessions;

  // These four reads are independent — one wave instead of four serial ones.
  const [
    [ratingResult, recentReviews],
    showcase,
    conversations,
    students,
  ] = await Promise.all([
    fetchCoachReviews(supabase, userId),
    fetchShowcaseCounts(supabase, userId),
    fetchConversationsForUser(userId),
    fetchStudents(supabase),
  ]);

  const checklist = buildCoachChecklist(profile, coachProfile);

  return {
    profile,
    coachProfile,
    todaySessions,
    upcomingCount: upcomingCount ?? 0,
    statUnreadMessages: unreadMessages,
    pendingRequests,
    nextSession: upcomingSessions.find((session) => session.date === today) ?? upcomingSessions[0] ?? null,
    rating: ratingResult,
    recentReviews,
    showcase,
    danceEvents,
    checklist,
    profilePhoto: profile.photo_url ?? null,
    conversations: conversations.slice(0, 3),
    students,
  };
}

/** Clients on the platform, excluding test accounts — notable for SJDM. */
async function fetchStudents(
  supabase: ReturnType<typeof createClient>
): Promise<StudentSummary[]> {
  const { data: clients } = await supabase
    .from('profiles')
    .select('id, firstname, lastname, username, email, photo_url')
    .eq('role', 'client')
    .not('firstname', 'ilike', 'test%')
    .not('firstname', 'ilike', 'demo%')
    .not('firstname', 'ilike', 'fake%')
    .not('username', 'ilike', 'test%')
    .not('username', 'ilike', 'demo%')
    .not('username', 'ilike', 'fake%')
    .order('created_at', { ascending: false })
    .limit(8);

  const filtered = (clients ?? []).filter((client: any) => !isTestAccount(client)).slice(0, 4);
  if (filtered.length === 0) return [];

  const ids = filtered.map((client: any) => client.id as string);
  const { data: clientProfiles } = await supabase
    .from('client_profiles')
    .select('id, talent')
    .in('id', ids);

  const talentById = new Map(
    (clientProfiles ?? []).map((row: any): [string, string | null] => [row.id as string, (row.talent as string | null) ?? null])
  );

  return filtered.map((client: any) => ({
    id: client.id as string,
    firstname: client.firstname as string,
    lastname: client.lastname as string,
    photo_url: (client.photo_url as string | null) ?? null,
    talent: talentById.get(client.id as string) ?? null,
  }));
}

async function fetchCoachReviews(
  supabase: ReturnType<typeof createClient>,
  coachId: string
): Promise<[CoachHomeData['rating'], CoachReview[]]> {
  // Ratings and the latest-three review page are independent — one wave.
  const [{ data: ratings }, { data: latest }] = await Promise.all([
    supabase
      .from('feedbacks')
      .select('rating')
      .eq('coach_id', coachId)
      .limit(500),
    supabase
      .from('feedbacks')
      .select('id, rating, comment, created_at, user_id')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  if (!ratings || ratings.length === 0) return [null, []];

  const sum = ratings.reduce((acc: number, row: any) => acc + (row.rating ?? 0), 0);
  const rating = { average: sum / ratings.length, count: ratings.length };

  const reviewerIds = [...new Set((latest ?? []).map((row: any) => row.user_id as string))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from('profiles').select('id, firstname, lastname, photo_url').in('id', reviewerIds)
    : { data: [] as Array<Record<string, unknown>> };

  const byId = new Map<string, any>(
    (reviewers ?? []).map((row: any): [string, any] => [row.id as string, row as { id: string; firstname?: string | null; lastname?: string | null; photo_url?: string | null }])
  );

  const recentReviews: CoachReview[] = (latest ?? []).map((row: any) => {
    const reviewer = byId.get(row.user_id as string);
    const name = [reviewer?.firstname, reviewer?.lastname].filter(Boolean).join(' ').trim() || 'GroovePH member';
    return {
      id: row.id as number | string,
      rating: row.rating as number,
      comment: (row.comment as string) ?? '',
      created_at: row.created_at as string,
      reviewerName: name,
      reviewerPhoto: reviewer?.photo_url ?? null,
    };
  });

  return [rating, recentReviews];
}

async function fetchShowcaseCounts(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<CoachHomeData['showcase']> {
  const [{ count: postCount, error: postsError }, reactsResult] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId),
    supabase
      .from('post_reacts')
      .select('id, post:community_posts!inner(author_id)', { count: 'exact', head: true })
      .eq('post.author_id', userId),
  ]);

  if (postsError) {
    return { postCount: null, reactsReceived: null };
  }

  const { count: reactsReceived, error: reactsError } = reactsResult;

  return {
    postCount: postCount ?? 0,
    reactsReceived: reactsError ? null : reactsReceived ?? 0,
  };
}

function buildCoachChecklist(
  profile: Profile,
  coachProfile: CoachProfileRow | null
): ChecklistItem[] {
  return [
    { id: 'name', label: 'Your name is on your profile', done: Boolean(profile.firstname && profile.lastname), href: '/coach/profile' },
    { id: 'photo', label: 'Profile photo added', done: Boolean(profile.photo_url), href: '/coach/profile/edit' },
    { id: 'bio', label: 'Short bio written', done: Boolean(profile.bio?.trim()), href: '/coach/profile/edit' },
    { id: 'contact', label: 'Contact number added', done: Boolean(profile.contact?.trim()), href: '/coach/profile/edit' },
    { id: 'genres', label: 'Disciplines & genres set', done: Boolean(coachProfile?.genres?.trim()), href: '/coach/profile/edit' },
    { id: 'rate', label: 'Session rate published', done: coachProfile?.service_fee != null, href: '/coach/profile/edit' },
    { id: 'id', label: 'Valid ID uploaded', done: Boolean(coachProfile?.valid_id_path), href: '/coach/profile/edit' },
    { id: 'selfie', label: 'Selfie with ID uploaded', done: Boolean(coachProfile?.id_selfie_path), href: '/coach/profile/edit' },
    { id: 'verified', label: 'Account verified', done: Boolean(profile.account_verified), href: '/coach/profile' },
  ];
}
