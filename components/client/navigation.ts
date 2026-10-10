import {
  Home,
  Sparkles,
  Calendar,
  CalendarDays,
  MessageSquare,
  Info,
  Users,
  Bot,
} from 'lucide-react';
import type { RoleNav } from '@/components/shared/navTypes';

/**
 * The client portal's header menu.
 *
 * The daily destinations (dashboard, finding a coach, bookings, calendar,
 * messages) are inline links.
 *
 * There is deliberately NO "Account" group here. Profile, Edit Profile and
 * Account Settings are already served by the account menu in the top-right —
 * the same panel that carries the identity, the appearance chooser and sign out
 * — so a second Account dropdown beside it showed the user two different
 * Profile and Settings entries pointing at the same pages. Only "About Groove",
 * which the account menu does not carry, stays in the header row, under its own
 * trigger.
 *
 * Every route here is unchanged from the sidebar this replaced — only the
 * arrangement differs.
 */
export const CLIENT_NAV: RoleNav = {
  primary: [
    { href: '/client/home', label: 'Dashboard', icon: Home },
    { href: '/client/talent', label: 'Find Coaches', icon: Sparkles },
    { href: '/client/groovey', label: 'Groovey AI', icon: Bot },
    { href: '/client/appointments', label: 'Appointments', icon: Calendar },
    { href: '/client/calendar', label: 'Calendar', icon: CalendarDays },
  ],
  groups: [
    {
      label: 'Community',
      icon: Users,
      items: [
        { href: '/users', label: 'Directory', icon: Users, description: 'Connect with artists, coaches & peers' },
        { href: '/messages', label: 'Messages', icon: MessageSquare, description: 'Direct messaging and active chats' },
      ],
    },
    {
      label: 'About',
      icon: Info,
      items: [
        { href: '/client/about', label: 'About Groove', icon: Info, description: 'Platform mission, vision and guides' },
      ],
    },
  ],
};

export const CLIENT_PORTAL_LABEL = 'Client Portal';