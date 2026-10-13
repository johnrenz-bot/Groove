import { getDanceOrgs } from '@/features/dance/services/danceOrgsService';
import { DanceCommunityView } from './DanceCommunityView';

/**
 * Server boundary for the dance community page.
 *
 * Fetches the verified organization logos with the anon-key server client
 * (public SELECT via RLS on `dance_orgs`) and passes them as plain props to the
 * client view, which renders the logo carousel directly below the hero. Kept as
 * its own async Server Component so the page can wrap it in <React.Suspense> and
 * stream the carousel once the database read resolves.
 */
export async function DanceCommunityPageServer() {
  const orgs = await getDanceOrgs();
  return <DanceCommunityView initialOrgs={orgs} />;
}
