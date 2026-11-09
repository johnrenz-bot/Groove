import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { DanceUpdateInput } from '@/lib/dance/schema';
import { isUpcomingEvent } from '../../dance/services/danceService.ts';
import { VERIFIED_THEATER_UPDATES } from '../data/theaterUpdates.ts';
import { DEFAULT_LIMIT, MAX_LIMIT, UPCOMING_CATEGORIES } from '../../../lib/dance/constants.ts';
import { resolveVerifiedItemImage } from '../../../lib/dance/imageVerification.ts';
import { buildOrContains } from '../../../lib/postgrest.ts';
import { isImageUsedGlobally } from '../../../lib/dance/globalImageDedup.ts';

export type TheaterUpdateRecord = DanceUpdateInput & {
  id: string | number;
  created_at: string;
  updated_at?: string;
  image_credit?: string | null;
  image_verified?: boolean;
  image_source_url?: string | null;
  image_alt?: string | null;
  image_fallback_reason?: string | null;
};

export function getTheaterServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const FALLBACK_THEATER_UPDATES: TheaterUpdateRecord[] = VERIFIED_THEATER_UPDATES as TheaterUpdateRecord[];

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
  const offset = (page - 1) * limit;

  try {
    const supabase = getTheaterServerClient();

    let query = supabase
      .from('theater_updates')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (params.region && params.region !== 'all') {
      query = query.ilike('region', `%${params.region}%`);
    }
    if (params.category && params.category !== 'all') {
      query = query.eq('category', params.category);
    }
    if (params.org && params.org !== 'all') {
      query = query.ilike('organization', `%${params.org}%`);
    }
    if (params.q && params.q.trim()) {
      const term = params.q.trim();
      query = query.or(buildOrContains(['title', 'summary', 'organization'], term));
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error || !data || data.length === 0) {
      return filterFallback(params, page, limit);
    }

    return {
      updates: data as TheaterUpdateRecord[],
      total: count ?? data.length,
      page,
      limit,
      totalPages: Math.ceil((count ?? data.length) / limit),
      source: 'database',
    };
  } catch {
    return filterFallback(params, page, limit);
  }
}

function filterFallback(params: any, page: number, limit: number) {
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
    source: 'fallback',
  };
}

export async function getUpcomingTheaterEvents(opts: { now?: Date; timeZone?: string } = {}) {
  const now = opts.now ?? new Date();
  const timeZone = opts.timeZone ?? 'Asia/Manila';

  function selectUpcoming(updates: TheaterUpdateRecord[]) {
    return updates
      .filter((u) => (['event', 'competition'] as readonly string[]).includes(u.category as string) || u.category === 'workshop')
      .filter((u) => isUpcomingEvent(u as any, now, timeZone))
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
  }

  try {
    const supabase = getTheaterServerClient();
    const { data, error } = await supabase
      .from('theater_updates')
      .select('*')
      .eq('status', 'published')
      .in('category', ['event', 'competition', 'workshop'])
      .not('event_date', 'is', null)
      .gte('event_date', now.toISOString())
      .order('event_date', { ascending: true })
      .limit(10);

    if (error || !data || !data.length) {
      const ev = selectUpcoming(FALLBACK_THEATER_UPDATES);
      return { events: ev, total: ev.length, source: 'fallback' };
    }
    return { events: data as TheaterUpdateRecord[], total: data.length, source: 'database' };
  } catch {
    const ev = selectUpcoming(FALLBACK_THEATER_UPDATES);
    return { events: ev, total: ev.length, source: 'fallback' };
  }
}

export async function ingestTheaterUpdates(updates: DanceUpdateInput[]) {
  const supabase = getTheaterServerClient();
  const seenImageUrls = new Set<string>();

  const processedRows = await Promise.all(
    updates.map(async (item) => {
      let finalImageUrl: string | null = item.image_url || null;
      let finalImageCredit: string | null = item.image_credit || null;
      let finalImageVerified: boolean = item.image_verified ?? false;
      const finalImageSourceUrl: string | null = (item as any).image_source_url ?? null;
      let finalFallbackReason: string | null = (item as any).image_fallback_reason ?? null;

      if (finalImageUrl && !finalImageVerified) {
        const result = await resolveVerifiedItemImage(item.source_url, item.organization, finalImageUrl);
        finalImageUrl = result.imageUrl;
        finalImageCredit = result.imageCredit;
        finalImageVerified = result.imageVerified;
        if (!finalImageUrl && result.fallbackReason) finalFallbackReason = result.fallbackReason;
      }

      if (finalImageUrl) {
        if (seenImageUrls.has(finalImageUrl)) {
          finalImageUrl = null;
          finalImageCredit = null;
          finalImageVerified = false;
          finalFallbackReason = 'the same official photo is already used by another card; showing the branded fallback rather than repeating it';
        } else {
          seenImageUrls.add(finalImageUrl);
        }
      }

      if (finalImageUrl) {
        if (await isImageUsedGlobally(finalImageUrl)) {
          finalImageUrl = null;
          finalImageCredit = null;
          finalImageVerified = false;
          finalFallbackReason = 'this official photo is already used in another performing-arts category; showing the branded fallback instead of repeating it';
        }
      }

      if (!finalImageUrl && !finalFallbackReason) {
        finalFallbackReason = 'no official source image could be verified for this update';
      }
      if (finalImageUrl) finalFallbackReason = null;

      return {
        title: item.title,
        summary: item.summary,
        summary_tl: item.summary_tl || null,
        category: item.category,
        organization: item.organization,
        region: item.region || null,
        event_date: item.event_date || null,
        location: item.location || null,
        source_url: item.source_url,
        image_url: finalImageUrl,
        image_credit: finalImageCredit,
        image_source_url: finalImageSourceUrl,
        image_fallback_reason: finalFallbackReason,
        image_verified: finalImageVerified,
        image_alt: (item as any).image_alt || null,
        tags: item.tags || null,
        published_at: item.published_at || new Date().toISOString(),
        status: item.status || 'published',
        updated_at: new Date().toISOString(),
      };
    })
  );

  try {
    const { data, error } = await supabase
      .from('theater_updates')
      .upsert(processedRows, { onConflict: 'source_url,title' })
      .select('id');

    if (error) {
      console.warn('[ingestTheaterUpdates] Database upsert notice:', error.message);
      return { inserted: 0, updated: 0, total: updates.length };
    }
    return { inserted: data?.length || updates.length, updated: 0, total: updates.length };
  } catch (err: unknown) {
    console.warn('[ingestTheaterUpdates] Database connection notice:', err instanceof Error ? err.message : err);
    return { inserted: 0, updated: 0, total: updates.length };
  }
}

export async function logAgentRun(run: {
  status: 'success' | 'failure' | 'partial';
  items_found: number;
  items_inserted: number;
  error?: string | null;
  started_at: string;
  finished_at: string;
}) {
  try {
    const supabase = getTheaterServerClient();
    await supabase.from('agent_runs').insert({
      status: run.status,
      items_found: run.items_found,
      items_inserted: run.items_inserted,
      error: run.error || null,
      started_at: run.started_at,
      finished_at: run.finished_at,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log agent run:', err);
  }
}
