/**
 * Theater feed — thin binding of the shared discipline service to the theater
 * table. Implementation lives in
 * `features/discipline/services/disciplineService.ts`.
 */
import { VERIFIED_THEATER_UPDATES } from '../data/theaterUpdates.ts';
import {
  createDisciplineService,
  isUpcomingEvent,
  type DisciplineUpdateRecord,
  type PublishParams,
} from '../../discipline/services/disciplineService.ts';
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';

export type TheaterUpdateRecord = DisciplineUpdateRecord;
export { isUpcomingEvent };
export type { PublishParams };

const service = createDisciplineService('theater', VERIFIED_THEATER_UPDATES as DisciplineUpdateRecord[]);

export function getTheaterServerClient() {
  return service.getServerClient();
}

export const FALLBACK_THEATER_UPDATES: TheaterUpdateRecord[] = VERIFIED_THEATER_UPDATES as DisciplineUpdateRecord[];

export const getPublishedTheaterUpdates = service.getPublishedUpdates;
export const getUpcomingTheaterEvents = service.getUpcomingEvents;
export const ingestTheaterUpdates = service.ingestUpdates;
export const logAgentRun = service.logAgentRun;
