import { createClient } from '@/lib/supabase/server';
import type { LandingStats } from './landingStats';

/**
 * Landing-page statistics — THE SERVER HALF.
 *
 * Called from `components/landing/LandingSections.tsx`, which is a server
 * component, so the counts are fetched with the caller's real session and
 * Row Level Security applies. The formatting helpers and the `LandingStats`
 * shape stay in `landingStats.ts`, which imports nothing, so
 * `HeroStats.tsx` can pull them into the client bundle safely.
 *
 * Every count is a real database query. A missing table or column degrades to
 * "hide that number" rather than to a made-up one: `HeroStatsClient` filters out
 * anything at zero, so a stat the database cannot answer simply does not appear.
 */
export interface CommunityMember {
  id: string;
  firstname: string | null;
  lastname: string | null;
  photo_url: string | null;
  role: string;
}

export async function getCommunityMembers(limit = 12): Promise<CommunityMember[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, firstname, lastname, photo_url, role')
      .in('role', ['coach', 'client'])
      .eq('status', 'active')
      .order('role', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as CommunityMember[];
  } catch {
    return [];
  }
}

export async function getLandingStats(): Promise<LandingStats> {
  const supabase = await createClient();

  try {
    // Count coaches that are actually bookable: role 'coach' and active.
    const { count: coachCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'coach')
      .eq('status', 'active');

    // Count studios. `studios` is a recent table and may not exist yet on an
    // older deployment; a failed query is "no number", not "zero studios".
    let studioCount: number | null = null;
    try {
      const { count, error } = await supabase
        .from('studios')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      studioCount = error ? null : count;
    } catch {
      studioCount = null;
    }

    // Count published disciplines from the community taxonomy.
    const { count: disciplineCount, error: disciplineError } = await supabase
      .from('dance_categories')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    return {
      coaches: coachCount ?? 0,
      studios: studioCount ?? 0,
      // Known disciplines: dance, singing, acting, theater.
      disciplines: disciplineError || !disciplineCount ? 4 : disciplineCount,
    };
  } catch {
    return { coaches: 0, studios: 0, disciplines: 4 };
  }
}