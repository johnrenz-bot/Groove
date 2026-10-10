export type AchievementSlug =
  | 'coach_profile_complete'
  | 'coach_first_booking'
  | 'coach_first_five_star'
  | 'client_profile_complete'
  | 'client_first_booking'
  | 'client_first_review';

export interface Achievement {
  id: string;
  slug: AchievementSlug;
  role: 'client' | 'coach';
  title: string;
  description: string;
  icon: string; // Lucide icon name
  badge_name: string; // 'Groove Coach' or 'Groove Active'
  badge_description: string | null;
  badge_image_url: string | null;
  task_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number; // 0-100
  completed_at: string | null;
  unlocked_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  achievement?: Achievement; // Joined
}

export interface UserBadgeStatus {
  role: 'client' | 'coach';
  badge_name: string;
  badge_description: string | null;
  tasks_completed: number;
  tasks_total: number;
  unlocked_at: string | null;
  is_unlocked: boolean;
}

/**
 * A single requirement inside a task (e.g. "Profile photo"). `met` reflects the
 * real profile row at read time, so the modal can show a completed/missing
 * checklist instead of a single opaque percentage.
 */
export interface AchievementRequirement {
  key: string;
  label: string;
  met: boolean;
}

export interface AchievementWithProgress extends Achievement {
  progress: number;
  completed_at: string | null;
  unlocked_at: string | null;
  metadata: Record<string, unknown>;
  is_completed: boolean;
  /** Per-requirement breakdown, derived from live profile rows. */
  requirements?: AchievementRequirement[];
}

export interface AchievementTask {
  achievement: AchievementWithProgress;
  is_current_user: boolean;
}

export interface AchievementModalTask {
  title: string;
  description: string;
  completed: boolean;
  progress: number;
  completedAt?: string;
  icon: string;
}

export type BadgeType = 'Groove Coach' | 'Groove Active';