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
        { href: '/admin/verifications', label: 'Verification Documents', icon: FileCheck },
        { href: '/admin/users', label: 'Users & Verification', icon: Users },
        { href: '/admin/coaches', label: 'Coaches', icon: Sparkles },
        { href: '/admin/clients', label: 'Clients', icon: User },
      ],
    },
    {
      label: 'Operations',
      icon: Calendar,
      items: [
        { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
        { href: '/admin/inquiries', label: 'Inquiries & Tickets', icon: LifeBuoy },
        { href: '/admin/messages', label: 'Client Messages', icon: MessageSquare },
        { href: '/admin/transactions', label: 'Contracts & Reviews', icon: FileSpreadsheet },
        { href: '/admin/control', label: 'System Control', icon: Sliders },
      ],
    },
    {
      label: 'Platform',
      icon: Settings2,
      items: [
        { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
        { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
        { href: '/admin/theme', label: 'Appearance', icon: Palette },
        { href: '/admin/settings', label: 'System Settings', icon: Settings2 },
      ],
    },
  ],
};

export const ADMIN_PORTAL_LABEL = 'Admin Console';