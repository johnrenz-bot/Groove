import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';
import { DEFAULT_LIMIT, MAX_LIMIT, UPCOMING_CATEGORIES } from '../../../lib/dance/constants.ts';
import { resolveVerifiedItemImage } from '../../../lib/dance/imageVerification.ts';
// Relative (no @/ alias): this service is also imported by scripts run through
// `node --experimental-strip-types`, which cannot resolve the webpack alias.
import { buildOrContains } from '../../../lib/postgrest.ts';
import { VERIFIED_DANCE_UPDATES } from '../data/danceUpdates.ts';

export interface DanceUpdateRecord extends DanceUpdateInput {
  id: string | number;
  created_at: string;
  updated_at?: string;
  image_credit?: string | null;
  image_verified?: boolean;
  /**
   * The first-party asset the image was taken from. Kept next to the local
   * `/dance-updates/...` path so an editor can always answer "where did this
   * picture actually come from?" without a git archaeology session.
   */
  image_source_url?: string | null;
  /**
   * Curated, human-written description of what the photograph actually shows.
   *
   * Present on most rows, but deliberately optional: records written by the
   * automated agent do not get one, and UpdateCard synthesises a descriptive
   * string from the organisation and location rather than falling back to the
   * title - a grid of cards whose alt text is all identical is a grid a screen
   * reader user has learned to skip.
   */
  image_alt?: string | null;
  /**
   * Why this record has no image. Non-null implies `image_url` is null.
   *
   * This is the difference between "we chose not to show a photo" and "we
   * tried, could not verify one, and here is the exact refusal reason". A card
   * with a reason is a working fallback; a card with a silent null reads like a
   * bug. Populated by `scripts/sync-dance-update-images.ts`.
   */
  image_fallback_reason?: string | null;
}

/**
 * Creates a server-side Supabase client with the service role key if available,
 * falling back to anon key.
 */
export function getDanceServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Verified fallback updates.
 *
 * These are the records used whenever the `dance_updates` table is unreachable
 * (no Supabase credentials, offline, empty table). Every field was checked
 * against the organisation's own page and every image was fetched, validated
 * and visually confirmed by `scripts/sync-dance-update-images.ts` before being
 * vendored into `public/dance-updates/`.
 *
 * Two properties matter and are enforced elsewhere, not here:
 *   - nothing here is stock photography or a stand-in for the real event
 *   - the set deliberately MIXES completed and future records, because
 *     `getUpcomingDanceEvents()` filters on `event_date` rather than trusting
 *     a flag. A static "upcoming" list would rot within a day.
 */
export const FALLBACK_UPDATES: DanceUpdateRecord[] = VERIFIED_DANCE_UPDATES;

/**
 * Queries published dance updates with filtering and pagination.
 */
export async function getPublishedDanceUpdates(params: {
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
    const supabase = getDanceServerClient();

    let query = supabase
      .from('dance_updates')
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
      // `.or()` takes raw PostgREST filter grammar, so a `q` containing a comma
      // or a closing paren used to terminate one filter and open another. This
      // query runs on the service-role client, which bypasses RLS, so the
      // escaping has to be here rather than in a policy. See lib/postgrest.ts.
      query = query.or(buildOrContains(['title', 'summary', 'organization'], term));
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback filtering
      return filterFallbackUpdates(params, page, limit);
    }

    return {
      updates: data as DanceUpdateRecord[],
      total: count ?? data.length,
      page,
      limit,
      totalPages: Math.ceil((count ?? data.length) / limit),
      source: 'database',
    };
  } catch {
    return filterFallbackUpdates(params, page, limit);
  }
}

/**
 * Filter fallback updates in memory when database is empty or offline.
 */
