/**
 * Shared typography constants.
 *
 * Every UI string that needs one of these characters uses the escape sequence
 * below, never a raw literal — a previous generation of files were saved
 * through a Latin-1 / Windows-1252 round trip and the literals turned into
 * garbage that rendered to users. Keeping the escapes in one module makes the
 * encoding unambiguous and reviewable.
 *
 *   SEP_DOT  (U+00B7) — discipline/location separator in booking cards
 *   EN_DASH  (U+2013) — time ranges (9:00 AM - 10:00 AM)
 *   EM_DASH  (U+2014) — prose separators
 *   ELLIPSIS (U+2026) — truncated text / loading labels
 *
 * Prefer composing with these (e.g. `${start} ${EN_DASH} ${end}`) over raw chars.
 */

/** U+00B7 — middle dot, token separator. */
export const SEP_DOT = '\u00B7';
/** U+2013 — en dash, used for ranges. */
export const EN_DASH = '\u2013';
/** U+2014 — em dash, used for prose pauses. */
export const EM_DASH = '\u2014';
/** U+2026 — horizontal ellipsis. */
export const ELLIPSIS = '\u2026';
