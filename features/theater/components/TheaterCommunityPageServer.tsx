import { getTheaterOrgs } from '../services/theaterOrgsService';
import { TheaterCommunityView } from './TheaterCommunityView';

export async function TheaterCommunityPageServer() {
  const orgs = await getTheaterOrgs();
  return <TheaterCommunityView initialOrgs={orgs} />;
}
