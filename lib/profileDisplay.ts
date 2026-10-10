/**
 * Public-profile presentation helpers.
 *
 * These live in their own module, with NO 'use client' directive, for two
 * reasons that matter:
 *   1. the same rules are needed by a server component and a client component,
 *      and importing a 'use client' module from the server turns it into an
 *      opaque client reference rather than plain functions;
 *   2. they are pure and independently testable, so "is this age correct?" is a
 *      question with a single answer rather than one re-derived at each call
 *      site.
 *
 * WHY AGE IS COMPUTED AND NEVER STORED
 *   `profiles` has a `birthdate DATE` and no age column. Storing an age would
 *   mean a value that is correct on exactly one day and silently wrong on every
 *   other one, and it would have to be rewritten by a scheduled job nobody would
 *   remember to run. Deriving it from the birthdate against the current date is
 *   the only version that cannot go stale.
 *
 * WHY ONLY THE AGE IS EVER EXPOSED
 *   `birthdate` is personal data and is deliberately absent from the public
 *   profile's column allowlist (see PUBLIC_PROFILE_COLUMNS and the note in
 *   app/userprofile/[id]/page.tsx). A whole date of birth narrows a person to a
 *   single day; an integer does not. This module therefore produces the age, and
 *   the page renders the age — never the underlying date.
 */

/** A person's public identity, as far as presentation is concerned. */
export interface PresentableProfile {
  firstname?: string | null;
  middlename?: string | null;
  lastname?: string | null;
  suffix?: string | null;
  username?: string | null;
  birthdate?: string | null;
  city_name?: string | null;
  province_name?: string | null;
  region_name?: string | null;
  address_summary?: string | null;
  custom_id?: string | null;
}

/**
 * Whole years between a birthdate and `now`, or null when there is no usable
 * birthdate.
 *
 * The subtlety is the birthday-within-this-year test. Someone born on the 4th is
 * 30 on the 4th of December and 29 on the 3rd — subtracting the years alone
 * reports them a year old on their birthday morning, which is the classic off-by-
 * one in an age display.
 *
 * Everything is compared in LOCAL time. Postgres hands back a bare `YYYY-MM-DD`
 * for a DATE column, so constructing a Date from that string and reading
 * `getMonth()`/`getDate()` in UTC would roll back a day for anyone west of
 * Greenwich — and would put a Filipino member's birthday on the wrong day.
 *
 * Invalid input returns null rather than a number. A future date, an
 * unparseable string, or a missing month/day is not "age 0" and not "-3"; it is
 * unknown, and the caller shows nothing rather than something wrong.
 */
export function ageFromBirthdate(
  birthdate: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!birthdate || typeof birthdate !== 'string') return null;

  // Accept only the canonical DATE form PostgREST returns. Anything else is a
  // value this function was not designed to interpret.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const age =
    now.getFullYear() -
    year -
    (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0);

  // A birthdate in the future is bad data, not a negative age. Returning null
  // makes it render as absent instead of as a nonsensical figure.
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Age with its unit, ready to render.
 *
 * The unit is singular for 1 because "1 years old" is the sort of small wrong
 * that makes a page feel machine-made. Returns null when the age is unknown, so
 * the caller can omit the row entirely rather than print "Age: —".
 */
export function formatAge(
  birthdate: string | null | undefined,
  now: Date = new Date()
): string | null {
  const age = ageFromBirthdate(birthdate, now);
  if (age === null) return null;
  return `${age} ${age === 1 ? 'year' : 'years'} old`;
}

/**
 * The person's name, honouring the optional middle name and suffix.
 *
 * The schema stores firstname / middlename / lastname / suffix, and every part
 * except firstname and lastname is nullable. Building the name by concatenation
 * of whichever parts exist means an account that filled in everything gets the
 * full form and an account that did not gets a clean two-part name — never
 * "John  Garcia" with a hole in it, and never a leading comma.
 */
export function formatFullName(profile: PresentableProfile): string {
  const parts = [profile.firstname, profile.middlename, profile.lastname, profile.suffix]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  return parts.join(' ');
}

/**
 * The location, assembled from whichever saved fields exist.
 *
 * Deliberately returns an EMPTY STRING rather than a default when nothing is
 * saved. The page this replaces printed the literal "San Jose del Monte,
 * Bulacan" for every profile that had no location on file, which asserted a home
 * town the member may never have given — the single most misleading thing a
 * profile can do. No city is better than a wrong city.
 *
 * Only the fields the schema actually has are used: there is no country column,
 * so the Philippines mark stays a platform-level badge rather than being
 * presented as this member's saved country.
 */
export function formatLocation(profile: PresentableProfile): string {
  // city, then province, then region — most specific first. address_summary is
  // the member's own free-text address and is deliberately NOT used here: it is
  // excluded from the public allowlist because it contains street-level detail.
  const parts = [profile.city_name, profile.province_name, profile.region_name]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);

  // De-duplicate: a member whose city and province were both filled with the
  // same value would otherwise see "Bulacan, Bulacan".
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.join(', ');
}

/** `Joined October 2026`, from `created_at`. Null when there is no date. */
export function formatMemberSince(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}
