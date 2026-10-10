'use client';

import { createClient } from '@/lib/supabase/client';
import { AchievementWithProgress, UserBadgeStatus } from './types';
import { applyRequirements, loadProfileRowSet } from './requirements';

/**
 * Client-side achievement service for reading data.
 * Mutations go through server actions.
 */

export async function getUserAchievementsWithProgress(
  userId: string,
  role: 'client' | 'coach'
): Promise<AchievementWithProgress[]> {
  const supabase = createClient();

  const { data: achievements, error: achError } = await supabase
    .from('achievements')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('task_order', { ascending: true });

  if (achError) throw new Error(`Failed to fetch achievements: ${achError.message}`);

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

  // Attach live per-requirement checklists (profile rows are publicly readable).
  const rows = await loadProfileRowSet(supabase, userId, role);
  return applyRequirements(tasks, role, rows);
}

export async function getUserBadgeStatus(userId: string): Promise<UserBadgeStatus | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_user_badge_status', { p_user_id: userId });

  if (error) throw new Error(`Failed to fetch badge status: ${error.message}`);
  if (!data || data.length === 0) return null;

  return data[0] as UserBadgeStatus;
}