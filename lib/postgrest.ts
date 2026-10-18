/**
 * PostgREST filter-string escaping.
 *
 * supabase-js does NOT escape anything it interpolates into `.or()`. The
 * argument is raw PostgREST grammar:
 *
 *   .or(`firstname.ilike.%${q}%,lastname.ilike.%${q}%`)
 *                      ^^^^^^^^^^^^^^^^^^^^^^^^^
 *                      `,` closes the current filter, `.` starts a new one
 *
 * So a search term containing `,` `)` `.` or `*` does not search for that term —
 * it rewrites the filter. Two endpoints reached this with a caller-supplied `q`
 * and no length-only validation:
 *
 *   - `/api/users` — unauthenticated, returning up to 1000 profile rows;
 *   - `/api/dance/updates` — unauthenticated, and the query runs on the
 *     service-role client, so RLS is not a backstop.
 *
 * Both are now built with the helpers below.
 *
 * POSTGREST'S OWN ESCAPE IS DOUBLE QUOTING
 *
 *   A value wrapped in `"…"` is taken literally; inside it, `\` and `"` are
 *   escaped with a backslash. Quoting is what makes `,` and `)` ordinary
 *   characters again. `%` and `_` are NOT special to PostgREST — they are
 *   special to the SQL `LIKE` behind `ilike`, so they are escaped separately
 *   before the value is quoted.
 */

/** Escape the `LIKE` wildcards. Only meaningful for `ilike` / `like`. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Quote a literal value for use inside a PostgREST filter expression. */
export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Build a case-insensitive "contains" pattern as a single PostgREST literal.
 *
 * `ilikeContains('ana')` -> `"%ana%"`, which `.or('firstname.ilike.…')` treats as
 * one value rather than as three filters.
 */
export function ilikeContains(term: string): string {
  return quotePostgrestValue(`%${escapeLikePattern(term)}%`);
}

/**
 * Build the whole `or=(…)` argument for a "term appears in any of these columns"
 * search. Column names come from code, never from the request, so only the value
 * needs escaping.
 */
export function buildOrContains(columns: string[], term: string): string {
  const needle = ilikeContains(term);
  return columns.map((column) => `${column}.ilike.${needle}`).join(',');
}