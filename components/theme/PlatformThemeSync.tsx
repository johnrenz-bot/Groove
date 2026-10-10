'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ACCENTS,
  setAccent,
  setGlobalTheme,
  GLOBAL_THEMES,
  type Accent,
  type GlobalThemeId,
} from './ThemeProvider';
import { isDarkOnlyRoute } from './RouteThemeEnforcer';

/**
 * Applies the platform appearance chosen in the admin console to every
 * interface — admin, coach, client, and the public pages.
 *
 * When an admin activates a theme, this sync immediately updates all open tabs
 * and pages across all user roles.
 */
export function PlatformThemeSync() {
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    let cancelled = false;

    const apply = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('system_settings').select('key, value');
        if (error || !data || cancelled) return;

        const settings: Record<string, string> = {};
        data.forEach((row) => {
          settings[row.key] = row.value ?? '';
        });

        // Accent: always platform-wide.
        const accent = settings.theme_accent;
        if (ACCENTS.some((a) => a.value === accent)) {
          setAccent(accent as Accent);
        }

        const locked = settings.theme_locked === 'true';

        // Check platform_theme (e.g. 'classic', 'halloween', 'christmas', 'dark', 'light')
        const rawPlatformTheme = settings.platform_theme || settings.theme || 'dark';
        const platformTheme: GlobalThemeId = GLOBAL_THEMES.some((t) => t.id === rawPlatformTheme)
          ? (rawPlatformTheme as GlobalThemeId)
          : 'dark';

        const hasStoredPreference = (() => {
          try {
            const mode = window.localStorage.getItem('groove-theme-mode');
            if (mode === 'dark' || mode === 'light' || mode === 'system') return true;
            return false;
          } catch {
            return false;
          }
        })();

        if (locked || !hasStoredPreference) {
          const isDarkOnly = typeof window !== 'undefined' && isDarkOnlyRoute(window.location.pathname);
          if (!isDarkOnly || platformTheme === 'dark' || platformTheme === 'halloween' || platformTheme === 'christmas') {
            setGlobalTheme(platformTheme);
          }
        }
      } catch {
        // Appearance is cosmetic; a failure here must never surface as an error.
      }
    };

    apply();

    // Listen for realtime theme changes from Supabase system_settings
    const supabase = createClient();
    const channel = supabase
      .channel('theme-system-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          apply();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}

export default PlatformThemeSync;