import {
  Home,
  Sparkles,
  Calendar,
  CalendarDays,
  MessageSquare,
  Info,
} from 'lucide-react';
import type { RoleNav } from '@/components/shared/navTypes';

/**
 * The coach portal's header menu.
 *
 * Structurally parallel to the client portal — same visual system, same
 * dropdown treatment — but with the coach's own destinations: the coach manages
 * a showcase and a student roster rather than browsing coaches.
 *
 * "My Students / Bookings" was the sidebar's label; the header shortens it to
 * "Bookings" because it sits inline and the full phrase pushed the row too
 * wide. The route is untouched.
 *
 * As on the client side there is no "Account" group: Profile, Edit Profile and
 * Account Settings all live in the account menu in the top-right, so repeating
 * them here produced two Profile and two Settings entries pointing at the same
 * coach pages. Only "About Groove", which that menu does not carry, remains in
 * the header row.
 */
export const COACH_NAV: RoleNav = {
  primary: [
    { href: '/coach/home', label: 'Dashboard', icon: Home },
    { href: '/coach/talents', label: 'Showcase', icon: Sparkles },
    { href: '/coach/appointments', label: 'Bookings', icon: Calendar },
    { href: '/coach/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
  ],
  groups: [
    {
      label: 'About',
      icon: Info,
      items: [
        { href: '/dance-events', label: 'Dance Events & News', icon: CalendarDays },
        { href: '/coach/about', label: 'About Groove', icon: Info },
      ],
    },
  ],
};

export const COACH_PORTAL_LABEL = 'Coach Portal';