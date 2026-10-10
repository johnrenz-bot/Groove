import type { SupabaseClient } from '@supabase/supabase-js';
import type { AchievementRequirement, AchievementWithProgress } from './types';

/**
 * Task requirement evaluation — the single source of truth for what makes a
 * task "complete".
 *
 * This module is pure (no server-only imports) so the exact same rules run on
 * the server (persistence) and in the browser (display), which prevents the two
 * from drifting apart. It reads real profile rows only; it never stores profile
 * values inside the achievement records.
 */

/**
 * Placeholder sentinels that the database (or older data) uses in place of a
 * real value. `client_profiles.talent` ships with a `DEFAULT 'N/A'`, so without
 * this a brand-new client would be credited as having chosen an interest.
 */
const PLACEHOLDER_VALUES = new Set(['n/a', 'na', 'none', 'null', '-', '—']);

/** True only when a value is genuinely present (not null/empty/placeholder/zero). */
export function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && !PLACEHOLDER_VALUES.has(trimmed.toLowerCase());
  }
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  return true;
}

export interface ProfileRowSet {
  /** Row from `profiles` (public read). */
  profile: Record<string, unknown> | null;
  /** Row from `client_profiles` or `coach_profiles`. */
  roleProfile: Record<string, unknown> | null;
}

/**
 * Loads the two profile rows the profile-completion task depends on. Both
 * tables have public SELECT policies, so this works from the browser and the
 * server alike. Only the columns used by the checklist are requested.
 */
export async function loadProfileRowSet(
  supabase: SupabaseClient,
  userId: string,
  role: 'client' | 'coach'
): Promise<ProfileRowSet> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('photo_url, bio, city_name, region_name, barangay_name')
    .eq('id', userId)
    .maybeSingle();

  const roleProfile =
    role === 'coach'
      ? (
          await supabase
            .from('coach_profiles')
            .select('talents, genres, service_fee, duration, payment_type')
            .eq('id', userId)
            .maybeSingle()
        ).data
      : (
          await supabase
            .from('client_profiles')
            .select('talent')
            .eq('id', userId)
            .maybeSingle()
        ).data;

  return {
    profile: (profile as Record<string, unknown> | null) ?? null,
    roleProfile: (roleProfile as Record<string, unknown> | null) ?? null,
  };
}

/**
 * Requirements for the role's profile-completion task (task 1).
 *
 * Client: photo + primary performing interest + location. Clients cannot enter
 * a bio anywhere in the product, so bio is deliberately NOT a requirement.
 *
 * Coach: photo + bio + the details the coach form actually requires (skill,
 * genres, standard rate) plus the two columns that always carry a real value
 * (session duration, payment mode).
 */
export function profileTaskRequirements(
  role: 'client' | 'coach',
  rows: ProfileRowSet
): AchievementRequirement[] {
  const profile = rows.profile ?? {};
  const roleProfile = rows.roleProfile ?? {};

  if (role === 'client') {
    return [
      { key: 'photo', label: 'Profile photo', met: isFilled(profile.photo_url) },
      { key: 'talent', label: 'Primary performing interest', met: isFilled(roleProfile.talent) },
      {
        key: 'location',
        label: 'Location details',
        met:
          isFilled(profile.city_name) &&
          isFilled(profile.region_name) &&
          isFilled(profile.barangay_name),
      },
    ];
  }

  return [
    { key: 'photo', label: 'Profile photo', met: isFilled(profile.photo_url) },
    { key: 'bio', label: 'Coaching bio', met: isFilled(profile.bio) },
    { key: 'talents', label: 'Performing arts skill', met: isFilled(roleProfile.talents) },
    { key: 'genres', label: 'At least one genre selected', met: isFilled(roleProfile.genres) },
    { key: 'rates', label: 'Standard rate set', met: isFilled(roleProfile.service_fee) },
    { key: 'duration', label: 'Session duration set', met: isFilled(roleProfile.duration) },
    { key: 'payment', label: 'Payment mode set', met: isFilled(roleProfile.payment_type) },
  ];
}

/** Human-readable requirement for the binary (booking / review) tasks. */
const BINARY_REQUIREMENT_LABELS: Record<string, string> = {
  client_first_booking: 'Confirmed booking',
  coach_first_booking: 'Confirmed booking',
  client_first_review: 'Review submitted',
  coach_first_five_star: 'A 5-star review received',
};

/**
 * Returns the requirements for a task. Profile tasks are evaluated live against
 * the profile rows; booking/review tasks are binary on the stored completion.
 * Once a task is completed, its requirements are reported as met so the earned
 * state and the checklist cannot contradict each other (badges are permanent).
 */
export function taskRequirements(
  task: AchievementWithProgress,
  role: 'client' | 'coach',
  rows: ProfileRowSet
): AchievementRequirement[] {
  const isProfileTask =
    task.slug === 'client_profile_complete' || task.slug === 'coach_profile_complete';

  const requirements = isProfileTask
    ? profileTaskRequirements(role, rows)
    : [
        {
          key: 'task',
          label: BINARY_REQUIREMENT_LABELS[task.slug] ?? task.title,
          met: task.is_completed,
        },
      ];

  return task.is_completed ? requirements.map((r) => ({ ...r, met: true })) : requirements;
}

/**
 * Computes the live progress percentage for a set of requirements.
 * 0 when nothing is met, 100 when everything is met.
 */
export function progressForRequirements(requirements: AchievementRequirement[]): number {
  if (requirements.length === 0) return 0;
  const met = requirements.filter((r) => r.met).length;
  return Math.round((met / requirements.length) * 100);
}

/**
 * Attaches live requirement checklists + progress to a list of tasks.
 * Does not mutate the input.
 */
export function applyRequirements(
  tasks: AchievementWithProgress[],
  role: 'client' | 'coach',
  rows: ProfileRowSet
): AchievementWithProgress[] {
  return tasks.map((task) => {
    const requirements = taskRequirements(task, role, rows);
    const progress = progressForRequirements(requirements);
    return {
      ...task,
      // Recognise an already-complete profile immediately, even before the
      // server action has persisted the completion timestamp.
      is_completed: task.is_completed || progress === 100,
      progress,
      requirements,
    };
  });
}
