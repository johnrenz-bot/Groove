/**
 * Dance feed — thin binding of the shared discipline service to the dance
 * table + the league registry (the only discipline with a league filter).
 * Implementation lives in `features/discipline/services/disciplineService.ts`.
 */
import { getLeagueById, leagueForOrganization } from '../data/leagues.ts';
import { VERIFIED_DANCE_UPDATES } from '../data/danceUpdates.ts';
import {
  createDisciplineService,
  isUpcomingEvent,
  type DisciplineUpdateRecord,
  type PublishParams,
} from '../../discipline/services/disciplineService.ts';
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';

export type DanceUpdateRecord = DisciplineUpdateRecord;
export { isUpcomingEvent };
export type { PublishParams };

const service = createDisciplineService('dance', VERIFIED_DANCE_UPDATES as DanceUpdateRecord[], {
  league: {
    matchTokens: (leagueId: string) => getLeagueById(leagueId)?.matchTokens ?? null,
    matches: (organization: string, leagueId: string) =>
      leagueForOrganization(organization)?.id === leagueId,
  },
});

export function getDanceServerClient() {
  return service.getServerClient();
}

export const FALLBACK_UPDATES: DanceUpdateRecord[] = VERIFIED_DANCE_UPDATES as DanceUpdateRecord[];

export const getPublishedDanceUpdates = service.getPublishedUpdates;
export const getUpcomingDanceEvents = service.getUpcomingEvents;
export const ingestDanceUpdates = service.ingestUpdates;
export const logAgentRun = service.logAgentRun;
