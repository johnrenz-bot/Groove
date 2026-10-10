import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Achievement, UserAchievement, UserBadgeStatus, AchievementWithProgress } from './types';
import {
  applyRequirements,
  loadProfileRowSet,
  profileTaskRequirements,
  progressForRequirements,
} from './requirements';

/**
 * Server-side achievement service.
 * All validation happens here to prevent client-side tampering.
 */

export async function getAchievementsForRole(role: 'client' | 'coach'): Promise<Achievement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('task_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch achievements: ${error.message}`);
  return (data as Achievement[]) || [];
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch user achievements: ${error.message}`);
  return (data as UserAchievement[]) || [];
}

export async function getUserAchievementsWithProgress(
  userId: string,
  role: 'client' | 'coach'
): Promise<AchievementWithProgress[]> {
  const supabase = await createClient();

  // Get all achievements for the role
  const { data: achievements, error: achError } = await supabase
    .from('achievements')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('task_order', { ascending: true });

  if (achError) throw new Error(`Failed to fetch achievements: ${achError.message}`);

  // Get user's progress
  const { data: userAchievements, error: uaError } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  if (uaError) throw new Error(`Failed to fetch user achievements: ${uaError.message}`);

  const progressMap = new Map(
    (userAchievements || []).map(ua => [ua.achievement_id, ua])
  );

  const tasks: AchievementWithProgress[] = (achievements || []).map(ach => {
    const ua = progressMap.get(ach.id);
    return {
      ...ach,
      progress: ua?.progress ?? 0,
      completed_at: ua?.completed_at ?? null,
      unlocked_at: ua?.unlocked_at ?? null,
      metadata: ua?.metadata ?? {},
      is_completed: !!ua?.completed_at,
    };
  });

  // Attach live per-requirement checklists so the modal can show what is
  // complete and what is still missing (profile rows are publicly readable).
  const rows = await loadProfileRowSet(supabase, userId, role);
  return applyRequirements(tasks, role, rows);
}

export async function getUserBadgeStatus(userId: string): Promise<UserBadgeStatus | null> {
  const supabase = await createClient();

  // Use the database function
  const { data, error } = await supabase.rpc('get_user_badge_status', { p_user_id: userId });

  if (error) throw new Error(`Failed to fetch badge status: ${error.message}`);
  if (!data || data.length === 0) return null;

  return data[0] as UserBadgeStatus;
}

/**
 * Check and update achievement progress based on real application data.
 * This should be called after relevant user actions (profile update, booking, review).
 */
export async function checkAndUpdateAchievements(
  userId: string,
  role: 'client' | 'coach'
): Promise<void> {
  const supabase = await createClient();

  // Ensure user achievements exist
  await supabase.rpc('ensure_user_achievements', { p_user_id: userId });

  await checkRoleAchievements(supabase, userId, role);
}

/**
 * Recomputes a role's achievements from real application data.
 *
 * The profile task is evaluated with the shared requirement rules
 * (`./requirements`) so what gets persisted and what the modal displays can
 * never disagree. Booking and review tasks are binary facts from the
 * appointments/feedbacks tables.
 */
async function checkRoleAchievements(
  supabase: SupabaseClient,
  userId: string,
  role: 'client' | 'coach'
): Promise<void> {
  // 1. Profile completion — evaluated per requirement.
  const rows = await loadProfileRowSet(supabase, userId, role);
  const requirements = profileTaskRequirements(role, rows);
  const progress = progressForRequirements(requirements);
  const profileSlug = role === 'coach' ? 'coach_profile_complete' : 'client_profile_complete';

  if (progress > 0) {
    await supabase.rpc('update_user_achievement_progress', {
      p_user_id: userId,
      p_achievement_slug: profileSlug,
      p_progress: progress,
    });
  }

  // 2. First confirmed booking (client books, coach receives).
  const { data: confirmedBooking } = await supabase
    .from('appointments')
    .select('id')
    .eq(role === 'coach' ? 'coach_id' : 'client_id', userId)
    .in('status', ['confirmed', 'completed'])
    .limit(1)
    .maybeSingle();

  if (confirmedBooking) {
    await supabase.rpc('update_user_achievement_progress', {
      p_user_id: userId,
      p_achievement_slug: role === 'coach' ? 'coach_first_booking' : 'client_first_booking',
      p_progress: 100,
      p_metadata: { appointment_id: confirmedBooking.id },
    });
  }

  // 3. Review-based task.
  if (role === 'coach') {
    const { data: fiveStarReview } = await supabase
      .from('feedbacks')
      .select('id, rating')
      .eq('coach_id', userId)
      .eq('rating', 5)
      .limit(1)
      .maybeSingle();

    if (fiveStarReview) {
      await supabase.rpc('update_user_achievement_progress', {
        p_user_id: userId,
        p_achievement_slug: 'coach_first_five_star',
        p_progress: 100,
        p_metadata: { feedback_id: fiveStarReview.id },
      });
    }
  } else {
    const { data: firstReview } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (firstReview) {
      await supabase.rpc('update_user_achievement_progress', {
        p_user_id: userId,
        p_achievement_slug: 'client_first_review',
        p_progress: 100,
        p_metadata: { feedback_id: firstReview.id },
      });
    }
  }
}

/**
 * Call this after specific events to update achievements in real-time
 */
export async function onProfileUpdated(userId: string, role: 'client' | 'coach'): Promise<void> {
  await checkAndUpdateAchievements(userId, role);
}

export async function onBookingConfirmed(userId: string, role: 'client' | 'coach', appointmentId: number): Promise<void> {
  const supabase = await createClient();
  const slug = role === 'coach' ? 'coach_first_booking' : 'client_first_booking';

  await supabase.rpc('update_user_achievement_progress', {
    p_user_id: userId,
    p_achievement_slug: slug,
    p_progress: 100,
    p_metadata: { appointment_id: appointmentId },
  });

  // Also check other achievements
  await checkAndUpdateAchievements(userId, role);
}

export async function onReviewSubmitted(
  userId: string,
  role: 'client' | 'coach',
  feedbackId: number,
  isFiveStar: boolean = false
): Promise<void> {
  const supabase = await createClient();

  if (role === 'coach' && isFiveStar) {
    await supabase.rpc('update_user_achievement_progress', {
      p_user_id: userId,
      p_achievement_slug: 'coach_first_five_star',
      p_progress: 100,
      p_metadata: { feedback_id: feedbackId },
    });
  } else if (role === 'client') {
    await supabase.rpc('update_user_achievement_progress', {
      p_user_id: userId,
      p_achievement_slug: 'client_first_review',
      p_progress: 100,
      p_metadata: { feedback_id: feedbackId },
    });
  }

  await checkAndUpdateAchievements(userId, role);
}