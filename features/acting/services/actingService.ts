/**
 * Acting feed — thin binding of the shared discipline service to the acting
 * table. Implementation lives in
 * `features/discipline/services/disciplineService.ts`.
 */
import { VERIFIED_ACTING_UPDATES } from '../data/actingUpdates.ts';
import {
  createDisciplineService,
  isUpcomingEvent,
  type DisciplineUpdateRecord,
  type PublishParams,
} from '../../discipline/services/disciplineService.ts';
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';

export type ActingUpdateRecord = DisciplineUpdateRecord;
export { isUpcomingEvent };
export type { PublishParams };

const service = createDisciplineService('acting', VERIFIED_ACTING_UPDATES as DisciplineUpdateRecord[]);

export function getActingServerClient() {
  return service.getServerClient();
}

export const FALLBACK_ACTING_UPDATES: ActingUpdateRecord[] = VERIFIED_ACTING_UPDATES as DisciplineUpdateRecord[];

export const getPublishedActingUpdates = service.getPublishedUpdates;
export const getUpcomingActingEvents = service.getUpcomingEvents;
export const ingestActingUpdates = service.ingestUpdates;
export const logAgentRun = service.logAgentRun;
