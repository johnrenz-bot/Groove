import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  CalendarDays,
  CreditCard,
  Drama,
  FileCheck,
  HelpCircle,
  History,
  Home,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Mic,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Theater,
  User,
  Users,
} from 'lucide-react';

import {
  LANDING_ANCHORS,
  NAV,
  descriptionFor,
  hrefFor,
  labelFor,
  type NavLeaf,
  type NavRole,
  type NavSection,
} from './navConfig';
import { ROLE_META } from './roleMeta';

/**
 * THE ROLE CONFIGURATION LAYER.
 *
 * `<AppHeader>` never asks "is this a coach?" or "is this an admin?". It looks
 * up one of the objects exported at the bottom of this file and renders exactly
 * what that object contains. Every behavioural difference between the three
 * portals therefore lives here, as data, and adding a role is one entry in
 * `HEADER_CONFIGS` rather than another branch in the component.
 *
 * The destination data is still sourced from `navConfig.ts`. That file is the
 * single authority on which routes exist and which role may see them, so this
 * layer groups and labels those destinations rather than maintaining a second
 * copy of the route table.
 */

export type HeaderRole = NavRole;

export interface HeaderNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Direct destination. Mutually exclusive with `dropdown`. */
  href?: string;
  /** Key into `AppHeaderConfig.dropdownItems`. */
  dropdown?: string;
  /** Path prefixes that make this item current. */
  match: string[];
  /** Path prefixes that must never make this item current. */
  exclude?: string[];
}

export interface HeaderDropdownItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon: LucideIcon;
  /** Optional heading rendered above a run of items. */
  group?: string;
  keywords?: string[];
}

export interface HeaderAvatarItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  /** Only `signout` exists today; the field keeps the menu data-driven. */
  action?: 'signout';
  keywords?: string[];
}

export interface HeaderQuickLink {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon: LucideIcon;
  group?: string;
  keywords?: string[];
}

export interface AppHeaderConfig {
  role: HeaderRole;
  /** Label shown in role badges and the mobile identity card. */
  roleLabel: string;
  homeHref: string;
  navItems: HeaderNavItem[];
  dropdownItems: Record<string, HeaderDropdownItem[]>;
  avatarMenuItems: HeaderAvatarItem[];
  quickLinks: HeaderQuickLink[];
}

function section(id: string): NavSection | undefined {
  return NAV.find((entry) => entry.id === id);
}

function leafItem(leaf: NavLeaf, role: HeaderRole, group?: string): HeaderDropdownItem {
  return {
    id: leaf.id,
    label: labelFor(leaf, role),
    href: hrefFor(leaf, role),
    description: descriptionFor(leaf, role),
    icon: leaf.icon,
    group,
    keywords: leaf.keywords,
  };
}

function sectionItems(id: string, role: HeaderRole): HeaderDropdownItem[] {
  const entry = section(id);
  if (!entry) return [];
  if (!entry.items) {
    return entry.href
      ? [
          {
            id: entry.id,
            label: entry.label,
            href: entry.href,
            description: entry.description,
            icon: entry.icon,
            group: entry.heading,
          },
        ]
      : [];
  }
  return entry.items
    .filter((leaf) => leaf.roles.includes(role))
    .map((leaf) => leafItem(leaf, role, entry.heading));
}

function dashboardItems(role: HeaderRole): HeaderDropdownItem[] {
  if (role === 'guest') return [];

  if (role === 'admin') {
    // The console used to be four top-level triggers. It is one Dashboard menu
    // now — the same three-pill bar as the member portals — but every existing
    // admin route is still here, grouped by the section it came from.
    return ['console', 'admin-people', 'admin-operations', 'admin-platform'].flatMap((id) => {
      const entry = section(id);
      if (!entry) return [];
      const group = entry.heading ?? entry.label;
      if (entry.href) {
        return [
          {
            id: entry.id,
            label: entry.label,
            href: entry.href,
            description: entry.description,
            icon: entry.icon,
            group,
          },
        ];
      }
      return (entry.items ?? [])
        .filter((leaf) => leaf.roles.includes(role))
        .map((leaf) => leafItem(leaf, role, group));
    });
  }

  const meta = ROLE_META[role];
  const home: HeaderDropdownItem = {
    id: `${role}-home`,
    label: 'Home',
    href: meta.homeHref,
    description: 'Your portal overview',
    icon: Home,
    group: 'Dashboard',
  };

  return [home, ...sectionItems('dashboard', role)];
}

