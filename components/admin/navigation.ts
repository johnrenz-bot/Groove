import {
  LayoutDashboard,
  Users,
  User,
  Sparkles,
  Calendar,
  LifeBuoy,
  MessageSquare,
  FileSpreadsheet,
  Sliders,
  Megaphone,
  Wrench,
  Palette,
  Settings2,
  FileCheck,
} from 'lucide-react';
import type { RoleNav } from '@/components/shared/navTypes';

/**
 * The admin console's header menu.
 *
 * Thirteen destinations, which is exactly why the console is the case the header
 * had to solve for: only "Overview" can afford to be an inline link, and the
 * rest fall into three dropdowns that mirror how an operator thinks about the
 * job — who the people are, what the operations are, what the platform is.
 *
 * "Verification Documents" leads the People group on purpose. It is the only
 * destination in the console that represents unfinished work an operator is
 * expected to clear, so it should not be buried under general account
 * management.
 *
 * This is the same grouping the sidebar used, with the same labels and the same
 * routes. Only the presentation changed.
 */
export const ADMIN_NAV: RoleNav = {
  primary: [{ href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard }],
  groups: [
    {
      label: 'People',
      icon: Users,
      items: [
        { href: '/admin/verifications', label: 'Verification Documents', icon: FileCheck, description: 'Review pending coach credentials' },
        { href: '/admin/users', label: 'Users & Directory', icon: Users, description: 'Manage accounts and role access' },
        { href: '/admin/coaches', label: 'Coaches', icon: Sparkles, description: 'Verified coaches and talents' },
        { href: '/admin/clients', label: 'Clients', icon: User, description: 'Registered performers and students' },
      ],
    },
    {
      label: 'Operations',
      icon: Calendar,
      items: [
        { href: '/admin/bookings', label: 'Bookings', icon: Calendar, description: 'Active and past coaching sessions' },
        { href: '/admin/inquiries', label: 'Inquiries & Tickets', icon: LifeBuoy, description: 'Support requests and questions' },
        { href: '/admin/messages', label: 'Client Messages', icon: MessageSquare, description: 'Client & coach chat oversight' },
        { href: '/admin/transactions', label: 'Contracts & Reviews', icon: FileSpreadsheet, description: 'Agreements, terms and feedback' },
        { href: '/admin/control', label: 'System Control', icon: Sliders, description: 'Emergency toggles and audit logs' },
      ],
    },
    {
      label: 'Platform',
      icon: Settings2,
      items: [
        { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, description: 'Publish site-wide broadcasts' },
        { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench, description: 'Platform lockout and maintenance status' },
        { href: '/admin/theme', label: 'Appearance', icon: Palette, description: 'Themes, palettes and seasonal accents' },
        { href: '/admin/settings', label: 'System Settings', icon: Settings2, description: 'Global parameters and feature flags' },
      ],
    },
  ],
};

export const ADMIN_PORTAL_LABEL = 'Admin Console';