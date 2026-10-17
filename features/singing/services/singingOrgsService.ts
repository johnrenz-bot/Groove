import type { DanceOrg } from '@/lib/dance/types';
import { VERIFIED_SINGING_ORGS } from '../data/singingOrgs';

export async function getSingingOrgs(): Promise<DanceOrg[]> {
  return VERIFIED_SINGING_ORGS;
}
