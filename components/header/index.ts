export { AppHeader } from './AppHeader';
export type { AppHeaderProps } from './AppHeader';
export { AnimatedLogo } from './AnimatedLogo';
export { NavDropdown } from './NavDropdown';
export { isRouteActive } from './routeMatch';
export { UserMenu, greetingFor } from './UserMenu';
export { MobileDrawer } from './MobileDrawer';
export { CommandPalette } from './CommandPalette';
export { LanguageSwitcher } from './LanguageSwitcher';
export { useSlidingIndicator } from './useSlidingIndicator';
export { useHeaderScroll } from './useHeaderScroll';
export {
  HEADER_CONFIGS,
  adminHeaderConfig,
  clientHeaderConfig,
  coachHeaderConfig,
  guestHeaderConfig,
  headerConfigForRole,
  isHeaderNavActive,
  type AppHeaderConfig,
  type HeaderAvatarItem,
  type HeaderDropdownItem,
  type HeaderNavItem,
  type HeaderQuickLink,
} from './appHeaderConfig';
export { ROLE_META, type DashboardRole } from './roleMeta';
export {
  NAV,
  isDropdown,
  labelFor,
  descriptionFor,
  hrefFor,
  sectionsForRole,
  leavesForRole,
  type NavRole,
  type NavLeaf,
  type NavSection,
} from './navConfig';