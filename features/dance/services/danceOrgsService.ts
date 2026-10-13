import { createClient } from '@/lib/supabase/server';
import type { DanceOrg } from '@/lib/dance/types';

/**
 * Loads every dance organization for the official-logo carousel, ordered by
 * `sort_order` ascending.
 *
 * Uses the anon-key server client, so Row Level Security applies and only the
 * public-SELECT policy on `dance_orgs` is exercised. Writes are service_role
 * only — see the sync script (FEAT-003) and the migration's RLS comment.
 *
 * On any error the carousel receives an empty list (callers render a text-pill
 * fallback) rather than throwing into the Server Component tree.
 */
export async function getDanceOrgs(): Promise<DanceOrg[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dance_orgs')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getDanceOrgs]', error.message);
    return [];
  }

  return (data as DanceOrg[]) ?? [];
}
