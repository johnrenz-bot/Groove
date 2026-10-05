'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { resolveInitialMode, resolveMode } from './ThemeProvider';

/**
 * Routes that must ALWAYS render in dark mode without user theme toggling.
 */
export const DARK_ONLY_ROUTES: readonly string[] = [
  '/',
  '/login',
  '/register/coach',
  '/register/client',
];

export function isDarkOnlyRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return DARK_ONLY_ROUTES.includes(pathname);
}

/**
 * RouteThemeEnforcer guarantees that the landing page and authentication
 * flows strictly adhere to dark mode at all times, without overwriting
 * the user's theme preference for other pages (such as dashboards).
 */
export function RouteThemeEnforcer() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const isDarkOnly = isDarkOnlyRoute(pathname);

    if (isDarkOnly) {
      // Force dark mode presentation on the DOM without altering stored preferences
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      // Restore user's stored or system preference when navigating to other routes
      const storedMode = resolveInitialMode();
      const resolved = resolveMode(storedMode);
      root.classList.toggle('light', resolved === 'light');
      root.style.colorScheme = resolved;
    }
  }, [pathname]);

  return null;
}

export default RouteThemeEnforcer;
