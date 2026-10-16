import type { LucideIcon } from 'lucide-react';
import { Shield, Sparkles } from 'lucide-react';

/**
 * Role metadata — where each role's portal lives, and what its wordmark says.
 *
 * THIS USED TO LIVE INSIDE `components/shared/AppTopNav.tsx`.
 *
 * It was exported from there because that file was, at the time, the only thing
 * that rendered it. There are now four consumers — the header, the account
 * menu, the mobile drawer and the standalone pages — and importing a 1,100-line
 * component module just to read a lookup table pulled the whole admin chrome
 * into every bundle that needed a role label. Splitting the data out lets the
 * component be deleted without taking the data with it.
 */
export type DashboardRole = 'client' | 'coach' | 'admin';

export const ROLE_META: Record<
  DashboardRole,
  {
    path: string;
    profile: string;
    editProfile: string;
    editProfileLabel: string;
    settings: string;
    label: string;
    icon: LucideIcon;
    homeHref: string;
  }
> = {
  client: {
    path: '/client/home',
    profile: '/client/profile',
    editProfile: '/client/profile/edit',
    editProfileLabel: 'Edit Profile',
    settings: '/client/settings',
    label: 'Client Account',
    icon: Sparkles,
    homeHref: '/client/home',
  },
  coach: {
    path: '/coach/home',
    profile: '/coach/profile',
    editProfile: '/coach/profile/edit',
    editProfileLabel: 'Edit Profile',
    settings: '/coach/settings',
    label: 'Coach Account',
    icon: Sparkles,
    homeHref: '/coach/home',
  },
  admin: {
    path: '/admin/dashboard',
    profile: '/admin/dashboard',
    editProfile: '/admin/users',
    editProfileLabel: 'User Management',
    settings: '/admin/control',
    label: 'Admin Account',
    icon: Shield,
    homeHref: '/admin/dashboard',
  },
};