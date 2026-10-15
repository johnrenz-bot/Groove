import type { DanceOrg } from '@/lib/dance/types';
import { VERIFIED_DANCE_ORGS } from '../data/danceOrgs';

/**
 * Loads verified dance organizations for the official-logo carousel.
 * Uses local data and assets as requested — no Supabase or database dependency required.
 */
export async function getDanceOrgs(): Promise<DanceOrg[]> {
  return VERIFIED_DANCE_ORGS;
}

