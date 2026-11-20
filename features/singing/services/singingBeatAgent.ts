/**
 * SingingBeat agent — thin binding of the shared beat-agent factory.
 * Implementation lives in `features/discipline/services/disciplineBeatAgent.ts`.
 */
import type { DanceUpdateInput } from '../../../lib/dance/schema.ts';
import type { AgentRunResult } from '../../discipline/types.ts';
import { createDisciplineBeatAgent } from '../../discipline/services/disciplineBeatAgent.ts';
import { ingestSingingUpdates, logAgentRun, FALLBACK_SINGING_UPDATES } from './singingService.ts';

export type { AgentRunResult };

export const runSingingBeatAgent = createDisciplineBeatAgent({
  id: 'singing',
  ingest: ingestSingingUpdates,
  fallbackUpdates: FALLBACK_SINGING_UPDATES as DanceUpdateInput[],
  logAgentRun,
});
