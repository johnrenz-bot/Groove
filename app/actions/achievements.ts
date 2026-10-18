'use server';

import { createClient } from '@/lib/supabase/server';
import {
  onProfileUpdated,
  onBookingConfirmed,
  onReviewSubmitted,
  checkAndUpdateAchievements,
} from '@/lib/achievements/server';

/**
 * ACHIEVEMENT SERVER ACTIONS — EVERY ONE NOW PROVES WHO IS ASKING.
 *
 * These five actions all took a `userId` argument and did nothing about the
 * caller. That is not a theoretical gap: the achievements RPCs
 * (`update_user_achievement_progress`, `ensure_user_achievements`) are
 * `SECURITY DEFINER` and never look at `auth.uid()`, so RLS does not apply to
 * them either. A signed-in member could therefore grant themselves — or any
 * other account — the "Groove Coach" or "Groove Active" badge in one request,
 * and `updateAchievementsAfterReviewSubmitted` believed a caller-supplied
 * `isFiveStar` boolean, so the five-star task completed without a five-star
 * review existing.
 *
 * The rule applied below: a caller may act on
 *
 *   - their OWN account (self-service actions), or
 *   - somebody else's, but only when they are a party to the record the action
 *     is derived from — the coach in a review, a participant in a booking.
 *
 * `requireActor` returns the session user or `null`; every action refuses when
 * it is null. The cross-user permission check is then the caller's problem to
 * justify, which is what the participants check does.
 */

/** The signed-in user, or null. Never trusts an id from the caller. */
async function requireActor(): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id } : null;
}

function denied(reason: string) {
  return { success: false, error: reason };
}

/**
 * Server action to update achievements after profile update
 *
 * Only ever self-service: the thing that changed is the caller's own profile.
 */
export async function updateAchievementsAfterProfileUpdate(userId: string, role: 'client' | 'coach') {
  const actor = await requireActor();
  if (!actor) return denied('Not signed in.');

  if (actor.id !== userId) {
    return denied('You can only update achievements for your own account.');
  }

  const supabase = await createClient();

  // Verify the user exists and get their role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();

  if (!profile) {
    return denied('User not found');
  }

  if (profile.role !== role) {
    return denied('Role mismatch');
  }

  await onProfileUpdated(userId, role);

  return { success: true };
}

/**
 * Server action to update achievements after booking confirmation
 *
 * Cross-user by design: confirming a booking earns the badge for the other
 * participant. The caller must therefore be one of the two parties on that
 * exact booking — an arbitrary `appointmentId` paired with an arbitrary
 * `userId` is refused.
 */
export async function updateAchievementsAfterBookingConfirmed(
  userId: string,
  role: 'client' | 'coach',
  appointmentId: number
) {
  const actor = await requireActor();
  if (!actor) return denied('Not signed in.');

  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('client_id, coach_id')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) {
    console.error('Achievement: could not read appointment', appointmentId, error);
    return denied('Could not verify that booking.');
  }

  if (!appointment) {
    return denied('Booking not found.');
  }

  if (appointment.client_id !== actor.id && appointment.coach_id !== actor.id) {
    return denied('You are not a participant in that booking.');
  }

  // The badge goes to the OTHER party, never to the caller by fiat.
  if (userId !== appointment.client_id && userId !== appointment.coach_id) {
    return denied('That booking has no such participant.');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();

  if (!profile) {
    return denied('User not found');
  }

  if (profile.role !== role) {
    return denied('Role mismatch');
  }

  await onBookingConfirmed(userId, role, appointmentId);

  return { success: true };
}

/**
 * Server action to update achievements after review submission
 *
 * `isFiveStar` is no longer a caller-supplied boolean. It is read back off the
 * feedback row, so the five-star task can only complete when a five-star review
 * actually exists, and the caller must be one of its two authors.
 */
export async function updateAchievementsAfterReviewSubmitted(
  userId: string,
  role: 'client' | 'coach',
  feedbackId: number
) {
  const actor = await requireActor();
  if (!actor) return denied('Not signed in.');

  const supabase = await createClient();

  const { data: feedback, error } = await supabase
    .from('feedbacks')
    .select('coach_id, user_id, rating')
    .eq('id', feedbackId)
    .maybeSingle();

  if (error) {
    console.error('Achievement: could not read feedback', feedbackId, error);
    return denied('Could not verify that review.');
  }

  if (!feedback) {
    return denied('Review not found.');
  }

  if (feedback.coach_id !== actor.id && feedback.user_id !== actor.id) {
    return denied('You did not write that review.');
  }

  if (userId !== feedback.coach_id && userId !== feedback.user_id) {
    return denied('That review has no such participant.');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();

  if (!profile) {
    return denied('User not found');
  }

  if (profile.role !== role) {
    return denied('Role mismatch');
  }

  await onReviewSubmitted(userId, role, feedbackId, feedback.rating >= 5);

  return { success: true };
}

/**
 * Server action to trigger achievement check for a user
 *
 * Self-service only. Running somebody else's badges was the open door; a bulk
 * sweep belongs in a service-role job, not in a callable endpoint.
 */
export async function triggerAchievementCheck(userId: string) {
  const actor = await requireActor();
  if (!actor) return denied('Not signed in.');

  if (actor.id !== userId) {
    return denied('You can only check achievements for your own account.');
  }

  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();

  if (!profile) {
    return denied('User not found');
  }

  // Achievements only exist for the two member roles.
  if (profile.role !== 'client' && profile.role !== 'coach') {
    return denied('This account has no achievements.');
  }

  await checkAndUpdateAchievements(userId, profile.role);

  return { success: true };
}

/**
 * Server action to refresh achievements from database
 * Recalculates all achievement progress from actual Supabase records
 */
export async function refreshAchievements(userId: string) {
  const actor = await requireActor();
  if (!actor) return denied('Not signed in.');

  if (actor.id !== userId) {
    return denied('You can only refresh achievements for your own account.');
  }

  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();

  if (!profile) {
    return denied('User not found');
  }

  // Ensure user achievements exist
  await supabase.rpc('ensure_user_achievements', { p_user_id: userId });

  // Achievements only exist for the two member roles.
  if (profile.role !== 'client' && profile.role !== 'coach') {
    return denied('This account has no achievements.');
  }

  // Recalculate all achievements from scratch
  await checkAndUpdateAchievements(userId, profile.role);

  return { success: true };
}