function communityItems(role: HeaderRole): HeaderDropdownItem[] {
  return sectionItems('community', role);
}

function aboutItems(role: HeaderRole): HeaderDropdownItem[] {
  const about: HeaderDropdownItem = {
    id: 'about',
    label: 'About Groove',
    href: '/about',
    description: 'The platform, its purpose and how it works',
    icon: Info,
    keywords: ['platform', 'mission', 'how it works', 'contact'],
  };

  // The academic record is a second public page, but only the member portals
  // get a nav entry for it. Guests and admins keep the direct About Groove link
  // they already had; the shared Footer is their route to the capstone page.
  if (role !== 'client' && role !== 'coach') return [about];

  return [
    about,
    {
      id: 'about-project',
      label: 'Capstone Project',
      href: '/about-project',
      description: 'The academic background, objectives and project team',
      icon: BookOpen,
      keywords: ['about', 'capstone', 'academic', 'sti', 'project'],
    },
  ];
}

function avatarItems(role: HeaderRole): HeaderAvatarItem[] {
  const common = (id: string, label: string, href: string, description: string, icon: LucideIcon) => ({
    id,
    label,
    href,
    description,
    icon,
  });

  if (role === 'coach') {
    return [
      common('profile', 'Profile', '/coach/profile', 'Your public coaching page', User),
      common('settings', 'Settings', '/coach/settings', 'Sign-in details and account safety', Settings2),
      common('preferences', 'Preferences', '/coach/settings', 'Appearance, language and sound', SlidersHorizontal),
      common('help', 'Help & FAQ', '/faq', 'Guides, answers and support', HelpCircle),
      { id: 'signout', label: 'Sign out', icon: LogOut, action: 'signout' },
    ];
  }

  if (role === 'admin') {
    return [
      common('profile', 'Admin profile', '/admin/dashboard', 'Console overview and activity', User),
      common('settings', 'Settings', '/admin/settings', 'Platform parameters and audit log', Settings2),
      common('preferences', 'Preferences', '/admin/theme', 'Themes, palettes and accents', SlidersHorizontal),
      common('billing', 'Billing & contracts', '/admin/transactions', 'Agreements and transaction records', CreditCard),
      common('help', 'Help & FAQ', '/faq', 'Guides, answers and support', HelpCircle),
      { id: 'signout', label: 'Sign out', icon: LogOut, action: 'signout' },
    ];
  }

  if (role === 'client') {
    return [
      common('profile', 'Profile', '/client/profile', 'Your public performer page', User),
      common('settings', 'Settings', '/client/settings', 'Sign-in details and account safety', Settings2),
      common('preferences', 'Preferences', '/client/settings', 'Appearance, language and sound', SlidersHorizontal),
      common('help', 'Help & FAQ', '/faq', 'Guides, answers and support', HelpCircle),
      { id: 'signout', label: 'Sign out', icon: LogOut, action: 'signout' },
    ];
  }

  return [];
}

function matchers(role: HeaderRole) {
  const portal = role === 'client' ? '/client' : role === 'coach' ? '/coach' : '/admin';
  const excludedHub =
    role === 'client'
      ? ['/client/performing-arts-philippines']
      : role === 'coach'
        ? ['/coach/performing-arts-philippines']
        : [];

  return {
    dashboard: {
      match: [portal, '/messages', '/users', '/contracts', '/userprofile'],
      exclude: excludedHub,
    },
    community: {
      match: [
        '/community',
        '/performing-arts-philippines',
        '/client/performing-arts-philippines',
        '/coach/performing-arts-philippines',
      ],
    },
  };
}

function navItems(role: HeaderRole): HeaderNavItem[] {
  const community: HeaderNavItem = {
    id: 'community',
    label: 'Community',
    icon: Users,
    dropdown: 'community',
    ...matchers(role).community,
  };

  const about: HeaderNavItem =
    role === 'client' || role === 'coach'
      ? {
          id: 'about',
          label: 'About Groove',
          icon: Info,
          dropdown: 'about',
          match: ['/about', '/about-project'],
        }
      : {
          id: 'about',
          label: 'About Groove',
          icon: Info,
          href: '/about',
          match: ['/about'],
        };

  if (role === 'guest') return [community, about];

  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      dropdown: 'dashboard',
      ...matchers(role).dashboard,
    },
    community,
    about,
  ];
}

