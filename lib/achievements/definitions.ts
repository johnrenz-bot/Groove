/**
 * Static achievement definitions used as fallback when database is unavailable.
 * These match the seed data in the migration.
 */

export interface AchievementDefinition {
  slug: string;
  role: 'client' | 'coach';
  title: string;
  description: string;
  icon: string;
  badge_name: string;
  badge_description: string;
  task_order: number;
}

export const coachAchievementDefinitions: AchievementDefinition[] = [
  {
    slug: 'coach_profile_complete',
    role: 'coach',
    title: 'Complete Your Coach Profile',
    description: 'Add your photo, bio, skills, genres, rates, and payment details',
    icon: 'UserCheck',
    badge_name: 'Groove Coach',
    badge_description: 'Awarded to coaches who complete their profile, secure their first booking, and earn their first 5-star review.',
    task_order: 1,
  },
  {
    slug: 'coach_first_booking',
    role: 'coach',
    title: 'Secure Your First Booking',
    description: 'Get a client to book and confirm a session with you',
    icon: 'CalendarCheck',
    badge_name: 'Groove Coach',
    badge_description: 'Awarded to coaches who complete their profile, secure their first booking, and earn their first 5-star review.',
    task_order: 2,
  },
  {
    slug: 'coach_first_five_star',
    role: 'coach',
    title: 'Earn a 5-Star Review',
    description: 'Receive a 5-star rating from a completed session',
    icon: 'Star',
    badge_name: 'Groove Coach',
    badge_description: 'Awarded to coaches who complete their profile, secure their first booking, and earn their first 5-star review.',
    task_order: 3,
  },
];

export const clientAchievementDefinitions: AchievementDefinition[] = [
  {
    slug: 'client_profile_complete',
    role: 'client',
    title: 'Complete Your Performer Profile',
    description: 'Add your photo, talent, and location details',
    icon: 'UserCheck',
    badge_name: 'Groove Active',
    badge_description: 'Awarded to performers who complete their profile, book their first session, and share their experience.',
    task_order: 1,
  },
  {
    slug: 'client_first_booking',
    role: 'client',
    title: 'Book Your First Session',
    description: 'Book and confirm a session with a coach',
    icon: 'CalendarCheck',
    badge_name: 'Groove Active',
    badge_description: 'Awarded to performers who complete their profile, book their first session, and share their experience.',
    task_order: 2,
  },
  {
    slug: 'client_first_review',
    role: 'client',
    title: 'Leave Your First Review',
    description: 'Share feedback after a completed session',
    icon: 'MessageSquare',
    badge_name: 'Groove Active',
    badge_description: 'Awarded to performers who complete their profile, book their first session, and share their experience.',
    task_order: 3,
  },
];

export function getAchievementDefinitions(role: 'client' | 'coach'): AchievementDefinition[] {
  return role === 'coach' ? coachAchievementDefinitions : clientAchievementDefinitions;
}

export function getBadgeName(role: 'client' | 'coach'): string {
  return role === 'coach' ? 'Groove Coach' : 'Groove Active';
}

export function getBadgeDescription(role: 'client' | 'coach'): string {
  const defs = getAchievementDefinitions(role);
  return defs[0]?.badge_description || '';
}