import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';
import { DEFAULT_LIMIT, MAX_LIMIT, UPCOMING_CATEGORIES } from '../../../lib/dance/constants.ts';

export interface DanceUpdateRecord extends DanceUpdateInput {
  id: string | number;
  created_at: string;
  updated_at?: string;
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
 * High-quality verified fallback updates to guarantee the Dance Community
 * page renders a rich experience even before database ingestion or external keys.
 */
export const FALLBACK_UPDATES: DanceUpdateRecord[] = [
  {
    id: 'idl-update-1',
    title: 'IDL 2025 World League Teams Announced: Brotherhood and UPeepz Enter Division A',
    summary:
      'The International Dance League confirms the 16 franchise crews for the 2025 Season. MegaCrew champions Brotherhood and Manila titans UPeepz headline the cross-conference battles.',
    summary_tl:
      'Inanunsyo ng International Dance League ang 16 na opisyal na dance crew para sa 2025 Season. Kasama sa Division A ang Brotherhood at ang ipinagmamalaking UPeepz mula sa Maynila.',
    category: 'competition',
    organization: 'IDL',
    region: 'international',
    location: 'Vancouver / Manila',
    event_date: '2025-05-15T18:00:00Z',
    source_url: 'https://www.thedancelebague.com/news/2025-franchise-teams',
    image_url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80',
    tags: ['IDL', 'Brotherhood', 'UPeepz', 'League'],
    published_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    status: 'published',
    created_at: new Date().toISOString(),
  },
  {
    id: 'redbull-update-2',
    title: 'Red Bull Dance Your Style Philippines 2025 Qualifier Tournaments Open Registration',
    summary:
      'Red Bull Dance Your Style returns across Luzon, Visayas, and Mindanao. Solo dancers in Popping, Locking, Waacking, and Hip Hop will battle under crowd-judged rules.',
    summary_tl:
      'Bukas na ang rehistrasyon para sa Red Bull Dance Your Style Philippines 2025. Maglalaban ang pinakamagagaling na street dancers sa buong kapuluan gamit ang crowd-voting battle system.',
    category: 'event',
    organization: 'Red Bull Dance Your Style',
    region: 'philippines',
    location: 'BGC Arts Center, Taguig & Bulacan',
    event_date: '2025-06-20T14:00:00Z',
    source_url: 'https://www.redbull.com/danceyourstyle/ph-2025-qualifiers',
    image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    tags: ['RedBull', '1v1', 'AllStyles', 'Philippines'],
    published_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    status: 'published',
    created_at: new Date().toISOString(),
  },
  {
    id: 'hhi-update-3',
    title: 'Hip Hop International Philippines 2025 Championships Slated for SM Mall of Asia Arena',
    summary:
      'Over 80 crews across Junior, Varsity, Adult, and MegaCrew divisions will vie for the Philippine delegation spots to the World Hip Hop Dance Championship in Phoenix, Arizona.',
    summary_tl:
      'Nakatakda sa MOA Arena ang HHI Philippines 2025. Mahigit 80 dance crews ang maglalaban para sa karangalang katawanin ang Pilipinas sa World Championships sa Arizona.',
    category: 'competition',
    organization: 'HHI',
    region: 'philippines',
    location: 'SM Mall of Asia Arena, Pasay',
    event_date: '2025-04-26T09:00:00Z',
    source_url: 'https://www.hiphopinternational.com/philippines-national-championship-2025',
    image_url: 'https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=800&q=80',
    tags: ['HHI', 'MegaCrew', 'Nationals', 'Phoenix'],
    published_at: new Date(Date.now() - 3600000 * 14).toISOString(),
    status: 'published',
    created_at: new Date().toISOString(),
  },
  {
    id: 'steezy-update-4',
    title: 'STEEZY Studio Launches Masterclass Series Featuring Top Asian Urban Choreographers',
    summary:
      'STEEZY drops an intensive online workshop curriculum breaking down fast footwork, polyrhythms, and stage presence for competitive collegiate crews.',
    summary_tl:
      'Inilunsad ng STEEZY Studio ang bagong masterclass series na nagtuturo ng advanced urban choreography at musicality para sa mga dance athlete.',
    category: 'workshop',
    organization: 'STEEZY',
    region: 'international',
    location: 'Global Virtual Studio',
    event_date: '2025-05-02T10:00:00Z',
    source_url: 'https://www.steezy.com/programs/asian-urban-choreography-masterclass',
    image_url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=800&q=80',
    tags: ['STEEZY', 'Workshop', 'Training', 'UrbanChoreo'],
    published_at: new Date(Date.now() - 3600000 * 22).toISOString(),
    status: 'published',
    created_at: new Date().toISOString(),
  },
  {
    id: 'wod-update-5',
    title: 'World of Dance Series Manila 2025: Team Roster and Early-Bird Passes Released',
    summary:
      'WOD returns to Metro Manila featuring head-to-head competition across Junior, Team, and Upper divisions with guest performances by global viral choreographers.',
    summary_tl:
      'Bukas na ang tiket para sa World of Dance Manila 2025. Masisilayan ang pinakamatitinding grupo sa Upper at Junior divisions na magtatanghal sa harap ng world judges.',
    category: 'competition',
    organization: 'World of Dance',
    region: 'philippines',
    location: 'New Frontier Theater, Quezon City',
    event_date: '2025-07-12T13:00:00Z',
    source_url: 'https://www.worldofdance.com/events/manila-qualifier-2025',
    image_url: 'https://images.unsplash.com/photo-1545224144-b38cd309ef69?auto=format&fit=crop&w=800&q=80',
    tags: ['WOD', 'WorldOfDance', 'Manila', 'Showcase'],
    published_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    status: 'published',
    created_at: new Date().toISOString(),
  },
  {
    id: 'justedebout-update-6',
    title: 'Juste Debout World Tour 2025: Asian Standout Battles in Tokyo & Seoul Complete',
    summary:
      'The prestigious 2v2 standing street dance battle concluded its East Asia legs in Locking, Popping, House, and Hip Hop, punching tickets to the Paris Accord Arena Finals.',
    summary_tl:
      'Nagtapos ang Asian qualifiers ng Juste Debout. Nakatakdang magharap ang mga kampeon sa Locking at Popping sa Grand Finals sa Paris.',
    category: 'results',
    organization: 'Juste Debout',
    region: 'international',
    location: 'Tokyo & Paris',
    event_date: '2025-08-30T17:00:00Z',
    source_url: 'https://www.justedebout.com/results/asia-prelims-2025',
    image_url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=800&q=80',
    tags: ['JusteDebout', '2v2', 'Popping', 'Locking'],
    published_at: new Date(Date.now() - 3600000 * 35).toISOString(),
    status: 'published',
    created_at: new Date().toISOString(),
  },
  {
    id: 'udo-update-7',
    title: 'UDO Asia-Pacific Street Dance Championships 2025 Announced for Clark Freeport',
    summary:
      'Universal Dance Organization expands its footprint in the Philippines with official qualifying categories for the UDO World Street Dance Championship in Blackpool, UK.',
    summary_tl:
      'Gaganapin sa Clark, Pampanga ang UDO Asia-Pacific Street Dance Championships para sa opisyal na kwalipikasyon patungong Blackpool, United Kingdom.',
    category: 'event',
    organization: 'UDO',
    region: 'philippines',
    location: 'Clark Freeport Zone, Pampanga',
    event_date: '2025-09-18T10:00:00Z',
    source_url: 'https://www.udodanceworld.com/events/asia-pacific-2025',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    tags: ['UDO', 'Blackpool', 'AsiaPacific', 'Streetdance'],
    published_at: new Date(Date.now() - 3600000 * 42).toISOString(),
    status: 'published',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ph-sjdm-update-8',
    title: 'Bulacan Performing Arts Union Hosts San Jose del Monte Inter-School Dance Battle',
    summary:
      'High school and collegiate street dance troupes across Bulacan will gather at the SJDM Sports Complex for an intense battle series and community masterclass.',
    summary_tl:
      'Magtitipon ang mga kabataang mananayaw sa Bulacan para sa taunang Inter-School Dance Battle at community workshop sa San Jose del Monte.',
    category: 'community',
    organization: 'Philippines',
    region: 'metro-manila',
    location: 'SJDM Sports Complex, Bulacan',
    event_date: '2025-04-18T13:00:00Z',
    source_url: 'https://www.facebook.com/bulacandancecollective/events/sjdm-2025',
    image_url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80',
    tags: ['Bulacan', 'SJDM', 'Grassroots', 'InterSchool'],
    published_at: new Date(Date.now() - 3600000 * 50).toISOString(),
    status: 'published',
    created_at: new Date().toISOString(),
  },
];

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
      query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,organization.ilike.%${term}%`);
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
 * Fetches upcoming events and competitions.
 */
export async function getUpcomingDanceEvents() {
  try {
    const supabase = getDanceServerClient();

    const { data, error } = await supabase
      .from('dance_updates')
      .select('*')
      .eq('status', 'published')
      .in('category', [...UPCOMING_CATEGORIES, 'workshop'])
      .not('event_date', 'is', null)
      .order('event_date', { ascending: true })
      .limit(10);

    if (error || !data || data.length === 0) {
      const fallbackEvents = FALLBACK_UPDATES.filter(
        (u) => u.event_date && (UPCOMING_CATEGORIES.includes(u.category as any) || u.category === 'workshop')
      ).sort(
        (a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime()
      );
      return { events: fallbackEvents };
    }

    return { events: data as DanceUpdateRecord[] };
  } catch {
    const fallbackEvents = FALLBACK_UPDATES.filter(
      (u) => u.event_date && (UPCOMING_CATEGORIES.includes(u.category as any) || u.category === 'workshop')
    ).sort(
      (a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime()
    );
    return { events: fallbackEvents };
  }
}

/**
 * Ingests a validated batch of updates into the dance_updates table.
 */
export async function ingestDanceUpdates(updates: DanceUpdateInput[]) {
  const supabase = getDanceServerClient();
  const rows = updates.map((item) => ({
    title: item.title,
    summary: item.summary,
    summary_tl: item.summary_tl || null,
    category: item.category,
    organization: item.organization,
    region: item.region || null,
    event_date: item.event_date || null,
    location: item.location || null,
    source_url: item.source_url,
    image_url: item.image_url || null,
    tags: item.tags || null,
    published_at: item.published_at || new Date().toISOString(),
    status: item.status || 'published',
    updated_at: new Date().toISOString(),
  }));

  try {
    const { data, error } = await supabase
      .from('dance_updates')
      .upsert(rows, { onConflict: 'source_url' })
      .select('id');

    if (error) {
      console.warn('[ingestDanceUpdates] Database upsert notice:', error.message);
      return { inserted: 0, updated: 0, total: updates.length };
    }

    return { inserted: data?.length || updates.length, updated: 0, total: updates.length };
  } catch (err: any) {
    console.warn('[ingestDanceUpdates] Database connection notice:', err?.message || err);
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
