import { getSingingOrgs } from '../services/singingOrgsService';
import { SingingCommunityView } from './SingingCommunityView';

/**
 * Server boundary for the singing community page.
 * Loads verified organizations and streams the client view.
 */
export async function SingingCommunityPageServer() {
  const orgs = await getSingingOrgs();
  return <SingingCommunityView initialOrgs={orgs} />;
}
