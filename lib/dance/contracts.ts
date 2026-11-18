/**
 * Zod contracts for the Dance Community registry.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE SCHEMA PER RECORD
 *
 * League, DanceEvent, Dispatch and Crew are the shapes the page, the ingest
 * pipeline and the admin review flow all agree on. They are deliberately
 * dependency-free (zod only) so they load under plain Node — the registry
 * verification script and future cron workers share them with the Next.js
 * pages.
 *
 * NON-NEGOTIABLE PROVENANCE
 *
 * Every record carries: sourceUrl, sourceName, fetchedAt, lastVerifiedAt and
 * a `status` ('pending' | 'approved' | 'needs-info' | 'rejected'). A record
 * without a fetched source is not representable, exactly like dance_updates.
 *
 * `completenessScore` is 0–100 and means: the percentage of required public
 * fields that carry a real, non-placeholder value. It is computed by
 * computeCompletenessScore() — never hand-set — so it cannot drift from the
 * data. Anything below 80 is surfaced as "needs info" in the UI until the
 * record reaches 'approved' status.
 */

import { z } from 'zod';

/* ---------------------------------- shared --------------------------------- */

export const recordStatusSchema = z.enum(['pending', 'approved', 'needs-info', 'rejected']);
export type RecordStatus = z.infer<typeof recordStatusSchema>;

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url('Must be a valid URL')
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'Must be an https:// URL',
  });

export const socialLinksSchema = z
  .object({
    website: httpsUrl.nullable().optional(),
    instagram: httpsUrl.nullable().optional(),
    youtube: httpsUrl.nullable().optional(),
    tiktok: httpsUrl.nullable().optional(),
  })
  .default({});

export type SocialLinks = z.infer<typeof socialLinksSchema>;

export const isoDateTime = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be an ISO-8601 timestamp')
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/.test(value),
    'Must start with YYYY-MM-DD'
  );

const isoDate = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)));

/* ---------------------------------- League --------------------------------- */

export const leagueDisciplineSchema = z.enum([
  'hip-hop',
  'breaking',
  'choreo',
  'street',
  'dancesport',
  'k-pop cover',
]);
export type LeagueDiscipline = z.infer<typeof leagueDisciplineSchema>;

export const leagueScopeSchema = z.enum(['international', 'philippines']);
export type LeagueScope = z.infer<typeof leagueScopeSchema>;

/** Filter variant used by the UI ("All / International / Philippines"). */
export const leagueScopeFilterSchema = z.enum(['all', 'international', 'philippines']);
export type LeagueScopeFilter = z.infer<typeof leagueScopeFilterSchema>;

/**
 * A competition body / federation / sanctioned circuit. NOT a media
 * organization, a dance studio, or a crew — those are different objects.
 */
export const leagueSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/, 'id must be a slug'),
  /** Official public name, verbatim from the source. */
  name: z.string().trim().min(1).max(200),
  /** What the UI renders in the marquee. */
  shortName: z.string().trim().min(1).max(60),
  scope: leagueScopeSchema,
  disciplines: z.array(leagueDisciplineSchema).min(1).max(6),
  /** Two-letter ISO country/region of the organization. 'PH' or e.g. 'INT' for intl circuits. */
  country: z.string().trim().min(2).max(3),
  /** Official homepage. */
  website: httpsUrl,
  /** Local vendored logo (see public/logos/Dance-Leagues) or a remote https URL. */
  logoUrl: z.string().trim().max(2048).nullable(),
  socials: socialLinksSchema,
  /** Official page this record was fetched from. */
  sourceUrl: httpsUrl,
  sourceName: z.string().trim().min(1).max(200),
  fetchedAt: isoDateTime,
  lastVerifiedAt: isoDateTime,
  status: recordStatusSchema,
  /**
   * Substrings (case-insensitive) matched against `dance_updates.organization`
   * to attribute dispatches and events to this league without guessing. A
   * dispatch may only belong to a league whose tokens match its stored org.
   */
  matchTokens: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
});

