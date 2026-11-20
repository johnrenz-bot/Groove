/**
 * Shared implementation for the four performing-arts discipline feeds
 * (dance / singing / acting / theater). One pipeline, four configurations —
 * see `features/discipline/config.ts`.
 *
 * The per-discipline modules (features/dance, features/singing, …) are thin
 * factories that call `createDisciplineService(id, fallbackUpdates)` and
 * re-export under their historic names. Everything here runs server-side
 * (API routes, agents, scripts):
 *   - reads use the service-role-or-anon fallback client (lib/supabase/serviceClient.ts)
 *   - writes additionally pass through the zod schema and the image
 *     verification chain (resolveVerifiedItemImage + global dedup)
 *   - every failure degrades to the curated `fallbackUpdates` rather than
 *     throwing to the page
 */
import { createPerformingArtsServerClient } from '../../../lib/supabase/serviceClient.ts';
import type { DanceUpdateInput } from '@/lib/dance/schema';
import { buildOrContains, buildAnyContains } from '../../../lib/postgrest.ts';
import { DEFAULT_LIMIT, MAX_LIMIT, UPCOMING_CATEGORIES } from '../../../lib/dance/constants.ts';
import { resolveVerifiedItemImage } from '../../../lib/dance/imageVerification.ts';
import { isImageUsedGlobally } from '../../../lib/dance/globalImageDedup.ts';
import type {
  DisciplineId,
  DisciplineUpdateRecord,
  PublishedUpdatesPage,
  UpcomingEventsResult,
  IngestResult,
  LogAgentRunInput,
} from '../types.ts';
import { DISCIPLINES } from '../config.ts';

export type {
  DisciplineId,
  DisciplineUpdateRecord,
  PublishedUpdatesPage,
  UpcomingEventsResult,
  IngestResult,
  LogAgentRunInput,
};

/**
 * Is this event still ahead of the reader?
 *
 * The comparison is done in the PAGE's timezone (Asia/Manila), never the
 * server's. A record with an unparseable or absent `event_date` is NOT
 * upcoming — it cannot be offered as something you can still attend.
 */
export function isUpcomingEvent(
  event: { event_date?: string | null; category?: string | null },
  now: Date = new Date(),
  timeZone = 'Asia/Manila'
): boolean {
  if (!event.event_date) return false;

  const when = new Date(event.event_date);
  if (Number.isNaN(when.getTime())) return false;

  // Midnight on the event's own calendar day is the last moment at which an
  // all-day event is legitimately "happening today".
  const endOfDay = new Date(when);
  endOfDay.setHours(23, 59, 59, 999);

  const nowInTz = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now)
  );

  return endOfDay.getTime() >= nowInTz.getTime();
}

/** Categories the rail is allowed to draw from. `results` is deliberately absent. */
function isUpcomingCategory(category: string | null | undefined): boolean {
  const upcoming: readonly string[] = UPCOMING_CATEGORIES;
  return (category != null && upcoming.includes(category)) || category === 'workshop';
}

export interface PublishParams {
  region?: string;
  category?: string;
  org?: string;
  /** Dance-only league attribution filter; ignored by the other disciplines. */
  league?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface DisciplineService {
  getServerClient(): ReturnType<typeof createPerformingArtsServerClient>;
  getPublishedUpdates(params: PublishParams): Promise<PublishedUpdatesPage>;
  getUpcomingEvents(opts?: { now?: Date; timeZone?: string; league?: string }): Promise<UpcomingEventsResult>;
  ingestUpdates(updates: DanceUpdateInput[]): Promise<IngestResult>;
  logAgentRun(run: LogAgentRunInput): Promise<void>;
}

export interface DisciplineServiceOptions {
  /**
   * Dance-only league attribution. The registry lives in `features/dance/data/leagues.ts`;
   * the shared pipeline stays free of discipline-specific data.
   */
  league?: {
    matchTokens(leagueId: string): readonly string[] | null;
    matches(organization: string, leagueId: string): boolean;
  };
}

export function createDisciplineService(
  id: DisciplineId,
  fallbackUpdates: DisciplineUpdateRecord[],
  options: DisciplineServiceOptions = {}
): DisciplineService {
  const cfg = DISCIPLINES[id];
  const table = cfg.table;

  function getServerClient() {
    return createPerformingArtsServerClient();
  }

  function filterFallback(params: PublishParams, page: number, limit: number) {
    let filtered = [...fallbackUpdates];

    if (params.region && params.region !== 'all') {
      const reg = params.region.toLowerCase();
      filtered = filtered.filter((u) => u.region?.toLowerCase().includes(reg));
    }

    if (params.category && params.category !== 'all') {
      filtered = filtered.filter((u) => u.category === params.category);
    }

    if (params.org && params.org !== 'all') {
      const org = params.org.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.organization.toLowerCase().includes(org) ||
          (org === 'idl' && u.organization.toLowerCase() === 'idl')
      );
    }

    if (params.league && params.league !== 'all' && options.league) {
      const leagueId = params.league;
      filtered = filtered.filter((u) =>
        options.league!.matches((u.organization as string) ?? '', leagueId)
      );
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
      source: 'fallback' as const,
    };
  }

