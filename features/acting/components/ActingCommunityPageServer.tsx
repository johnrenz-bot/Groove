import { getActingOrgs } from '../services/actingOrgsService';
import { ActingCommunityView } from './ActingCommunityView';

export async function ActingCommunityPageServer() {
  const orgs = await getActingOrgs();
  return <ActingCommunityView initialOrgs={orgs} />;
}
