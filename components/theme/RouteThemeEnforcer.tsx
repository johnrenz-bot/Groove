'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  applyGlobalTheme,
  resolveInitialGlobalTheme,
} from './ThemeProvider';

/**
 * Routes that render in dark mode presentation by default for public landing & auth.
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
 * RouteThemeEnforcer ensures landing and authentication flows render in dark mode,
 * while seamlessly restoring the global or user-selected theme on all authenticated
 * and dashboard routes.
 */
export function RouteThemeEnforcer() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const isDarkOnly = isDarkOnlyRoute(pathname);

    if (isDarkOnly) {
      // Force dark presentation on public auth without altering stored preferences
      root.classList.remove('light', 'classic');
      root.style.colorScheme = 'dark';
    } else {
      // Restore active global theme
      const storedGlobal = resolveInitialGlobalTheme();
      applyGlobalTheme(storedGlobal);
    }
  }, [pathname]);

  return null;
}

export default RouteThemeEnforcer;
