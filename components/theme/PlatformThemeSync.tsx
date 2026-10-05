'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ACCENTS, setAccent, setThemeMode, type Accent } from './ThemeProvider';

/**
 * Applies the platform appearance chosen in the admin console to every
 * interface — admin, coach, client, and the public pages.
 *
 * This is what makes "theme changes apply consistently across Admin, Coach, and
 * Client" true in practice rather than only for the admin's own browser. It sits
 * in the root layout, above every route, so one fetch reaches all of them.
 *
 * Resolution order:
 *   1. If the admin has *not* locked the theme, a user's own stored preference
 *      wins — a personal light/dark choice is not overruled by an admin default.
 *   2. Otherwise the platform default is applied.
 *
 * The accent is platform-wide unconditionally: it is brand identity, not a
 * personal preference, so an admin changing it means everyone sees it.
 *
 * Renders nothing. Silent on failure by design — a missing settings row must not
 * block the app from rendering, and the CSS defaults are already correct.
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

        // Base theme: platform default unless the admin locked it, in which case
        // it overrides the user's stored preference.
        const locked = settings.theme_locked === 'true';

        // Read BOTH storage keys, not just the legacy one. `groove-theme` is
        // written as a side effect of painting a palette, so it is set for
        // essentially every returning visitor — which made the old check almost
        // always true and silently skipped the platform default for a brand-new
        // user who had simply never touched the control. `groove-theme-mode` is
        // the key that actually records a deliberate choice, so it is the one
        // that decides whether the user has an opinion worth respecting.
        const hasStoredPreference = (() => {
          try {
            const mode = window.localStorage.getItem('groove-theme-mode');
            if (mode === 'dark' || mode === 'light' || mode === 'system') return true;
            // No mode key: fall back to the legacy palette key, which is only
            // meaningful if it was written by the old two-state control.
            return window.localStorage.getItem('groove-theme') === 'light';
          } catch {
            return false;
          }
        })();

        if (locked || !hasStoredPreference) {
          const platformTheme = settings.theme === 'light' ? 'light' : 'dark';
          // setThemeMode, not setTheme: when the admin has NOT locked the theme
          // and the user has no stored preference, recording the platform default
          // as an explicit mode is what stops this component re-deriving it on
          // every subsequent mount. setTheme also writes the attribute directly,
          // so the two paths agree.
          setThemeMode(platformTheme);
        }
      } catch {
        // Appearance is cosmetic; a failure here must never surface as an error.
      }
    };

    apply();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export default PlatformThemeSync;