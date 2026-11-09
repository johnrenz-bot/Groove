import { agentOutputSchema, danceUpdateSchema, type DanceUpdateInput } from '../../../lib/dance/schema.ts';
import { ingestTheaterUpdates, logAgentRun } from './theaterService.ts';
import { resolveVerifiedItemImage } from '../../../lib/dance/imageVerification.ts';
import { VERIFIED_THEATER_UPDATES } from '../data/theaterUpdates.ts';

export interface AgentRunResult {
  success: boolean;
  itemsFound: number;
  itemsInserted: number;
  itemsUpdated: number;
  durationMs: number;
  error?: string | null;
  updates: DanceUpdateInput[];
}

export async function runTheaterBeatAgent(): Promise<AgentRunResult> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let candidateUpdates: DanceUpdateInput[] = [];
    if (apiKey) {
      candidateUpdates = await discoverWithClaude(apiKey);
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ANTHROPIC_API_KEY is not configured; refusing to generate synthetic updates in production.');
      }
      console.warn('API key missing; using verified discovery engine (non-production only).');
      candidateUpdates = await discoverWithVerifiedEngine();
    }
    const capped = candidateUpdates.slice(0, 15);
    const { inserted, updated } = await ingestTheaterUpdates(capped);
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    await logAgentRun({ status: 'success', items_found: capped.length, items_inserted: inserted, started_at: startedAt, finished_at: finishedAt });
    return { success: true, itemsFound: capped.length, itemsInserted: inserted, itemsUpdated: updated, durationMs, updates: capped };
  } catch (error: any) {
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    await logAgentRun({ status: 'failure', items_found: 0, items_inserted: 0, error: error?.message || String(error), started_at: startedAt, finished_at: finishedAt });
    console.error('[TheaterBeat Agent Run Error]:', error);
    return { success: false, itemsFound: 0, itemsInserted: 0, itemsUpdated: 0, durationMs, error: error?.message || String(error), updates: [] };
  }
}

async function discoverWithClaude(apiKey: string): Promise<DanceUpdateInput[]> {
  const prompt = `You are TheaterBeat Agent, an automated reporter for the GroovePH Performing Arts Platform (theater/stage productions).
Find real, verified theater news, play announcements, stage production openings, theater workshops, and masterclasses from official sources:
CCP, PETA, Tanghalang Pilipino, Repertory Philippines, Atlantis Theatrical, 9 Works Theatrical, Gantimpala Theater Foundation, and other official theater organizations.
Rules: Never invent dates/results. Short summaries (max 240 chars). All source_url must be valid HTTPS URLs. Mark confidence verified/uncertain.
Return JSON only: { "updates": [ { title, summary, summary_tl, category (competition|event|workshop|results|news|community), organization, region (philippines|international|metro-manila|asia), location, event_date (ISO or null), source_url (https), image_url (https or null), tags, published_at (ISO), confidence, uncertainty_reason } ] }`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-3-5-sonnet-20241022', max_tokens: 3000, temperature: 0.2, messages: [{ role: 'user', content: prompt }] }),
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
    let { imageUrl, imageCredit, imageVerified } = await resolveVerifiedItemImage(item.source_url, item.organization, item.image_url);
    if (imageUrl) {
      if (seenImageUrls.has(imageUrl)) { imageUrl = null; imageCredit = null; imageVerified = false; }
      else seenImageUrls.add(imageUrl);
    }
    const { confidence, uncertainty_reason, ...rest } = item;
    verifiedUpdates.push(danceUpdateSchema.parse({ ...rest, image_url: imageUrl, image_credit: imageCredit, image_verified: imageVerified, status }));
  }
  return verifiedUpdates;
}

async function discoverWithVerifiedEngine(): Promise<DanceUpdateInput[]> {
  const now = Date.now();
  const seenImageUrls = new Set<string>();
  return VERIFIED_THEATER_UPDATES.map((item: any) => {
    let imgUrl = item.image_url;
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
      image_fallback_reason: item.image_fallback_reason || (imgUrl ? null : 'no official source image could be verified for this update'),
      tags: item.tags || null,
      published_at: item.published_at || new Date(now).toISOString(),
      status: item.status || 'published',
    });
  });
}
