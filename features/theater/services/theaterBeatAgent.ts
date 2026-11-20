/**
 * TheaterBeat agent — thin binding of the shared beat-agent factory.
 * Implementation lives in `features/discipline/services/disciplineBeatAgent.ts`.
 */
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';
import type { AgentRunResult } from '../../discipline/types.ts';
import { createDisciplineBeatAgent } from '../../discipline/services/disciplineBeatAgent.ts';
import { ingestTheaterUpdates, logAgentRun, FALLBACK_THEATER_UPDATES } from './theaterService.ts';

export type { AgentRunResult };

export const runTheaterBeatAgent = createDisciplineBeatAgent({
  id: 'theater',
  ingest: ingestTheaterUpdates,
  fallbackUpdates: FALLBACK_THEATER_UPDATES as DanceUpdateInput[],
  logAgentRun,
});
