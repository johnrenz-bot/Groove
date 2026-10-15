const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * How an event date is DISPLAYED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Formats an event timestamp using the UTC offset written into the string —
 * the venue's own clock — and returns null when the value is unusable.
 *
 * It lives here, and not as a helper inside `UpdateCard.tsx`, for two reasons:
 *
 * 1. TESTABILITY. This module has no imports and loads under plain Node, so
 *    `scripts/verify-dance-dates.ts` can assert the exact strings a reader
 *    sees. A formatter that can only be tested by rendering a React component
 *    does not get tested.
 *
 * 2. IT WAS A REAL BUG. Both the card and the Upcoming Events rail originally
 *    used `toLocaleDateString` with no explicit `timeZone`, which formats in the
 *    READER's zone. The Red Bull World Final is 24 October 18:00 in Zurich,
 *    which is already 25 October in Manila — so the page showed "Oct 25"
 *    directly above a headline reading "24 October". Same card, two different
 *    dates on one screen.
 *
 * The venue's clock is also the one printed on the ticket, so it is the one a
 * reader needs. An explicit offset also makes the string identical for every
 * reader everywhere, which is what makes it assertable at all.
 */
export function formatEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null;

  const m = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?\s*(Z|[+-]\d{2}:?\d{2})?/
  );
  if (!m) return null;

  const [, y, mo, d, hh, mm] = m;
  const monthIndex = Number(mo) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;

  const date = `${Number(d)} ${MONTHS[monthIndex]} ${y}`;
  if (!hh) return date; // date-only value: there is no clock to disagree about

  const hour24 = Number(hh);
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = mm ? String(Number(mm)).padStart(2, '0') : '00';

  return `${date}, ${hour12}:${minute} ${suffix}`;
}

/**
 * Calendar parts for the Upcoming Events date box, from the same venue-local
 * reading. Returns null rather than a partial so the box can show "TBD"
 * instead of a confidently wrong day.
 */
export function parseEventDateParts(
  iso: string | null | undefined
): { year: number; month: string; day: number } | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year: Number(m[1]), month: MONTHS[monthIndex], day: Number(m[3]) };
}

/**
 * TypeScript shape of a row in the `dance_orgs` table.
 *
 * Mirrors supabase/migrations/19_dance_orgs.sql exactly. Kept import-free in
 * its own module so server pages, the carousel service, and the sync script
 * can all share one definition without pulling in unrelated dependencies.
 */
export interface DanceOrg {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  logo_url: string | null;
  logo_source_url: string | null;
  logo_verified: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
