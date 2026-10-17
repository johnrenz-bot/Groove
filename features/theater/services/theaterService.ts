import type { DanceUpdateRecord } from '@/features/dance/services/danceService';
import { isUpcomingEvent } from '@/features/dance/services/danceService';
import { VERIFIED_THEATER_UPDATES } from '../data/theaterUpdates';
import { DEFAULT_LIMIT, MAX_LIMIT } from '@/lib/dance/constants';

export const FALLBACK_THEATER_UPDATES: DanceUpdateRecord[] = VERIFIED_THEATER_UPDATES;

export async function getPublishedTheaterUpdates(params: {
  region?: string;
  category?: string;
  org?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(MAX_LIMIT, params.limit || DEFAULT_LIMIT);

  let filtered = [...FALLBACK_THEATER_UPDATES];

  if (params.region && params.region !== 'all') {
    const reg = params.region.toLowerCase();
    filtered = filtered.filter((u) => u.region?.toLowerCase().includes(reg));
  }

  if (params.category && params.category !== 'all') {
    filtered = filtered.filter((u) => u.category === params.category);
  }

  if (params.org && params.org !== 'all') {
    const org = params.org.toLowerCase();
    filtered = filtered.filter((u) => u.organization.toLowerCase().includes(org));
  }

  if (params.q && params.q.trim()) {
    const q = params.q.toLowerCase().trim();
    filtered = filtered.filter(
      (u) =>
        u.title.toLowerCase().includes(q) ||
        u.summary.toLowerCase().includes(q) ||
        u.organization.toLowerCase().includes(q) ||
        (u.location && u.location.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    updates: paginated,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    source: 'local_verified',
  };
}

export async function getUpcomingTheaterEvents() {
  const upcoming = FALLBACK_THEATER_UPDATES.filter(
    (u) =>
      u.event_date &&
      ['competition', 'workshop', 'event'].includes(u.category) &&
      isUpcomingEvent(u)
  ).sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());

  return {
    events: upcoming,
    total: upcoming.length,
    source: 'local_verified',
  };
}
