import { getSingingOrgs } from '../../singing/services/singingOrgsService.ts';
import { getActingOrgs } from '../../acting/services/actingOrgsService.ts';
import { getTheaterOrgs } from '../../theater/services/theaterOrgsService.ts';
import { DisciplineCommunityView } from './DisciplineCommunityView.tsx';

type BeatId = 'singing' | 'acting' | 'theater';

const ORG_LOADERS = {
  singing: getSingingOrgs,
  acting: getActingOrgs,
  theater: getTheaterOrgs,
} as const;

/**
 * Server boundary for a beat discipline page.
 * Loads the verified organization registry and streams the client view.
 */
export async function DisciplineCommunityPageServer({ variant }: { variant: BeatId }) {
  const orgs = await ORG_LOADERS[variant]();
  return <DisciplineCommunityView variant={variant} initialOrgs={orgs} />;
}
