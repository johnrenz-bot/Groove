import type { DanceOrg } from '@/lib/dance/types';
import { VERIFIED_ACTING_ORGS } from '../data/actingOrgs';

export async function getActingOrgs(): Promise<DanceOrg[]> {
  return VERIFIED_ACTING_ORGS;
}
