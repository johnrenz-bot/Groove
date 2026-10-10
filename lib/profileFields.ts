'use client';

/**
 * The field-shape contract, in ONE place.
 *
 * Both `RegistrationFormFields` (sign-up) and the Profile/Settings edit forms
 * read their field names, types and option lists from this module. That is what
 * makes Profile a true extension of Registration instead of a re-implementation:
 * add a field here and it appears in both, with the same name and the same
 * validation, rather than drifting into two versions.
 *
 * The DB column names here are the `profiles` / `coach_profiles` /
 * `client_profiles` columns defined in supabase/schema.sql. Nothing here
 * renames a field.
 */

import { DEFAULT_SKILLS_AND_GENRES, getAvailableSkills } from '@/lib/config/skillsConfig';

/* ------------------------------------------------------------------ */
/* Option lists — identical to the registration forms                 */
/* ------------------------------------------------------------------ */

/** `client_profiles.talent` options, from /register/client. */
export const CLIENT_TALENT_OPTIONS = [
  'Dance',
  'Singing',
  'Acting',
  'Theater',
  'Musical Instruments',
] as const;

/** `coach_profiles.talents` — the single-select skill, from /register/coach. */
export const COACH_SKILL_OPTIONS = getAvailableSkills();

/** `coach_profiles.duration` options, from coach registration step 3. */
export const COACH_DURATION_OPTIONS = ['1 hour', '1.5 hours', '2 hours', '3 hours'] as const;

/** `coach_profiles.payment_type`, from coach registration step 3. */
export const COACH_PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash on Session' },
  { value: 'online', label: 'Online Payment (GCash / Maya)' },
] as const;

/** Month names, from RegistrationFormFields. */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Birth-year options: the registration form's own 80-year window, min age 13. */
export const MAX_BIRTH_YEAR = new Date().getFullYear() - 13;
export const BIRTH_YEARS = Array.from({ length: 80 }, (_, i) => MAX_BIRTH_YEAR - i);

/* ------------------------------------------------------------------ */
/* Validation rules — shared verbatim with RegistrationFormFields      */
/* ------------------------------------------------------------------ */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/** 10 digits starting with 9 — the Philippine mobile rule from registration. */
export function isValidMobile(value: string): boolean {
  const clean = value.replace(/\D/g, '');
  return clean.length === 10 && clean.startsWith('9');
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidUsername(value: string): boolean {
  const v = value.trim();
  return v.length >= 3 && USERNAME_RE.test(v);
}

/** Number of days in a month, for the birth-day select. */
export function getDaysInMonth(year: string, month: string): number[] {
  const y = parseInt(year) || 2000;
  const m = parseInt(month) || 1;
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => i + 1);
}

/* ------------------------------------------------------------------ */
/* Shared error messages                                              */
/* ------------------------------------------------------------------ */

export const VALIDATION_MESSAGES = {
  firstnameRequired: 'Please provide your full name.',
  birthRequired: 'Please select your complete date of birth.',
  barangayRequired: 'Please select your Barangay in San Jose del Monte.',
  streetRequired: 'Please enter your Street / House Number.',
  mobile: 'Mobile number must be 10 digits starting with 9 (e.g. 9171234567).',
  email: 'Please enter a valid email address.',
  usernameShort: 'Username must be at least 3 characters.',
  usernameChars: 'Username can only contain letters, numbers, underscores, and periods.',
  usernameTaken: 'That username is already taken.',
  passwordShort: 'Password must be at least 8 characters long.',
  passwordMismatch: 'Password and confirmation do not match.',
  bioRequired: 'Please provide a brief bio (minimum 10 characters) about your coaching experience.',
  rateInvalid: 'Please set a valid standard rate.',
  paymentHandleRequired: 'Please provide your GCash or Maya mobile number for online payments.',
  suffixTooLong: 'Suffix must be 50 characters or less.',
} as const;

/* ------------------------------------------------------------------ */
/* Row helpers — the summary view reads the same labels as the form    */
/* ------------------------------------------------------------------ */

export interface ProfileFieldRow {
  label: string;
  value: React.ReactNode;
  /** Verification-style fields are shown read-only regardless of edit mode. */
  readOnly?: boolean;
}

/** Formats the stored `profiles.birthdate` back into y/m/d for the form. */
export function splitBirthdate(birthdate?: string | null): {
  year: string;
  month: string;
  day: string;
} {
  if (!birthdate) return { year: '', month: '', day: '' };
  const parts = birthdate.split('-');
  if (parts.length < 3) return { year: '', month: '', day: '' };
  return {
    year: parts[0] ?? '',
    month: String(parseInt(parts[1] ?? '0', 10) || ''),
    day: String(parseInt(parts[2] ?? '0', 10) || ''),
  };
}

/** Rebuilds `profiles.birthdate` from the three selects, exactly as registration. */
export function joinBirthdate(year: string, month: string, day: string): string | null {
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Formats a stored `+63...` contact for the 10-digit local input. */
export function normalizeContactForInput(contact?: string | null): string {
  if (!contact) return '';
  const digits = contact.replace(/\D/g, '');
  if (digits.startsWith('63')) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/** Rebuilds the `+63...` contact exactly as registration does. */
export function normalizeContactForStorage(contact: string): string {
  const clean = contact.replace(/\D/g, '');
  const normalized = clean.startsWith('0')
    ? clean.slice(1)
    : clean.startsWith('63')
      ? clean.slice(2)
      : clean;
  return `+63${normalized}`;
}

/**
 * Coach genres are stored as a JSON string shaped `{ skill, genres: [] }` by
 * registration, but older rows are plain comma-separated text. Profile must be
 * able to read both without changing what it writes back.
 */
export function parseCoachGenresValue(raw?: string | null): { skill: string; genres: string[] } {
  if (!raw || !raw.trim()) return { skill: '', genres: [] };
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const genres = Array.isArray(parsed.genres) ? parsed.genres.filter(Boolean) : [];
      return { skill: typeof parsed.skill === 'string' ? parsed.skill : '', genres };
    } catch {
      // fall through to the legacy path
    }
  }
  return { skill: '', genres: trimmed.split(',').map((g) => g.trim()).filter(Boolean) };
}

export { DEFAULT_SKILLS_AND_GENRES, getAvailableSkills };