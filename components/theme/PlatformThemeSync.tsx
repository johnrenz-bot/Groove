'use client';

import { useEffect, useRef } from 'react';
import {
  ACCENTS,
  setAccent,
  setGlobalTheme,
  GLOBAL_THEMES,
  type Accent,
  type GlobalThemeId,
} from './ThemeProvider';
import { isDarkOnlyRoute } from './RouteThemeEnforcer';
import {
  fetchPlatformThemeSettings,
  resolvePlatformThemeId,
  subscribePlatformThemeSettings,
} from '@/features/theme/services/platformThemeService';

/**
 * Applies the platform appearance chosen in the admin console to every
 * interface — admin, coach, client, and the public pages.
 *
 * When an admin activates a theme, this sync immediately updates all open tabs
 * and pages across all user roles. The data access lives in
 * `features/theme/services/platformThemeService.ts`; this component only
 * decides what to do with the values.
 */
export function PlatformThemeSync() {
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    let cancelled = false;

    const apply = async () => {
      try {
        const settings = await fetchPlatformThemeSettings();
        if (!settings || cancelled) return;

        // Accent: always platform-wide.
        const accent = settings.accent;
        if (accent && (ACCENTS as readonly { value: string }[]).some((a) => a.value === accent)) {
          setAccent(accent as Accent);
        }

        const rawPlatformTheme = settings.platformTheme;
        const platformTheme = resolvePlatformThemeId(
          rawPlatformTheme,
          GLOBAL_THEMES.map((t) => t.id),
          'dark'
        );

        const hasStoredPreference = (() => {
          try {
            const mode = window.localStorage.getItem('groove-theme-mode');
            if (mode === 'dark' || mode === 'light' || mode === 'system') return true;
            return false;
          } catch {
            return false;
          }
        })();

        if (settings.locked || !hasStoredPreference) {
          const isDarkOnly =
            typeof window !== 'undefined' && isDarkOnlyRoute(window.location.pathname);
          if (
            !isDarkOnly ||
            platformTheme === 'dark' ||
            platformTheme === 'halloween' ||
            platformTheme === 'christmas'
          ) {
            setGlobalTheme(platformTheme);
          }
        }
      } catch {
        // Appearance is cosmetic; a failure here must never surface as an error.
      }
    };

    void apply();

    const unsubscribe = subscribePlatformThemeSettings(() => {
      void apply();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return null;
}

export default PlatformThemeSync;
