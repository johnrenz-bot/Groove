import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  CalendarDays,
  Drama,
  FileCheck,
  HelpCircle,
  History,
  Home,
  Info,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageSquare,
  Mic,
  Settings2,
  Sparkles,
  Theater,
  Users,
} from 'lucide-react';

/**
 * THE NAVIGATION MODEL — one array for every role.
 *
 * The previous header split its menu across three files
 * (`components/client/navigation.ts`, `components/coach/navigation.ts`,
 * `components/admin/navigation.ts`) and the header took a `primary` list plus a
 * `groups` list. That shape could not express the brief, where one destination
 * is *the same link* for two roles under two names — "Bookings" for a coach,
 * "Appointments" for a client — and some destinations belong to only one role.
 * So the role moved into the data: every entry carries a `roles` array and may
 * carry per-role overrides, and the header renders whatever survives the filter.
 *
 * ADDING A NAV ITEM
 *   Append one object to `NAV`. Nothing else needs to change.
 *   - `roles` decides who sees it. Omit a role to hide the entry from them.
 *   - `labelByRole` / `descriptionByRole` rename it per role without a second entry.
 *   - A section with `items` renders as a dropdown; a section with only `href`
 *     renders as a plain link. There is no third case to special-case.
 *   - Add `keywords` so the command palette (Cmd/Ctrl+K) can find it by a word
 *     that is not in its visible label.
 *   - Role-specific ROUTES go in `hrefByRole`, not in a duplicated entry — two
 *     entries pointing at one page is exactly the problem this model removes.
 *
 * WHY `roles` INCLUDES 'guest'
 *   Signed-out visitors see Community, About Groove, and the auth buttons. The
 *   brief asks for that explicitly, and modelling it here rather than with a
 *   separate logged-out array means a new public page is one `roles: [...,'guest']`
 *   edit away from appearing in the public header.
 */
export type NavRole = 'coach' | 'client' | 'admin' | 'guest';

/** A destination inside a dropdown — and the unit the command palette lists. */
export interface NavLeaf {
  id: string;
  icon: LucideIcon;
  /** Fallback label, used when `labelByRole` has no entry for the active role. */
  label: string;
  /** Fallback href, used when `hrefByRole` has no entry for the active role. */
  href: string;
  description?: string;
  roles: NavRole[];
  /** Per-role overrides. Absent roles fall back to the base value. */
  labelByRole?: Partial<Record<NavRole, string>>;
  descriptionByRole?: Partial<Record<NavRole, string>>;
  hrefByRole?: Partial<Record<NavRole, string>>;
  /** Extra search terms for the command palette, beyond label + description. */
  keywords?: string[];
}

/**
 * A top-level entry in the bar.
 *
 * `items` present -> a dropdown trigger. `items` absent -> `href` is a direct
 * link. Keeping both on one type (rather than a union) means the command
 * palette and the mobile drawer can walk a single flat shape.
 */
export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: NavRole[];
  items?: NavLeaf[];
  href?: string;
  description?: string;
  /** Small caps heading rendered above the items inside a dropdown panel. */
  heading?: string;
  /**
   * Drop this section on the landing page (`/`).
   *
   * The landing page is a single scrolling document, not a place with
   * sub-destinations to navigate between. Community and About Groove are
   * different ROUTES, and putting a dropdown of them in the header of a
   * one-pager made the marketing page look like the app it is trying to
   * introduce. Marking it here rather than in the header keeps the decision
   * attached to the entry it applies to, so a new section can opt in with one
   * field and nobody has to remember a second list.
   */
  hideOnLanding?: boolean;
}

/**
 * The single source of truth for the header, the drawer, and the palette.
 *
 * Order here is order on screen. The bar has room for three triggers before it
 * starts crowding the account cluster, so anything that does not fit becomes a
 * leaf rather than a fourth trigger.
 */
