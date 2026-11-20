/**
 * Platform (admin-chosen) theme service.
 *
 * Reads the admin-tunable `system_settings` table (four keys only) and
 * subscribes to its changes via Realtime, so palette swaps propagate to every
 * open browser without a reload.
 *
 * Reads only — writes belong to the admin console, not this service.
 */
import { createClient } from '@/lib/supabase/client';
import type { GlobalThemeId } from '@/components/theme/ThemeProvider';

export interface PlatformThemeSettings {
  accent?: string;
  platformTheme: string;
  locked: boolean;
}

const PLATFORM_THEME_KEYS = ['theme_accent', 'theme_locked', 'platform_theme', 'theme'] as const;

/**
 * Fetch the four platform-theme keys. Returns null when unreadable
 * (misconfigured RLS, offline) — callers treat that as "no platform choice".
 */
export async function fetchPlatformThemeSettings(): Promise<PlatformThemeSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [...PLATFORM_THEME_KEYS]);

  if (error || !data) return null;

  const settings: Record<string, string> = {};
  for (const row of data as Array<{ key: string; value: string | null }>) {
    settings[row.key] = row.value ?? '';
  }

  return {
    accent: settings.theme_accent || undefined,
    platformTheme: settings.platform_theme || settings.theme || 'dark',
    locked: settings.theme_locked === 'true',
  };
}

/**
 * Subscribe to system_settings changes. Returns an unsubscribe function.
 * The handler receives no payload — callers refetch the keys, keeping this
 * service free of cache concerns.
 */
export function subscribePlatformThemeSettings(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel('theme-system-settings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Narrow an arbitrary stored theme id to a known GlobalThemeId. */
export function resolvePlatformThemeId(
  raw: string | undefined,
  allowed: readonly GlobalThemeId[],
  fallback: GlobalThemeId
): GlobalThemeId {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as GlobalThemeId) : fallback;
}