function filterFallbackUpdates(
  params: {
    region?: string;
    category?: string;
    org?: string;
    q?: string;
  },
  page: number,
  limit: number
) {
  let filtered = [...FALLBACK_UPDATES];

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

  if (params.q && params.q.trim()) {
    const q = params.q.toLowerCase().trim();
    filtered = filtered.filter(
      (u) =>
        u.title.toLowerCase().includes(q) ||
        u.summary.toLowerCase().includes(q) ||
        u.organization.toLowerCase().includes(q)
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

/**
 * Is this event still ahead of the reader?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE RULE THAT KEEPS ENDED EVENTS OUT OF UPCOMING EVENTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * "Upcoming" is a claim about the clock, so it has to be evaluated against the
 * clock. An earlier version of this file filtered only on
 * `category ∈ {event, competition}` with a non-null `event_date`, which meant a
 * competition that finished three months ago was still rendered in the rail
 * under a "Register / Event Details" button - the single most misleading thing
 * this page could do, because the button implies you can still sign up.
 *
 * Two details that are easy to get wrong:
 *
 *  - The comparison is done in the PAGE's timezone, not the server's. The rail
 *    is written for Asia/Manila; a server on UTC would call a 01:00 PHT event
 *    "ended" for seven hours of every day.
 *  - An unparseable or absent `event_date` is NOT upcoming. A record with no
 *    date cannot be shown as something you can still attend, so it is dropped
 *    here and remains visible in Latest Updates where it belongs.
 *
 * `now` is injectable so the date logic is testable against a fixed reference
 * date instead of only ever being exercised on the day it runs.
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

/** Categories the rail is allowed to draw from. `results` is deliberately absent:
 *  a result is by definition something that already happened. */
function isUpcomingCategory(category: string | null | undefined): boolean {
  const upcoming: readonly string[] = UPCOMING_CATEGORIES;
  return (category != null && upcoming.includes(category)) || category === 'workshop';
}

function selectUpcoming(updates: DanceUpdateRecord[], now: Date, timeZone: string) {
  return updates
    .filter((u) => isUpcomingCategory(u.category) && isUpcomingEvent(u, now, timeZone))
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
}

/**
 * Fetches upcoming events and competitions.
 *
 * Historical records are NOT dropped from the feed - only from this rail.
 * `getPublishedDanceUpdates()` still returns them so the Latest Updates grid
 * keeps the full record of what happened.
 */
export async function getUpcomingDanceEvents(
  opts: { now?: Date; timeZone?: string } = {}
) {
  const now = opts.now ?? new Date();
  const timeZone = opts.timeZone ?? 'Asia/Manila';

  try {
    const supabase = getDanceServerClient();

    const { data, error } = await supabase
      .from('dance_updates')
      .select('*')
      .eq('status', 'published')
      .in('category', [...UPCOMING_CATEGORIES, 'workshop'])
      .not('event_date', 'is', null)
      .gte('event_date', now.toISOString())
      .order('event_date', { ascending: true })
      .limit(10);

    if (error || !data || data.length === 0) {
      return { events: selectUpcoming(FALLBACK_UPDATES, now, timeZone) };
    }

    return { events: data as DanceUpdateRecord[] };
  } catch {
    return { events: selectUpcoming(FALLBACK_UPDATES, now, timeZone) };
  }
}

/**
 * Ingests a validated batch of updates into the dance_updates table.
 * Enforces zero-stock-photo rule and verifies images before persisting.
 */
export async function ingestDanceUpdates(updates: DanceUpdateInput[]) {
  const supabase = getDanceServerClient();

  // Deduplicate image URLs within the batch
  const seenImageUrls = new Set<string>();

  const processedRows = await Promise.all(
    updates.map(async (item) => {
      let finalImageUrl: string | null = item.image_url || null;
      let finalImageCredit: string | null = item.image_credit || null;
      let finalImageVerified: boolean = item.image_verified ?? false;
      // Provenance + the documented reason there is no image. Both are carried
      // through so a blank card can always be explained instead of guessed at.
      const finalImageSourceUrl: string | null =
        (item as DanceUpdateRecord).image_source_url ?? null;
      let finalFallbackReason: string | null =
        (item as DanceUpdateRecord).image_fallback_reason ?? null;

      // If item has not yet been verified or has an unverified URL, run through verification
      if (finalImageUrl && !finalImageVerified) {
        const result = await resolveVerifiedItemImage(item.source_url, item.organization, finalImageUrl);
        finalImageUrl = result.imageUrl;
        finalImageCredit = result.imageCredit;
        finalImageVerified = result.imageVerified;
        if (!finalImageUrl && result.fallbackReason) finalFallbackReason = result.fallbackReason;
      }

      // Check for duplicate image URLs across the batch
      if (finalImageUrl) {
        if (seenImageUrls.has(finalImageUrl)) {
          // Reject duplicate image to avoid showing identical photos across different items
          finalImageUrl = null;
          finalImageCredit = null;
          finalImageVerified = false;
          finalFallbackReason =
            'the same official photo is already used by another card; showing the branded fallback rather than repeating it';
        } else {
          seenImageUrls.add(finalImageUrl);
        }
      }

      // A record with no image must say why. An unexplained blank is
      // indistinguishable from a broken page.
      if (!finalImageUrl && !finalFallbackReason) {
        finalFallbackReason =
          'no official source image could be verified for this update';
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
        tags: item.tags || null,
        published_at: item.published_at || new Date().toISOString(),
        status: item.status || 'published',
        updated_at: new Date().toISOString(),
      };
    })
  );

  try {
    const { data, error } = await supabase
      .from('dance_updates')
      .upsert(processedRows, { onConflict: 'source_url' })
      .select('id');

    if (error) {
      console.warn('[ingestDanceUpdates] Database upsert notice:', error.message);
      return { inserted: 0, updated: 0, total: updates.length };
    }

    return { inserted: data?.length || updates.length, updated: 0, total: updates.length };
  } catch (err: unknown) {
    console.warn(
      '[ingestDanceUpdates] Database connection notice:',
      err instanceof Error ? err.message : err
    );
    return { inserted: 0, updated: 0, total: updates.length };
  }
}

/**
 * Logs an agent run record in agent_runs table.
 */
export async function logAgentRun(run: {
  status: 'success' | 'failure' | 'partial';
  items_found: number;
  items_inserted: number;
  error?: string | null;
  started_at: string;
  finished_at: string;
}) {
  try {
    const supabase = getDanceServerClient();
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
    console.error('Failed to log agent run to agent_runs:', err);
  }
}