  async function getPublishedUpdates(params: PublishParams): Promise<PublishedUpdatesPage> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(MAX_LIMIT, params.limit || DEFAULT_LIMIT);
    const offset = (page - 1) * limit;

    try {
      const supabase = getServerClient();

      let query = supabase
        .from(table)
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

      if (params.league && params.league !== 'all' && options.league) {
        // League attribution: only the registry's match tokens are interpolated,
        // never caller-controlled text.
        const tokens = options.league.matchTokens(params.league);
        if (tokens) {
          query = query.or(buildAnyContains('organization', tokens));
        }
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
        updates: data as DisciplineUpdateRecord[],
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

  async function getUpcomingEvents(
    opts: { now?: Date; timeZone?: string; league?: string } = {}
  ): Promise<UpcomingEventsResult> {
    const now = opts.now ?? new Date();
    const timeZone = opts.timeZone ?? 'Asia/Manila';
    const leagueFilter =
      opts.league && opts.league !== 'all' && options.league
        ? opts.league
        : null;

    function selectUpcoming(updates: DisciplineUpdateRecord[]) {
      return updates
        .filter((u) => isUpcomingCategory(u.category as string | null | undefined))
        .filter((u) => isUpcomingEvent(u, now, timeZone))
        .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
    }

    try {
      const supabase = getServerClient();
      let query = supabase
        .from(table)
        .select('*')
        .eq('status', 'published')
        .in('category', ['event', 'competition', 'workshop'])
        .not('event_date', 'is', null)
        .gte('event_date', now.toISOString())
        .order('event_date', { ascending: true })
        .limit(leagueFilter ? 50 : 10);

      if (leagueFilter && options.league) {
        const tokens = options.league.matchTokens(leagueFilter);
        if (tokens) {
          query = query.or(buildAnyContains('organization', tokens));
        }
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        const events = selectUpcoming(fallbackUpdates);
        const scoped =
          leagueFilter && options.league
            ? events.filter((e) => options.league!.matches((e.organization as string) ?? '', leagueFilter))
            : events;
        return { events: scoped, total: scoped.length, source: 'fallback' };
      }
      const events = (data as DisciplineUpdateRecord[]).slice(0, 10);
      return { events, total: events.length, source: 'database' };
    } catch {
      const events = selectUpcoming(fallbackUpdates);
      const scoped =
        leagueFilter && options.league
          ? events.filter((e) => options.league!.matches((e.organization as string) ?? '', leagueFilter))
          : events;
      return { events: scoped, total: scoped.length, source: 'fallback' };
    }
  }

  async function ingestUpdates(updates: DanceUpdateInput[]): Promise<IngestResult> {
    const supabase = getServerClient();
    const seenImageUrls = new Set<string>();

    const processedRows = await Promise.all(
      updates.map(async (item) => {
        let finalImageUrl: string | null = item.image_url || null;
        let finalImageCredit: string | null = item.image_credit || null;
        let finalImageVerified: boolean = item.image_verified ?? false;
        const finalImageSourceUrl: string | null = (item as DanceUpdateInput & { image_source_url?: string | null }).image_source_url ?? null;
        let finalFallbackReason: string | null = (item as DanceUpdateInput & { image_fallback_reason?: string | null }).image_fallback_reason ?? null;

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
          image_alt: (item as DanceUpdateInput & { image_alt?: string | null }).image_alt || null,
          tags: item.tags || null,
          published_at: item.published_at || new Date().toISOString(),
          status: item.status || 'published',
          updated_at: new Date().toISOString(),
        };
      })
    );

    try {
      const { data, error } = await supabase
        .from(table)
        .upsert(processedRows, { onConflict: 'source_url,title' })
        .select('id');

      if (error) {
        console.warn(`[ingest ${id}] Database upsert notice:`, error.message);
        return { inserted: 0, updated: 0, total: updates.length };
      }
      return { inserted: data?.length || updates.length, updated: 0, total: updates.length };
    } catch (err: unknown) {
      console.warn(
        `[ingest ${id}] Database connection notice:`,
        err instanceof Error ? err.message : err
      );
      return { inserted: 0, updated: 0, total: updates.length };
    }
  }

  async function logAgentRun(run: LogAgentRunInput): Promise<void> {
    try {
      const supabase = getServerClient();
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

  return { getServerClient, getPublishedUpdates, getUpcomingEvents, ingestUpdates, logAgentRun };
}
