/**
 * Backwards-compatible name for the single header.
 *
 * The implementation now lives in `components/header/AppHeader.tsx` so the
 * component name matches the role-configuration architecture. Existing pages
 * that still import `SiteHeader` keep working, but every layout mounts the same
 * `AppHeader` — there is no second implementation behind this alias.
 */
export { AppHeader as SiteHeader, AppHeader as default } from '@/components/header/AppHeader';
export type { AppHeaderProps } from '@/components/header/AppHeader';
