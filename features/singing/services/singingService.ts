/**
 * Singing feed — thin binding of the shared discipline service to the
 * singing table. Implementation lives in
 * `features/discipline/services/disciplineService.ts`.
 */
import { VERIFIED_SINGING_UPDATES } from '../data/singingUpdates.ts';
import {
  createDisciplineService,
  isUpcomingEvent,
  type DisciplineUpdateRecord,
  type PublishParams,
} from '../../discipline/services/disciplineService.ts';
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';

export type SingingUpdateRecord = DisciplineUpdateRecord;
export { isUpcomingEvent };
export type { PublishParams };

const service = createDisciplineService('singing', VERIFIED_SINGING_UPDATES as DisciplineUpdateRecord[]);

export function getSingingServerClient() {
  return service.getServerClient();
}

export const FALLBACK_SINGING_UPDATES: SingingUpdateRecord[] = VERIFIED_SINGING_UPDATES as DisciplineUpdateRecord[];

export const getPublishedSingingUpdates = service.getPublishedUpdates;
export const getUpcomingSingingEvents = service.getUpcomingEvents;
export const ingestSingingUpdates = service.ingestUpdates;
export const logAgentRun = service.logAgentRun;
