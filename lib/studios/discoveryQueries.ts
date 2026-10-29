/**
 * Automatic Google Places discovery vocabulary.
 *
 * GroovePH does not store a dance style for Google businesses, so the locator
 * no longer exposes a style filter. Instead the API spends a small, bounded
 * request budget on several real category queries. That finds studios, schools,
 * academies, ballet and hip-hop spaces, and performing-arts centres that a
 * single "dance studio" query can miss.
 *
 * The budget is deliberately finite: every page is a billable Text Search
 * request, and the default Google Cloud project quota can be as low as 100
 * requests per day. Results are cached for six hours by `lib/googlePlaces.ts`.
 */

export const DANCE_DISCOVERY_QUERIES = [
  'dance studio',
  'dance school',
  'dance academy',
  'ballet studio',
  'hip hop dance studio',
  'k-pop dance studio',
  'ballroom dance studio',
  'performing arts center',
] as const;

/**
 * Radius browsing is primarily a single Nearby Search (New) request, which is
 * type-based and has its own quota metric. These category keyword queries are
 * the supplement: they run when Nearby Search is unavailable or returns no
 * dance businesses. A Text Search query returns at most 20 places per page, so
 * a second page is how a dense city produces more than 20 hits per category.
 */
export const NEARBY_DISCOVERY_QUERIES: readonly string[] =
  DANCE_DISCOVERY_QUERIES.slice(0, 6);

export const NEARBY_MAX_QUERIES = 6;
export const NEARBY_MAX_PAGES_PER_QUERY = 2;
/** Six first pages plus two second pages, all bounded per search. */
export const NEARBY_MAX_REQUESTS = 8;

/**
 * The nationwide sweep rotates categories across cities. Four cities on a page
 * therefore cover four different query types, and the next page continues the
 * rotation instead of repeating "dance studio" everywhere.
 */
export const NATIONWIDE_CITY_QUERIES: readonly string[] = DANCE_DISCOVERY_QUERIES;

/** One page per city keeps a four-city sweep to four billable requests. */
export const NATIONWIDE_MAX_PAGES_PER_CITY = 1;
