/**
 * Beat-agent factory — one implementation of the discovery pipeline for the
 * four discipline agents. The per-discipline modules only configure data:
 * prompt, ingest function, fallback dataset and log label.
 *
 * Pipeline:
 *   1. Anthropic Claude (when ANTHROPIC_API_KEY is set) with strict Zod
 *      validation of the returned JSON.
 *   2. Otherwise, the verified discovery engine (curated fallback dataset) —
 *      refused outright in production.
 *   3. Slice to the configured cap, ingest through the discipline's zod
 *      schema + image verification chain, then log the run to `agent_runs`.
 */
import { agentOutputSchema, danceUpdateSchema, type DanceUpdateInput } from '../../../lib/dance/schema.ts';
import { resolveVerifiedItemImage } from '../../../lib/dance/imageVerification.ts';
import type { DisciplineId, AgentRunResult } from '../types.ts';
import { DISCIPLINES } from '../config.ts';

export interface BeatAgentDeps {
  id: DisciplineId;
  /** Ingest one batch; used by the agent and mirrored by the scripts. */
  ingest(updates: DanceUpdateInput[]): Promise<{ inserted: number; updated: number }>;
  /** Curated, verified fallback dataset for the non-production engine. */
  fallbackUpdates: DanceUpdateInput[];
  /** Logs an `agent_runs` row; never throws. */
  logAgentRun(run: {
    status: 'success' | 'failure' | 'partial';
    items_found: number;
    items_inserted: number;
    error?: string | null;
    started_at: string;
    finished_at: string;
  }): Promise<void>;
}

export function createDisciplineBeatAgent({
  id,
  ingest,
  fallbackUpdates,
  logAgentRun,
}: BeatAgentDeps) {
  const cfg = DISCIPLINES[id];

  /** Discovers and publishes verified updates for the discipline. */
  async function runDisciplineBeatAgent(): Promise<AgentRunResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      let candidateUpdates: DanceUpdateInput[] = [];

      if (apiKey) {
        candidateUpdates = await discoverUpdatesWithClaude(apiKey, cfg.beatPrompt, cfg.model);
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            'ANTHROPIC_API_KEY is not configured; refusing to generate synthetic updates in production.'
          );
        }
        console.warn('API key missing; using verified discovery engine (non-production only).');
        candidateUpdates = discoverWithVerifiedEngine(fallbackUpdates);
      }

      const capped = candidateUpdates.slice(0, cfg.maxItems);
      const { inserted, updated } = await ingest(capped);

      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      await logAgentRun({
        status: 'success',
        items_found: capped.length,
        items_inserted: inserted,
        started_at: startedAt,
        finished_at: finishedAt,
      });

      return {
        success: true,
        itemsFound: capped.length,
        itemsInserted: inserted,
        itemsUpdated: updated,
        durationMs,
        updates: capped,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      await logAgentRun({
        status: 'failure',
        items_found: 0,
        items_inserted: 0,
        error: errorMessage,
        started_at: startedAt,
        finished_at: finishedAt,
      });

      console.error(`[${cfg.logLabel} Agent Run Error]:`, error);

      return {
        success: false,
        itemsFound: 0,
        itemsInserted: 0,
        itemsUpdated: 0,
        durationMs,
        error: errorMessage,
        updates: [],
      };
    }
  }

  return runDisciplineBeatAgent;
}

async function discoverUpdatesWithClaude(
  apiKey: string,
  prompt: string,
  model: string
): Promise<DanceUpdateInput[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API responded with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.content?.[0]?.text || '';
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude response did not contain a valid JSON object');
  const parsed = JSON.parse(jsonMatch[0]);
  const validated = agentOutputSchema.parse(parsed);

  const seenImageUrls = new Set<string>();
  const verifiedUpdates: DanceUpdateInput[] = [];
  for (const item of validated.updates) {
    const status = item.confidence === 'verified' ? 'published' : 'pending_review';
    let { imageUrl, imageCredit, imageVerified } = await resolveVerifiedItemImage(
      item.source_url,
      item.organization,
      item.image_url
    );
    if (imageUrl) {
      if (seenImageUrls.has(imageUrl)) {
        imageUrl = null;
        imageCredit = null;
        imageVerified = false;
      } else {
        seenImageUrls.add(imageUrl);
      }
    }
    const { confidence, uncertainty_reason, ...rest } = item;
    verifiedUpdates.push(
      danceUpdateSchema.parse({
        ...rest,
        image_url: imageUrl,
        image_credit: imageCredit,
        image_verified: imageVerified,
        status,
      })
    );
  }
  return verifiedUpdates;
}

/** Non-production discovery: replay the curated verified dataset through the schema. */
function discoverWithVerifiedEngine(
  fallbackUpdates: DanceUpdateInput[]
): DanceUpdateInput[] {
  const now = Date.now();
  const seenImageUrls = new Set<string>();
  return fallbackUpdates.map((item: DanceUpdateInput & {
    image_source_url?: string | null;
    image_alt?: string | null;
    image_fallback_reason?: string | null;
    summary_tl?: string | null;
    region?: string | null;
    location?: string | null;
    event_date?: string | null;
    image_credit?: string | null;
    image_verified?: boolean;
    published_at?: string | null;
    status?: string;
    tags?: string[] | null;
  }) => {
    let imgUrl = item.image_url ?? null;
    let imgVerified = item.image_verified ?? false;
    let imgCredit = item.image_credit ?? null;
    if (imgUrl) {
      if (seenImageUrls.has(imgUrl)) { imgUrl = null; imgVerified = false; imgCredit = null; }
      else seenImageUrls.add(imgUrl);
    }
    const sourceUrl = String(item.source_url || '').replace(/^http:/i, 'https:');
    return danceUpdateSchema.parse({
      title: item.title,
      summary: item.summary,
      summary_tl: item.summary_tl || null,
      category: item.category,
      organization: item.organization,
      region: item.region || 'international',
      location: item.location || null,
      event_date: item.event_date || null,
      source_url: sourceUrl,
      image_url: imgUrl,
      image_credit: imgCredit,
      image_verified: imgVerified,
      image_source_url: item.image_source_url || null,
      image_alt: item.image_alt || null,
      image_fallback_reason:
        item.image_fallback_reason ||
        (imgUrl ? null : 'no official source image could be verified for this update'),
      tags: item.tags || null,
      published_at: item.published_at || new Date(now).toISOString(),
      status: item.status || 'published',
    });
  });
}
