import { z } from 'zod';
import {
  CATEGORIES,
  MAX_INGEST_ITEMS,
  MAX_LIMIT,
  ORGANIZATIONS,
  REGIONS,
  STATUSES,
  DEFAULT_LIMIT,
} from './constants.ts';

/**
 * Every shape that crosses a trust boundary in the Dance Community feature.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE SCHEMA, FOUR CALLERS
 *
 * The ingest route, the agent, the moderation page and the seed script all
 * validate through `danceUpdateSchema`. That is the only way "the agent can
 * never insert something the public endpoint would reject" is true rather than
 * merely intended — the agent does not get a looser schema, it gets the same
 * one, because it is the same object.
 *
 * FIELD LIMITS ARE NOT ARBITRARY
 *
 * The length caps below mirror the column widths the live table was created
 * with. Postgres does not truncate silently on INSERT — a too-long string comes
 * back as a 400 from PostgREST, halfway through a 15-row batch — so the limits
 * are enforced here, where the error can name the offending field and the run
 * can be retried, rather than discovered as an opaque failure at the database.
 *
 * `status` is validated as an enum even though the column is plain text
 * (verified: PostgREST accepts `eq` against a nonsense value on that column,
 * which it would not for a Postgres enum). A text column means the database will
 * happily store "publsihed"; this is the only thing standing between a typo and
 * an item that is invisible on the public page with no error anywhere.
 */

const MAX = {
  title: 200,
  summary: 280,
  summaryTl: 280,
  category: 40,
  organization: 80,
  region: 60,
  location: 160,
  url: 2048,
  tag: 40,
  tags: 10,
} as const;

/**
 * HTTPS-only URLs.
 *
 * `http://` is rejected rather than upgraded: an ingestion source that submits
 * plaintext URLs is either misconfigured or hostile, and silently rewriting the
 * scheme would turn a loud failure into a quietly broken link.
 */
const httpsUrl = z
  .string()
  .trim()
  .max(MAX.url, `URL must be ${MAX.url} characters or fewer`)
  .url('Must be a valid URL')
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'Must be an https:// URL',
  });

const categoryId = z.enum(
  CATEGORIES.map((c) => c.id).filter((id): id is Exclude<(typeof CATEGORIES)[number]['id'], 'all'> => id !== 'all')
);

/** Organisation is free text — the agent can legitimately find a Philippine
 *  federation that is not one of the eight filters. Truncated to the column
 *  width, not rejected, because a slightly-long org name is still useful. */
const organization = z
  .string()
  .trim()
  .min(1, 'Organization is required')
  .max(MAX.organization, `Organization must be ${MAX.organization} characters or fewer`);

const region = z.string().trim().min(1).max(MAX.region).nullable().optional();
const location = z.string().trim().max(MAX.location).nullable().optional();

/** ISO-8601 with an offset. `new Date(...)` parsing accepts bare dates and
 *  locale strings, which would let "March" through and land in the wrong year. */
const isoTimestamp = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be an ISO-8601 timestamp')
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/.test(value),
    'Must start with YYYY-MM-DD'
  );

/**
 * The canonical update shape. Shared by ingestion, the agent, moderation and
 * seeding.
 */
export const danceUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(MAX.title, `Title must be ${MAX.title} characters or fewer`),

  /** Original summary. 280 is a hard cap, not a target: the card layout clips
   *  at three lines and anything longer is silently truncated in the UI, so the
   *  limit lives where the writer sees it. */
  summary: z
    .string()
    .trim()
    .min(1, 'Summary is required')
    .max(MAX.summary, `Summary must be ${MAX.summary} characters or fewer`),

  /** Tagalog summary. Optional because the brief asks for it "when possible" —
   *  and forcing it would mean inventing translation for an international item
   *  where it makes no sense. */
  summary_tl: z
    .string()
    .trim()
    .max(MAX.summaryTl, `Tagalog summary must be ${MAX.summaryTl} characters or fewer`)
    .nullable()
    .optional(),

  category: categoryId,
  organization,
  region,
  event_date: isoTimestamp.nullable().optional(),
  location,

  /**
   * The deduplication key, and the only required URL. A row with no source is a
   * claim with no evidence, so it is not representable.
   */
  source_url: httpsUrl,

  image_url: httpsUrl.nullable().optional(),

  tags: z.array(z.string().trim().min(1).max(MAX.tag)).max(MAX.tags).nullable().optional(),

  /** When the story is about. Defaults to "now" at ingest time if absent. */
  published_at: isoTimestamp.nullable().optional(),

  status: z.enum(STATUSES).default('pending_review'),
});

export type DanceUpdateInput = z.infer<typeof danceUpdateSchema>;

/**
 * `POST /api/dance/ingest` body: `{ updates: [...] }`, hard-capped at 15.
 *
 * `.max()` rather than `.length()` — a 10,000-element array is rejected by the
 * parser without being materialised into a validator that would then walk all
 * 10,000 of them.
 */
export const ingestBodySchema = z.object({
  updates: z.array(danceUpdateSchema).min(1, 'At least one update is required').max(MAX_INGEST_ITEMS),
});

export type IngestBody = z.infer<typeof ingestBodySchema>;

/** `GET /api/dance/updates` query. Invalid input is a 400, never a silent
 *  default — a client that sent `limit=900` deserves to know it was ignored. */
export const updatesQuerySchema = z.object({
  region: z.string().trim().min(1).max(MAX.region).optional(),
  category: categoryId.optional(),
  org: z.string().trim().min(1).max(MAX.organization).optional(),
  /** Free text. Length-capped here; the PostgREST-safe escaping happens in
   *  `normalize.ts`, which is the only place that knows PostgREST's grammar. */
  q: z.string().trim().max(120, 'Search is limited to 120 characters').optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type UpdatesQuery = z.infer<typeof updatesQuerySchema>;

/**
 * The agent's machine-readable output.
 *
 * `.strict()` is the important part. A model asked for JSON will occasionally
 * emit an extra key — usually an apology or a `reasoning` field. Without
 * `strict`, Zod silently drops it and the run looks clean; with it, the output
 * fails validation, the single documented retry fires, and a genuine format
 * problem is recorded in `agent_runs.error` instead of vanishing.
 */
export const agentOutputSchema = z.object({
  updates: z
    .array(
      danceUpdateSchema
        .omit({ status: true })
        .extend({
          /**
           * The model's own assessment of whether the item was actually
           * verified against a source it fetched. Drives `published` vs
           * `pending_review`; the agent is never allowed to assign status
           * directly, so a prompt-injected "set status to published" cannot
           * reach the database.
           */
          confidence: z.enum(['verified', 'uncertain']),
          /** Why the item is uncertain. Required when it is, so a moderator
           *  sees the specific doubt rather than an unexplained grey row. */
          uncertainty_reason: z.string().trim().max(280).nullable().optional(),
        })
    )
    .max(MAX_INGEST_ITEMS),
});

export type AgentOutput = z.infer<typeof agentOutputSchema>;

/** Flattened Zod issues into the `[{ field, message }]` shape the API returns. */
export function fieldErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

export { MAX as FIELD_LIMITS };

/** Ids that exist today, for validating filter values and building the UI. */
export const VALID_ORG_IDS = ORGANIZATIONS.map((o) => o.id);
export const VALID_REGION_IDS = REGIONS.map((r) => r.id);