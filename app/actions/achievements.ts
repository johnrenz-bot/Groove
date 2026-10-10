'use server';

import { createClient } from '@/lib/supabase/server';
import { onProfileUpdated, onBookingConfirmed, onReviewSubmitted, checkAndUpdateAchievements } from '@/lib/achievements/server';

/**
 * Server action to update achievements after profile update
 */
export async function updateAchievementsAfterProfileUpdate(userId: string, role: 'client' | 'coach') {
  const supabase = await createClient();

  // Verify the user exists and get their role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();

  if (!profile) {
    return { success: false, error: 'User not found' };
  }

  if (profile.role !== role) {
    return { success: false, error: 'Role mismatch' };
  }

  await onProfileUpdated(userId, role);

  return { success: true };
}

/**
 * Server action to update achievements after booking confirmation
 */
export async function updateAchievementsAfterBookingConfirmed(
  userId: string,
  role: 'client' | 'coach',
  appointmentId: number
) {
  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();

  if (!profile) {
    return { success: false, error: 'User not found' };
  }

  if (profile.role !== role) {
    return { success: false, error: 'Role mismatch' };
  }

  await onBookingConfirmed(userId, role, appointmentId);

  return { success: true };
}

/**
 * Server action to update achievements after review submission
 */
export async function updateAchievementsAfterReviewSubmitted(
  userId: string,
  role: 'client' | 'coach',
  feedbackId: number,
  isFiveStar: boolean = false
) {
  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();

  if (!profile) {
    return { success: false, error: 'User not found' };
  }

  if (profile.role !== role) {
    return { success: false, error: 'Role mismatch' };
  }

  await onReviewSubmitted(userId, role, feedbackId, isFiveStar);

  return { success: true };
}

/**
 * Server action to trigger achievement check for a user
 * Can be called from cron jobs or admin panel
 */
export async function triggerAchievementCheck(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();

  if (!profile) {
    return { success: false, error: 'User not found' };
  }

  await checkAndUpdateAchievements(userId, profile.role);

  return { success: true };
}

/**
 * Server action to refresh achievements from database
 * Recalculates all achievement progress from actual Supabase records
 */
export async function refreshAchievements(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();

  if (!profile) {
    return { success: false, error: 'User not found' };
  }

  // Ensure user achievements exist
  await supabase.rpc('ensure_user_achievements', { p_user_id: userId });

  // Recalculate all achievements from scratch
  await checkAndUpdateAchievements(userId, profile.role);

  return { success: true };
}