function quickLinks(role: HeaderRole): HeaderQuickLink[] {
  const aboutLinks = aboutItems(role).map<HeaderQuickLink>((item) => ({
    id: `quick-${item.id}`,
    label: item.label,
    href: item.href,
    description: item.description,
    icon: item.icon,
    group: 'Groove',
    keywords: item.keywords,
  }));

  const help: HeaderQuickLink[] =
    role === 'guest'
      ? [
          {
            id: 'quick-help',
            label: 'Help & FAQ',
            href: '/faq',
            description: 'Guides, answers and support',
            icon: HelpCircle,
            group: 'Groove',
          },
        ]
      : [];

  const destinations = [...dashboardItems(role), ...communityItems(role)]
    .filter((item) => Boolean(item.href))
    .map<HeaderQuickLink>((item) => ({
      id: `quick-${item.id}`,
      label: item.label,
      href: item.href,
      description: item.description,
      icon: item.icon,
      group: item.group ?? 'Pages',
      keywords: item.keywords,
    }));

  const account = avatarItems(role)
    .filter((item): item is HeaderAvatarItem & { href: string } => Boolean(item.href))
    .map<HeaderQuickLink>((item) => ({
      id: `quick-${item.id}`,
      label: item.label,
      href: item.href,
      description: item.description,
      icon: item.icon,
      group: 'Account',
    }));

  const seen = new Set<string>();
  return [...destinations, ...account, ...aboutLinks, ...help].filter((item) => {
    const key = `${item.href}|${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildConfig(role: HeaderRole): AppHeaderConfig {
  const meta = role === 'guest' ? null : ROLE_META[role];
  return {
    role,
    roleLabel: meta?.label ?? 'Performing Arts',
    homeHref: meta?.homeHref ?? '/',
    navItems: navItems(role),
    dropdownItems: {
      dashboard: dashboardItems(role),
      community: communityItems(role),
      about: aboutItems(role),
    },
    avatarMenuItems: avatarItems(role),
    quickLinks: quickLinks(role),
  };
}

/** One object per portal. Exported so tests and menus read the same data. */
export const coachHeaderConfig = buildConfig('coach');
export const clientHeaderConfig = buildConfig('client');
export const adminHeaderConfig = buildConfig('admin');
export const guestHeaderConfig = buildConfig('guest');

export const HEADER_CONFIGS: Record<HeaderRole, AppHeaderConfig> = {
  coach: coachHeaderConfig,
  client: clientHeaderConfig,
  admin: adminHeaderConfig,
  guest: guestHeaderConfig,
};

export function headerConfigForRole(role: HeaderRole): AppHeaderConfig {
  return HEADER_CONFIGS[role];
}

/**
 * The bar's items for the current path.
 *
 * On `/` the centre of the public bar is the landing page's own table of
 * contents: the four in-page anchors from `LANDING_ANCHORS`, followed by the
 * route links the guest bar already had (Community, About Groove). Anchors use
 * `#id` so a click scrolls the document instead of navigating. Every other path
 * — including the authenticated dashboards — gets the unchanged role config.
 *
 * Both the desktop nav and the mobile drawer call this, so the anchors cannot
 * exist in one surface and be missing from the other.
 */
export function navItemsForPath(
  config: AppHeaderConfig,
  pathname: string
): HeaderNavItem[] {
  if (pathname !== '/') return config.navItems;

  const anchors: HeaderNavItem[] = LANDING_ANCHORS.map((anchor) => ({
    id: `landing-${anchor.id}`,
    label: anchor.label,
    icon: anchor.icon,
    href: `#${anchor.id}`,
    /* An anchor is not a route: it must never be reported as the current page
       or grow a persistent active pill. */
    match: [],
  }));

  return [...anchors, ...config.navItems];
}

/**
 * A route is current when it matches one of the item's prefixes and none of its
 * exclusions. Kept generic so the component does not know why a destination is
 * excluded — that belongs to the role that configured it.
 */
export function isHeaderNavActive(item: HeaderNavItem, pathname: string): boolean {
  const matches = item.match.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!matches) return false;
  return !(item.exclude ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Re-exported icons keep the menus visually aligned with the nav data. */
export const HEADER_ICONS = {
  book: BookOpen,
  bot: Bot,
  calendar: CalendarDays,
  drama: Drama,
  file: FileCheck,
  history: History,
  lifebuoy: LifeBuoy,
  message: MessageSquare,
  mic: Mic,
  sparkles: Sparkles,
  theater: Theater,
} as const;
