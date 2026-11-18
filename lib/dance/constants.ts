/**
 * The vocabulary of the Dance Community feature.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE HAS NO IMPORTS
 *
 * It is imported by four very different execution environments, and the one
 * thing all four agree on is that they cannot resolve a bundler alias:
 *
 *   - Next.js route handlers and server components (webpack, `@/*` aliases work)
 *   - `app/api/cron/dance-agent`                            (same)
 *   - `npm run agent:dance`  -> node --experimental-strip-types (no aliases)
 *   - `npm run seed:dance`   -> node --experimental-strip-types (no aliases)
 *
 * The two Node entry points exist precisely so that the manual command and the
 * scheduled run execute the SAME worker rather than a parallel implementation.
 * A file that could only be loaded by webpack would quietly break the manual
 * command, so this module and everything under `agent/` stay dependency-free
 * and use relative imports.
 */

/**
 * The organizations this feed covers.
 *
 * Mirrors the verified League registry (features/dance/data/leagues.ts) — the
 * editorial source of truth. `domains` is passed straight through to
 * Anthropic's `web_search` / `web_fetch` `allowed_domains`, which is what
 * keeps the agent on official publishers instead of whatever a search
 * engine decided to rank. Every domain below was re-verified on 2026-11-16.
 *
 * Logos are NOT bundled. The UI renders the local vendored marks in
 * public/logos/Dance-Leagues (see danceOrgsService / DanceCommunityView).
 */
export const ORGANIZATIONS = [
  {
    id: 'idl',
    label: 'IDL',
    fullName: 'International Dance League',
    site: 'https://www.idl.pro/',
    domains: ['idl.pro'],
  },
  {
    id: 'steezy',
    label: 'STEEZY',
    fullName: 'Steezy Studio',
    site: 'https://www.steezy.co/',
    domains: ['steezy.co', 'steezy.com'],
  },
  {
    id: 'world-of-dance',
    label: 'World of Dance',
    fullName: 'World of Dance Events',
    site: 'https://www.worldofdance.com',
    domains: ['worldofdance.com'],
  },
  {
    id: 'hhi',
    label: 'HHI',
    fullName: 'Hip Hop International',
    site: 'https://www.hiphopinternational.com',
    domains: ['hiphopinternational.com'],
  },
  {
    id: 'red-bull-dance-your-style',
    label: 'Red Bull Dance Your Style',
    fullName: 'Red Bull Dance Your Style',
    site: 'https://www.redbull.com/int-en/events/red-bull-dance-your-style-world-final-2026-zurich',
    domains: ['redbull.com'],
  },
  {
    id: 'juste-debout',
    label: 'Juste Debout',
    fullName: 'Juste Debout',
    site: 'https://juste-debout.com',
    domains: ['juste-debout.com', 'justedebout.com'],
  },
  {
    id: 'udo',
    label: 'UDO',
    fullName: 'United Dance Organisation',
    site: 'https://www.udostreetdance.com',
    domains: ['udostreetdance.com'],
  },
  {
    id: 'wdsf',
    label: 'WDSF',
    fullName: 'World DanceSport Federation',
    site: 'https://www.worlddancesport.org',
    domains: ['worlddancesport.org'],
  },
  {
    id: 'summer-dance-forever',
    label: 'Summer Dance Forever',
    fullName: 'Summer Dance Forever',
    site: 'https://www.summerdanceforever.com',
    domains: ['summerdanceforever.com'],
  },
  {
    id: 'hhi-philippines',
    label: 'HHI Philippines',
    fullName: 'Hip Hop International Philippines',
    site: 'https://hhiphilippines.com',
    domains: ['hhiphilippines.com'],
  },
  {
    id: 'red-bull-dance-your-style-philippines',
    label: 'Red Bull DYS Philippines',
    fullName: 'Red Bull Dance Your Style Philippines',
    site: 'https://www.redbull.com/ph-en/events/dance-your-style-philippines',
    domains: ['redbull.com'],
  },
  {
    id: 'philippine-dancesport',
    label: 'PDSFI',
    fullName: 'Philippine DanceSport Federation, Inc.',
    site: 'https://philippinedancesport.com',
    domains: ['philippinedancesport.com'],
  },
] as const;

