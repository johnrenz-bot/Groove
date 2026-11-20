/**
 * ActingBeat agent — thin binding of the shared beat-agent factory.
 * Implementation lives in `features/discipline/services/disciplineBeatAgent.ts`.
 */
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';
import type { AgentRunResult } from '../../discipline/types.ts';
import { createDisciplineBeatAgent } from '../../discipline/services/disciplineBeatAgent.ts';
import { ingestActingUpdates, logAgentRun, FALLBACK_ACTING_UPDATES } from './actingService.ts';

export type { AgentRunResult };

export const runActingBeatAgent = createDisciplineBeatAgent({
  id: 'acting',
  ingest: ingestActingUpdates,
  fallbackUpdates: FALLBACK_ACTING_UPDATES as DanceUpdateInput[],
  logAgentRun,
});
