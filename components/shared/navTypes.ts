import type { LucideIcon } from 'lucide-react';

/**
 * Navigation model for the top header.
 *
 * This replaces the sidebar's flat/grouped item types. The shape is
 * deliberately different because a horizontal header has different constraints
 * than a vertical rail:
 *
 *   - A rail can afford twelve stacked links. A header cannot — past roughly
 *     four inline items the row crowds out the account cluster and stops
 *     working on a laptop.
 *   - A rail's item order is invisible; a header's is read left-to-right in one
 *     glance. So primary destinations come first, and everything secondary is
 *     folded into a dropdown instead of being demoted and hidden.
 *
 * `NavItem` is deliberately the same three fields the sidebar item had, so the
 * per-role navigation files stay readable and role links stay one line each.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short line shown under the label inside a dropdown panel. */
  description?: string;
}

/**
 * A dropdown group in the header.
 *
 * `label` is the trigger's visible text. `items` are its destinations. Groups
 * are the answer to the crowding problem: a role with twelve destinations
 * (admin) presents four triggers, and the panels hold the detail.
 */
export interface NavGroup {
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
}

/**
 * A role's complete header menu.
 *
 * `primary` renders as inline links — the handful of destinations a user hits
 * many times a day. `groups` render as dropdown triggers. Anything not in
 * `primary` or a group belongs in the account menu, not in the header.
 */
export interface RoleNav {
  primary: NavItem[];
  groups: NavGroup[];
}