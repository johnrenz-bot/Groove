/**
 * DanceBeat agent — thin binding of the shared beat-agent factory.
 * Implementation lives in `features/discipline/services/disciplineBeatAgent.ts`.
 */
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';
import type { AgentRunResult } from '../../discipline/types.ts';
import { createDisciplineBeatAgent } from '../../discipline/services/disciplineBeatAgent.ts';
import { ingestDanceUpdates, logAgentRun } from './danceService.ts';
import { FALLBACK_UPDATES } from './danceService.ts';

export type { AgentRunResult };

export const runDanceBeatAgent = createDisciplineBeatAgent({
  id: 'dance',
  ingest: ingestDanceUpdates,
  fallbackUpdates: FALLBACK_UPDATES as DanceUpdateInput[],
  logAgentRun,
});
