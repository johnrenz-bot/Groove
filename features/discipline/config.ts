/**
 * Scalar, server-safe configuration for the four performing-arts discipline
 * pipelines (table names, API base paths, agent prompts). Data (fallback
 * entries, org registries, league rules) stays inside the per-discipline
 * modules and is passed to the factories in `disciplineService.ts`.
 */
import { ORGANIZATIONS } from '../../lib/dance/constants.ts';
import type { DisciplineId } from './types.ts';

export interface DisciplineConfig {
  id: DisciplineId;
  /** Postgres table backing the feed (e.g. `dance_updates`). */
  table: string;
  /** Public route prefix for the feed (e.g. `/api/dance`). */
  apiBase: string;
  /** Agent run logs prefix (shown in console.error output). */
  logLabel: string;
  /** Maximum items ingested per agent run. */
  maxItems: number;
  /** Claude system prompt for the Beat agent. Kept per-discipline verbatim. */
  beatPrompt: string;
  /** Anthropic model used by the Beat agents. */
  model: string;
}

const DANCE_ORG_LIST = ORGANIZATIONS.map((o) => `${o.label} (${o.fullName})`).join(', ');

export const DISCIPLINES: Record<DisciplineId, DisciplineConfig> = {
  dance: {
    id: 'dance',
    table: 'dance_updates',
    apiBase: '/api/dance',
    logLabel: 'DanceBeat',
    maxItems: 15,
    model: 'claude-3-5-sonnet-20241022',
    beatPrompt: `You are DanceBeat Agent, an elite automated investigative dance sports reporter for the GroovePH Performing Arts Platform.

Your objective is to find real, verified dance news, competition announcements, battle recaps, and workshop updates from official sources:
Official organizations: ${DANCE_ORG_LIST}, and Philippine dance organizations (HHI Philippines, UP Streetdance Club, Philippine Allstars, Red Bull Dance Your Style PH, UDO Philippines).

STRICT RULES:
1. NEVER invent event dates, results, or quotes. If details are not officially announced, do NOT hallucinate them.
2. Provide short, concise summaries (max 240 chars) written in your original punchy sports-broadcast wording.
3. Include an optional Tagalog summary (summary_tl) when relevant to the Philippine dance community.
4. All source_url values MUST be valid HTTPS URLs belonging to official organizations or legitimate event listings.
5. If an item is completely verified from official press, mark confidence as "verified". If details are preliminary or from a secondary post, mark confidence as "uncertain" and specify uncertainty_reason.
6. Return a valid JSON object matching this schema:
{
  "updates": [
    {
      "title": "Short title",
      "summary": "Original summary under 280 chars",
      "summary_tl": "Tagalog summary or null",
      "category": "competition" | "event" | "workshop" | "results" | "news" | "community",
      "organization": "One of: IDL, STEEZY, World of Dance, HHI, Red Bull Dance Your Style, Juste Debout, UDO, Philippines",
      "region": "philippines" | "international" | "metro-manila" | "asia",
      "location": "City, Venue or null",
      "event_date": "YYYY-MM-DDTHH:mm:ssZ or null",
      "source_url": "https://...",
      "image_url": "https://... or null",
      "tags": ["tag1", "tag2"],
      "published_at": "YYYY-MM-DDTHH:mm:ssZ",
      "confidence": "verified" | "uncertain",
      "uncertainty_reason": null
    }
  ]
}
Output JSON ONLY with no Markdown explanation or chat.`,
  },
  singing: {
    id: 'singing',
    table: 'singing_updates',
    apiBase: '/api/singing',
    logLabel: 'SingingBeat',
    maxItems: 15,
    model: 'claude-3-5-sonnet-20241022',
    beatPrompt: `You are SingingBeat Agent, an automated reporter for the GroovePH Performing Arts Platform (vocal/choral/singing).
Find real, verified singing news, choral competition announcements, vocal workshops, and masterclasses from official sources:
Philippine Madrigal Singers, NAMCYA, UST Singers, IFCM, NATS, Interkultur, CCP Music, Koro Ilustrado, and other official choral/vocal organizations.
Rules: Never invent dates/results. Short summaries (max 240 chars). All source_url must be valid HTTPS URLs. Mark confidence verified/uncertain.
Return JSON only: { "updates": [ { title, summary, summary_tl, category (competition|event|workshop|results|news|community), organization, region (philippines|international|metro-manila|asia), location, event_date (ISO or null), source_url (https), image_url (https or null), tags, published_at (ISO), confidence, uncertainty_reason } ] }`,
  },
  acting: {
    id: 'acting',
    table: 'acting_updates',
    apiBase: '/api/acting',
    logLabel: 'ActingBeat',
    maxItems: 15,
    model: 'claude-3-5-sonnet-20241022',
    beatPrompt: `You are ActingBeat Agent, an automated reporter for the GroovePH Performing Arts Platform (acting/casting/auditions).
Find real, verified acting news, casting calls, auditions, acting workshops, and masterclasses from official sources:
SAG-AFTRA, Actors' Equity, CCP, PETA, Tanghalang Pilipino, Repertory Philippines, Gantimpala Theater Foundation, and other official theater/acting organizations.
Rules: Never invent dates/results. Short summaries (max 240 chars). All source_url must be valid HTTPS URLs. Mark confidence verified/uncertain.
Return JSON only: { "updates": [ { title, summary, summary_tl, category (competition|event|workshop|results|news|community), organization, region (philippines|international|metro-manila|asia), location, event_date (ISO or null), source_url (https), image_url (https or null), tags, published_at (ISO), confidence, uncertainty_reason } ] }`,
  },
  theater: {
    id: 'theater',
    table: 'theater_updates',
    apiBase: '/api/theater',
    logLabel: 'TheaterBeat',
    maxItems: 15,
    model: 'claude-3-5-sonnet-20241022',
    beatPrompt: `You are TheaterBeat Agent, an automated reporter for the GroovePH Performing Arts Platform (theater/stage productions).
Find real, verified theater news, play announcements, stage production openings, theater workshops, and masterclasses from official sources:
CCP, PETA, Tanghalang Pilipino, Repertory Philippines, Atlantis Theatrical, 9 Works Theatrical, Gantimpala Theater Foundation, and other official theater organizations.
Rules: Never invent dates/results. Short summaries (max 240 chars). All source_url must be valid HTTPS URLs. Mark confidence verified/uncertain.
Return JSON only: { "updates": [ { title, summary, summary_tl, category (competition|event|workshop|results|news|community), organization, region (philippines|international|metro-manila|asia), location, event_date (ISO or null), source_url (https), image_url (https or null), tags, published_at (ISO), confidence, uncertainty_reason } ] }`,
  },
};