export type League = z.infer<typeof leagueSchema>;
export type LeagueInput = z.input<typeof leagueSchema>;

/* ---------------------------------- DanceEvent -------------------------------- */

export const danceEventTypeSchema = z.enum(['competition', 'audition', 'workshop', 'result', 'news']);
export type DanceEventType = z.infer<typeof danceEventTypeSchema>;

export const danceEventSchema = z.object({
  id: z.string().trim().min(1).max(120),
  leagueId: leagueSchema.shape.id.nullable(),
  title: z.string().trim().min(1).max(200),
  type: danceEventTypeSchema,
  /** ISO with venue offset — the venue clock is the one on the ticket. */
  startAt: isoDateTime,
  endAt: isoDateTime.nullable(),
  /** IANA timezone name (e.g. 'Asia/Manila'). Empty when unknown. */
  timezone: z.string().trim().max(60).default(''),
  venue: z.string().trim().max(160).nullable(),
  city: z.string().trim().max(80).nullable(),
  country: z.string().trim().max(80).nullable(),
  registrationUrl: httpsUrl.nullable(),
  officialUrl: httpsUrl.nullable(),
  sourceUrl: httpsUrl,
  sourceName: z.string().trim().min(1).max(200).default(''),
  imageUrl: z.string().trim().max(2048).nullable(),
  imageCredit: z.string().trim().max(160).nullable(),
  /** Own-words summary. Never copied article text. */
  summary: z.string().trim().max(500).nullable(),
  status: recordStatusSchema,
  fetchedAt: isoDateTime,
  lastVerifiedAt: isoDateTime,
  completenessScore: z.number().int().min(0).max(100),
});

export type DanceEvent = z.infer<typeof danceEventSchema>;

/* ---------------------------------- Dispatch --------------------------------- */

export const dispatchCategorySchema = z.enum([
  'Competitions',
  'Events',
  'Workshops',
  'Results',
  'News',
  'Community',
]);
export type DispatchCategory = z.infer<typeof dispatchCategorySchema>;

/** Rough map between the ingest vocabulary and the UI tab labels. */
export const DISPATCH_CATEGORY_TO_UPDATE: Record<DispatchCategory, string> = {
  Competitions: 'competition',
  Events: 'event',
  Workshops: 'workshop',
  Results: 'results',
  News: 'news',
  Community: 'community',
};

export const dispatchSchema = z.object({
  id: z.string().trim().min(1).max(120),
  leagueId: leagueSchema.shape.id.nullable(),
  category: dispatchCategorySchema,
  title: z.string().trim().min(1).max(200),
  /** Own words, at most two short sentences. */
  summary: z.string().trim().min(1).max(280),
  publishedAt: isoDateTime,
  sourceUrl: httpsUrl,
  sourceName: z.string().trim().min(1).max(200),
  imageUrl: z.string().trim().max(2048).nullable(),
  imageCredit: z.string().trim().max(160).nullable(),
  status: recordStatusSchema,
  fetchedAt: isoDateTime,
  lastVerifiedAt: isoDateTime,
});

export type Dispatch = z.infer<typeof dispatchSchema>;

/* ----------------------------------- Crew ----------------------------------- */

export const MatchRecapSchema = z.object({
  id: z.string().trim().min(1).max(120),
  event: z.string().trim().min(1).max(200),
  stage: z.string().trim().min(1).max(80),
  date: z.string().trim().max(60),
  result: z.enum(['WIN', 'CHAMPION', 'FINALIST', 'PODIUM']),
  category: z.string().trim().max(80),
  summary: z.string().trim().min(1).max(500),
  source_url: httpsUrl,
  score: z.string().trim().max(40).optional(),
  opponent: z.string().trim().max(80).optional(),
});
export type MatchRecap = z.infer<typeof MatchRecapSchema>;