export const NAV: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    roles: ['client', 'coach'],
    items: [
      {
        id: 'showcase',
        icon: Sparkles,
        label: 'Showcase',
        href: '/client/talent#showcase',
        hrefByRole: { coach: '/coach/talents' },
        description: 'Browse the community showcase',
        descriptionByRole: { coach: 'My public page & student roster' },
        roles: ['client', 'coach'],
        keywords: ['community', 'roster', 'students', 'profile'],
      },
      {
        id: 'directory',
        icon: Users,
        label: 'Directory',
        href: '/users',
        description: 'Find coaches, clients & collaborators',
        roles: ['client', 'coach', 'guest'],
        keywords: ['people', 'members', 'browse'],
      },
      {
        id: 'bookings',
        icon: CalendarDays,
        label: 'Bookings',
        labelByRole: { client: 'Appointments' },
        href: '/client/appointments',
        hrefByRole: { coach: '/coach/appointments' },
        description: 'My bookings & session requests',
        descriptionByRole: { coach: 'Manage incoming booking requests' },
        roles: ['client', 'coach'],
        keywords: ['sessions', 'schedule', 'requests', 'appointments'],
      },
      {
        id: 'messages',
        icon: MessageSquare,
        label: 'Messages',
        href: '/messages',
        description: 'Direct messaging',
        roles: ['client', 'coach'],
        keywords: ['chat', 'dm', 'inbox', 'conversation'],
      },
      {
        id: 'calendar',
        icon: CalendarDays,
        label: 'Calendar',
        href: '/client/calendar',
        hrefByRole: { coach: '/coach/calendar' },
        description: 'My sessions & upcoming bookings',
        descriptionByRole: { coach: 'My availability & schedule' },
        roles: ['client', 'coach'],
        keywords: ['schedule', 'availability', 'agenda'],
      },
      {
        id: 'find-coaches',
        icon: Sparkles,
        label: 'Find Coaches',
        href: '/client/talent#directory',
        description: 'Browse & book a verified coach',
        roles: ['client'],
        keywords: ['hire', 'book', 'teacher', 'trainer'],
      },
      {
        id: 'groovey',
        icon: Bot,
        label: 'Groovey AI',
        href: '/client/groovey',
        description: 'Ask Groovey about anything in the performing arts',
        roles: ['client'],
        keywords: ['assistant', 'ai', 'chat', 'help'],
      },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    icon: Users,
    roles: ['client', 'coach', 'admin', 'guest'],
    heading: 'Performing Arts',
    hideOnLanding: true,
    items: [
      {
        id: 'pa-dance',
        icon: Sparkles,
        label: 'Dance',
        href: '/community/performing-arts/dance',
        description: 'Hip-hop, contemporary & traditional choreography',
        roles: ['client', 'coach', 'admin', 'guest'],
        keywords: ['choreography', 'ballet', 'hiphop', 'contemporary'],
      },
      {
        id: 'pa-singing',
        icon: Mic,
        label: 'Singing',
        href: '/community/performing-arts/singing',
        description: 'Vocal coaching, harmonies & stage presence',
        roles: ['client', 'coach', 'admin', 'guest'],
        keywords: ['vocal', 'voice', 'opera', 'choir'],
      },
      {
        id: 'pa-acting',
        icon: Drama,
        label: 'Acting',
        href: '/community/performing-arts/acting',
        description: 'Method acting, character work & scene study',
        roles: ['client', 'coach', 'admin', 'guest'],
        keywords: ['drama', 'theatre', 'method', 'monologue'],
      },
      {
        id: 'pa-theater',
        icon: Theater,
        label: 'Theater',
        href: '/community/performing-arts/theater',
        description: 'Musical theatre, production & staging',
        roles: ['client', 'coach', 'admin', 'guest'],
        keywords: ['broadway', 'musical', 'stage', 'production'],
      },
      {
        // Kept, not dropped: this is the pre-existing Performing Arts PH hub that
        // both portals linked to. It is a different destination from the four
        // discipline pages above (editorial + organisations, not coaches).
        id: 'pa-hub',
        icon: BookOpen,
        label: 'Performing Arts PH',
        href: '/performing-arts-philippines',
        hrefByRole: {
          client: '/client/performing-arts-philippines',
          coach: '/coach/performing-arts-philippines',
        },
        description: 'Philippine performing-arts organisations & resources',
        roles: ['client', 'coach', 'admin', 'guest'],
        keywords: ['philippines', 'heritage', 'organisations', 'resources'],
      },
      {
        id: 'pa-history',
        icon: History,
        label: 'History & Learning',
        href: '/community/performing-arts/history',
        description: 'Sourced overview of Philippine dance, music & theater',
        roles: ['client', 'coach', 'admin', 'guest'],
        keywords: ['history', 'heritage', 'timeline', 'learning', 'archives', 'sources'],
      },
    ],
  },
  {
    id: 'about',
    label: 'About Groove',
    icon: Info,
    href: '/about',
    description: 'Our story, mission, how it works & contact',
    roles: ['client', 'coach', 'admin', 'guest'],
    hideOnLanding: true,
  },

  /* ── Admin ──────────────────────────────────────────────────────────────
     The console was the one menu that was NOT in this file: it lived in
     `components/admin/navigation.ts` and was rendered by a second, entirely
     separate header component. Two models for one header is what let the two
     drift apart in height, container, and behaviour. The console's thirteen
     destinations are now expressed in the same shape as everyone else's —
     inline where the row can afford it, dropdowns where it cannot — so one
     component can render all four roles.

     Routes and labels are copied verbatim from `ADMIN_NAV`; only the grouping
     expression changed. Nothing about what an operator can reach moved. */
  {
    id: 'console',
    label: 'Overview',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
    description: 'Platform overview and key metrics',
    roles: ['admin'],
    hideOnLanding: true,
  },
  {
    id: 'admin-people',
    label: 'People',
    icon: Users,
    roles: ['admin'],
    heading: 'People',
    hideOnLanding: true,
    items: [
      {
        id: 'admin-verifications',
        icon: FileCheck,
        label: 'Verification Documents',
        href: '/admin/verifications',
        description: 'Review pending coach credentials',
        roles: ['admin'],
      },
      {
        id: 'admin-users',
        icon: Users,
        label: 'Users & Directory',
        href: '/admin/users',
        description: 'Manage accounts and role access',
        roles: ['admin'],
      },
      {
        id: 'admin-coaches',
        icon: Sparkles,
        label: 'Coaches',
        href: '/admin/coaches',
        description: 'Verified coaches and talents',
        roles: ['admin'],
      },
      {
        id: 'admin-clients',
        icon: Users,
        label: 'Clients',
        href: '/admin/clients',
        description: 'Registered performers and students',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'admin-operations',
    label: 'Operations',
    icon: CalendarDays,
    roles: ['admin'],
    heading: 'Operations',
    hideOnLanding: true,
    items: [
      {
        id: 'admin-bookings',
        icon: CalendarDays,
        label: 'Bookings',
        href: '/admin/bookings',
        description: 'Active and past coaching sessions',
        roles: ['admin'],
      },
      {
        id: 'admin-inquiries',
        icon: LifeBuoy,
        label: 'Inquiries & Tickets',
        href: '/admin/inquiries',
        description: 'Support requests and questions',
        roles: ['admin'],
      },
      {
        id: 'admin-messages',
        icon: MessageSquare,
        label: 'Client Messages',
        href: '/admin/messages',
        description: 'Client & coach chat oversight',
        roles: ['admin'],
      },
      {
        id: 'admin-transactions',
        icon: FileCheck,
        label: 'Contracts & Reviews',
        href: '/admin/transactions',
        description: 'Agreements, terms and feedback',
        roles: ['admin'],
      },
      {
        id: 'admin-control',
        icon: Settings2,
        label: 'System Control',
        href: '/admin/control',
        description: 'Emergency toggles and audit logs',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'admin-platform',
    label: 'Platform',
    icon: Settings2,
    roles: ['admin'],
    heading: 'Platform',
    hideOnLanding: true,
    items: [
      {
        id: 'admin-announcements',
        icon: MessageSquare,
        label: 'Announcements',
        href: '/admin/announcements',
        description: 'Publish site-wide broadcasts',
        roles: ['admin'],
      },
      {
        id: 'admin-maintenance',
        icon: Settings2,
        label: 'Maintenance',
        href: '/admin/maintenance',
        description: 'Platform lockout and maintenance status',
        roles: ['admin'],
      },
      {
        id: 'admin-theme',
        icon: Sparkles,
        label: 'Appearance',
        href: '/admin/theme',
        description: 'Themes, palettes and seasonal accents',
        roles: ['admin'],
      },
      {
        id: 'admin-settings',
        icon: Settings2,
        label: 'System Settings',
        href: '/admin/settings',
        description: 'Global parameters and feature flags',
        roles: ['admin'],
      },
    ],
  },
];

/**
 * In-page navigation for the landing page, and ONLY for the landing page.
 *
 * These are anchors into `app/page.tsx`, not routes. With Community and About
 * Groove hidden there, a guest on `/` would otherwise get a header with nothing
 * between the logo and the auth buttons — so these fill the centre with the four
 * sections a visitor actually scrolls to.
 *
 * Every `id` here must exist as a `section id` on the landing page. Nothing
 * validates that at build time, so the list is short on purpose: four anchors
 * that a visitor can predict are better than eight that are half-wrong. The
 * `#studios` target is owned by `components/landing/StudiosPreview.tsx`, which
 * must stay mounted in `LandingSections` for the link to have somewhere to go.
 *
 * Smooth scrolling is free — `globals.css` already sets
 * `html { scroll-behavior: smooth }` — so a plain `<a href="#id">` is all that
 * is needed. No scroll library, no JS.
 */
export const LANDING_ANCHORS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'disciplines', label: 'Disciplines', icon: Sparkles },
  { id: 'studios', label: 'Studios', icon: MapPin },
  { id: 'coaches', label: 'Coaches', icon: Users },
  { id: 'how', label: 'How It Works', icon: HelpCircle },
];

/** Per-role override with a fallback to the base value. */
export function roleValue<T>(
  base: T | undefined,
  byRole: Partial<Record<NavRole, T>> | undefined,
  role: NavRole
): T | undefined {
  return byRole?.[role] ?? base;
}

export function labelFor(item: NavLeaf, role: NavRole): string {
  return roleValue(item.label, item.labelByRole, role) ?? item.label;
}

export function descriptionFor(item: NavLeaf, role: NavRole): string | undefined {
  return roleValue(item.description, item.descriptionByRole, role);
}

export function hrefFor(item: NavLeaf, role: NavRole): string {
  return roleValue(item.href, item.hrefByRole, role) ?? item.href;
}

/**
 * The bar, the drawer and the palette all render from this.
 *
 * `hideOnLanding` filters out the entries marked for the landing page. Because
 * this is the ONE filter every consumer shares, the desktop bar, the mobile
 * drawer and the command palette all lose Community and About Groove on `/`
 * together — there is no second call site where the drawer could forget.
 */
export function sectionsForRole(
  role: NavRole,
  options: { hideOnLanding?: boolean } = {}
): NavSection[] {
  const { hideOnLanding = false } = options;
  return NAV.map((section) => {
    if (!section.roles.includes(role)) return null;
    if (hideOnLanding && section.hideOnLanding) return null;
    if (!section.items) return section;
    const items = section.items.filter((leaf) => leaf.roles.includes(role));
    // A section left with nothing in it is dropped rather than rendered as an
    // empty dropdown. This is what makes `roles` safe to edit casually.
    if (items.length === 0) return null;
    return { ...section, items };
  }).filter((section): section is NavSection => section !== null);
}

/** One flat list of every destination — the command palette's index. */
export function leavesForRole(
  role: NavRole,
  options: { hideOnLanding?: boolean } = {}
): Array<{ leaf: NavLeaf; section: NavSection }> {
  return sectionsForRole(role, options).flatMap((section) =>
    (section.items ?? []).map((leaf) => ({ leaf, section }))
  );
}

/** A section is a direct link when it has no items to show. */
export function isDropdown(section: NavSection): boolean {
  return Array.isArray(section.items) && section.items.length > 0;
}