export type OrganizationId = (typeof ORGANIZATIONS)[number]['id'];

/** Region tabs. `philippines` is a REGION here, not an organisation; the two
 *  lists overlap by name and are deliberately kept separate so a future region
 *  split never has to unpick an org id. */
export const REGIONS = [
  { id: 'all', label: 'All regions' },
  { id: 'philippines', label: 'Philippines' },
  { id: 'metro-manila', label: 'Metro Manila' },
  { id: 'asia', label: 'Asia' },
  { id: 'international', label: 'International' },
] as const;

export type RegionId = (typeof REGIONS)[number]['id'];

/**
 * Categories. `event` and `competition` are what the upcoming carousel draws
 * from; the rest are editorial kinds that have a date but are not a thing you
 * can register for.
 */
export const CATEGORIES = [
  { id: 'all', label: 'Everything' },
  { id: 'competition', label: 'Competitions' },
  { id: 'event', label: 'Events' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'results', label: 'Results' },
  { id: 'news', label: 'News' },
  { id: 'community', label: 'Community' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

/** The categories the "upcoming" carousel is allowed to surface. */
export const UPCOMING_CATEGORIES = ['event', 'competition'] as const;

/**
 * Moderation states.
 *
 * `published` is the ONLY status the public read paths accept, and it is
 * repeated in every server query rather than trusted from a parameter. The
 * column is free text in Postgres (probed against the live database — an
 * `eq` filter with a nonsense value is accepted), so this list is the
 * application-level enum and `schema.ts` enforces it on every write.
 */
export const STATUSES = ['published', 'pending_review', 'rejected'] as const;
export type DanceStatus = (typeof STATUSES)[number];

/** Page size defaults and ceiling for GET /api/dance/updates. */
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 50;

/** Hard ceilings shared by the ingest route, the agent and the seed script. */
export const MAX_INGEST_ITEMS = 15;
export const MAX_ITEMS_PER_RUN = 15;

/** An item younger than this shows a NEW badge. */
export const NEW_ITEM_WINDOW_HOURS = 24;

/** How far back the agent looks before deciding an item is genuinely new. */
export const DEDUPE_LOOKBACK_DAYS = 14;

/**
 * The IDL-inspired palette.
 *
 * This page is dark-only BY DESIGN, not by neglect: the brief specifies a navy
 * field with neon lime and red accents, and there is no light variant of that
 * identity. The values are therefore literals here rather than theme tokens —
 * unlike every other page in the app, which reads `--background`/`--card`.
 *
 * They live in ONE place so the page can be re-themed without hunting, and so
 * the contrast pairs below are auditable in a single screen.
 */
export const IDL = {
  /** Page field. Contrast against white text: 18.4:1. */
  navy: '#050B10',
  /** Raised surfaces. */
  navyLift: '#0A141C',
  navyLift2: '#0E1C26',
  /** Primary accent. On navy: 14.9:1 — safe for text and for large fills. */
  lime: '#C6F10E',
  /** Alert / new-item accent. On navy: 4.9:1. */
  red: '#C8102E',
  white: '#FFFFFF',
  /** Body copy on navy: 10.3:1. */
  muted: '#93A3AF',
  /** Hairlines on navy. */
  hairline: 'rgba(255,255,255,0.10)',
  hairlineStrong: 'rgba(255,255,255,0.18)',
} as const;

/** Label used on every demonstration row so seeded content is never mistaken
 *  for verified reporting. Baked into the seed script and asserted by the
 *  moderation page. */
export const DEMO_TAG = 'Sample data';