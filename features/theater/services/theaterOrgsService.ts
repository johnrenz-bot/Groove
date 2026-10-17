import type { DanceOrg } from '@/lib/dance/types';
import { VERIFIED_THEATER_ORGS } from '../data/theaterOrgs';

export async function getTheaterOrgs(): Promise<DanceOrg[]> {
  return VERIFIED_THEATER_ORGS;
}