export const crewSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  scope: leagueScopeSchema,
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().max(80).nullable(),
  flag: z.string().trim().max(8).default(''),
  division: z.string().trim().max(80).nullable(),
  /** Year the crew was founded. null when the source does not state it. */
  foundedYear: z.number().int().min(1900).max(2100).nullable(),
  /** Named leaders (founder / director credits), exactly as the source states. */
  leaders: z.array(z.string().trim().min(1).max(80)).max(10),
  /** Notable members, exactly as the source states. */
  keyMembers: z.array(
    z.object({
      name: z.string().trim().min(1).max(120),
      role: z.string().trim().max(80).nullable().optional(),
      sourceUrl: httpsUrl.nullable().optional(),
    }),
  ),
  /** Roster size when published; free text because sources publish it that way. */
  rosterSize: z.string().trim().max(160).nullable(),
  achievements: z.array(
    z.object({
      title: z.string().trim().min(1).max(200),
      year: z.number().int().min(1900).max(2100).nullable().optional(),
      sourceUrl: httpsUrl,
    }),
  ),
  leagueIds: z.array(leagueSchema.shape.id).max(10),
  website: httpsUrl.nullable(),
  instagram: httpsUrl.nullable(),
  youtube: httpsUrl.nullable(),
  tiktok: httpsUrl.nullable(),
  heroImageUrl: z.string().trim().max(2048).nullable(),
  heroImageSourceUrl: httpsUrl.nullable(),
  imageCredit: z.string().trim().max(160).nullable(),
  /** Official videos; YouTube embed ids are preferred when the channel is verified. */
  videos: z.array(
    z.object({
      url: httpsUrl,
      youtubeId: z.string().trim().regex(/^[A-Za-z0-9_-]{11}$/).nullable().optional(),
      title: z.string().trim().max(200).nullable().optional(),
      sourceUrl: httpsUrl.nullable().optional(),
    }),
  ),
  sourceUrls: z.array(httpsUrl).min(1).max(10),
  status: recordStatusSchema,
  completenessScore: z.number().int().min(0).max(100),
  /** For UI ordering only; does not affect editorial status. */
  sortOrder: z.number().int().min(0).default(100),
  /* ---- UI helpers carried through the dossier, not scored ---- */
  /** Free-text display note about the crew. Editorial, shown verbatim. */
  bio: z.string().trim().max(600).optional(),
  logo: z
    .object({
      url: z.string().trim().max(2048).nullable(),
      alt: z.string().trim().max(200),
      source_url: httpsUrl,
      verified: z.boolean(),
      fallbackReason: z.string().trim().max(280).optional(),
    })
    .optional(),
  /** Match recaps, verbatim from current data; shape unchanged for the UI. */
  recentRecaps: z.array(MatchRecapSchema).default([]),
});

export type Crew = z.infer<typeof crewSchema>;

/** Convenience element type for dossier components. */
export type CrewAchievement = Crew['achievements'][number];
/** Convenience element type for dossier components. */
export type CrewMember = Crew['keyMembers'][number];

/* ------------------------------ completeness ------------------------------- */

/**
 * Deterministic completeness score for a registry record.
 *
 * Required fields carry weight; a value present-but-useless (e.g. 'TBD' as a
 * founder) scores zero because placeholders are exactly what the score exists
 * to expose. `null`/`undefined`/`''` all score zero.
 */
export function computeCompletenessScore(fields: Record<string, unknown>): number {
  let total = 0;
  let filled = 0;

  for (const [key, value] of Object.entries(fields)) {
    total += 1;
    if (isPresent(value)) filled += 1;
  }
  if (total === 0) return 0;
  return Math.round((filled / total) * 100);
}

const PLACEHOLDER_TOKENS = ['tbd', 'unknown', 'n/a', 'none', '—', '-'];

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.length === 0) return false;
    if (PLACEHOLDER_TOKENS.includes(t.toLowerCase())) return false;
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

/** Editorial threshold: below it the record shows a "Needs info" badge. */
export const COMPLETENESS_THRESHOLD = 80;
