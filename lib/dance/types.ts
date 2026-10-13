/**
 * TypeScript shape of a row in the `dance_orgs` table.
 *
 * Mirrors supabase/migrations/19_dance_orgs.sql exactly. Kept import-free in
 * its own module so server pages, the carousel service, and the sync script
 * can all share one definition without pulling in unrelated dependencies.
 */
export interface DanceOrg {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  logo_url: string | null;
  logo_source_url: string | null;
  logo_verified: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
