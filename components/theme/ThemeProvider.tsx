'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  GLOBAL_THEMES,
  type GlobalTheme,
  type GlobalThemeId,
} from '@/lib/theme/types';

export type { GlobalTheme, GlobalThemeId };
export { GLOBAL_THEMES };

export type Theme = 'dark' | 'light';
export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * The OS preference. Guarded for SSR.
 *
 * `systemTheme()` used to invert this query (match 'light', return dark) which
 * meant a user with no saved preference got dark unless their OS said "light".
 * Matching `dark` directly is the honest reading of the setting.
 */
function systemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Resolves a stored preference to the palette it actually means. */
export function resolveMode(mode: ThemeMode): Theme {
  return mode === 'system' ? systemTheme() : mode;
}

export type Accent = 'unity' | 'relief' | 'sunburst';

/**
 * The admin-selectable interactive color. Only the brand's own three colors —
 * there is no sixth hue that is not part of GroovePH's identity.
 */
export const ACCENTS: { value: Accent; label: string; description: string; swatch: string }[] = [
  { value: 'unity', label: 'Unity Blue', description: 'The default brand accent', swatch: '#2F4E8C' },
  { value: 'relief', label: 'Relief Red', description: 'Warm, urgent, unmistakable', swatch: '#AE313A' },
  { value: 'sunburst', label: 'Sunburst Yellow', description: 'Bright, optimistic highlight', swatch: '#F4BE4D' },
];

export const DEFAULT_ACCENT: Accent = 'unity';
/** A first-time visitor follows the OS. Dark remains the no-JS fallback. */
export const DEFAULT_MODE: ThemeMode = 'system';
export const DEFAULT_THEME: Theme = 'dark';

export const GLOBAL_THEME_KEY = 'groove-global-theme';
const THEME_KEY = 'groove-theme';
const MODE_KEY = 'groove-theme-mode';
const ACCENT_KEY = 'groove-accent';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function getGlobalThemeSnapshot(): GlobalThemeId {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme') as GlobalThemeId | null;
  if (attr && GLOBAL_THEMES.some((t) => t.id === attr)) return attr;

  if (document.documentElement.classList.contains('classic')) return 'classic';
  if (document.documentElement.classList.contains('halloween')) return 'halloween';
  if (document.documentElement.classList.contains('christmas')) return 'christmas';
  if (document.documentElement.classList.contains('light')) return 'light';

  return 'dark';
}

function getSnapshot(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const global = getGlobalThemeSnapshot();
  const meta = GLOBAL_THEMES.find((t) => t.id === global);
  if (meta) return meta.colorScheme;
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function getAccentSnapshot(): Accent {
  if (typeof document === 'undefined') return DEFAULT_ACCENT;
  const value = document.documentElement.getAttribute('data-accent');
  return ACCENTS.some((a) => a.value === value) ? (value as Accent) : DEFAULT_ACCENT;
}

const MODES: ThemeMode[] = ['dark', 'light', 'system'];

function getModeSnapshot(): ThemeMode {
  if (typeof document === 'undefined') return DEFAULT_MODE;
  const value = document.documentElement.getAttribute('data-theme-mode');
  return MODES.includes(value as ThemeMode) ? (value as ThemeMode) : DEFAULT_MODE;
}

/* --- Server snapshots -------------------------------------------------------
   These are what React renders on the very first pass, before the pre-paint
   script in app/layout.tsx has run. They must match the *token defaults* in
   globals.css, because anything else produces a visible flash on the first
   paint of a cold load. `html` therefore also carries
   `suppressHydrationWarning`, since the script mutates those attributes a few
   milliseconds later. */
function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

function getServerGlobalThemeSnapshot(): GlobalThemeId {
  return DEFAULT_THEME;
}

function getServerAccentSnapshot(): Accent {
  return DEFAULT_ACCENT;
}

function getServerModeSnapshot(): ThemeMode {
  return DEFAULT_MODE;
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Applies a Global Theme directly to the DOM and persists to localStorage.
 */
export function applyGlobalTheme(theme: GlobalThemeId) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const meta = GLOBAL_THEMES.find((t) => t.id === theme);
  const colorScheme = meta?.colorScheme ?? (theme === 'light' || theme === 'classic' ? 'light' : 'dark');

  root.setAttribute('data-theme', theme);
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('classic', theme === 'classic');
  root.classList.toggle('halloween', theme === 'halloween');
  root.classList.toggle('christmas', theme === 'christmas');
  root.style.colorScheme = colorScheme;

  try {
    window.localStorage.setItem(GLOBAL_THEME_KEY, theme);
    window.localStorage.setItem(THEME_KEY, colorScheme);
  } catch {
    // Private mode / storage blocked
  }

  emit();
}

/**
 * Temporary visual preview without writing to persistent storage.
 */
export function applyPreviewGlobalTheme(theme: GlobalThemeId | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (!theme) {
    // Restore stored theme
    const stored = resolveInitialGlobalTheme();
    applyGlobalTheme(stored);
    return;
  }

  const meta = GLOBAL_THEMES.find((t) => t.id === theme);
  const colorScheme = meta?.colorScheme ?? (theme === 'light' || theme === 'classic' ? 'light' : 'dark');

  root.setAttribute('data-theme', theme);
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('classic', theme === 'classic');
  root.classList.toggle('halloween', theme === 'halloween');
  root.classList.toggle('christmas', theme === 'christmas');
  root.style.colorScheme = colorScheme;

  emit();
}

function applyTheme(resolved: Theme) {
  if (typeof document === 'undefined') return;
  const currentGlobal = getGlobalThemeSnapshot();

  // If a distinct rich theme like classic, halloween or christmas is active,
  // switching base mode adapts to classic/light vs dark.
  if (resolved === 'light') {
    if (currentGlobal === 'classic') {
      applyGlobalTheme('classic');
    } else {
      applyGlobalTheme('light');
    }
  } else {
    if (currentGlobal === 'halloween') {
      applyGlobalTheme('halloween');
    } else if (currentGlobal === 'christmas') {
      applyGlobalTheme('christmas');
    } else {
      applyGlobalTheme('dark');
    }
  }
}

export function setGlobalTheme(next: GlobalThemeId) {
  applyGlobalTheme(next);
}

export function setTheme(next: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme-mode', next);
  applyTheme(next);
}

export function setThemeMode(next: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme-mode', next);
  try {
    window.localStorage.setItem(MODE_KEY, next);
  } catch {}
  applyTheme(resolveMode(next));
}

export function setAccent(next: Accent) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', next);
  try {
    window.localStorage.setItem(ACCENT_KEY, next);
  } catch {}
  emit();
}

/**
 * Which *palette* the app should paint with, given what is in storage.
 *
 * An explicit stored mode wins. With nothing stored the OS decides, and an
 * unrecognised or absent accent falls back to Unity Blue — so a database row
 * left over from a previous accent scheme (`gold`, `ember`, …) degrades to the
 * brand default instead of leaving the app unstyled.
 */
export function resolveInitialGlobalTheme(): GlobalThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const mode = resolveInitialMode();
    if (mode !== 'system') return mode;
    return systemTheme();
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolveInitialTheme(): Theme {
  return resolveMode(resolveInitialMode());
}

export function resolveInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (MODES.includes(stored as ThemeMode)) return stored as ThemeMode;
    // Legacy: before `system` existed, `groove-theme` only ever held a resolved
    // colour. Honour it so an existing visitor is not reset to the OS default.
    const legacy = window.localStorage.getItem(THEME_KEY);
    if (legacy === 'light' || legacy === 'dark') return legacy;
    return DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function resolveInitialAccent(): Accent {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  try {
    const value = window.localStorage.getItem(ACCENT_KEY);
    return ACCENTS.some((a) => a.value === value) ? (value as Accent) : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

interface ThemeContextValue {
  globalTheme: GlobalThemeId;
  theme: Theme;
  accent: Accent;
  mode: ThemeMode;
  previewTheme: GlobalThemeId | null;
  activeThemeMeta: GlobalTheme;
  isSeasonal: boolean;
  setGlobalTheme: (theme: GlobalThemeId) => void;
  setPreviewTheme: (theme: GlobalThemeId | null) => void;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  globalTheme: DEFAULT_THEME,
  theme: DEFAULT_THEME,
  accent: DEFAULT_ACCENT,
  mode: DEFAULT_MODE,
  previewTheme: null,
  activeThemeMeta: GLOBAL_THEMES[0],
  isSeasonal: false,
  setGlobalTheme: () => {},
  setPreviewTheme: () => {},
  setTheme: () => {},
  setThemeMode: () => {},
  setAccent: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const globalTheme = useSyncExternalStore(subscribe, getGlobalThemeSnapshot, getServerGlobalThemeSnapshot);
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const accent = useSyncExternalStore(subscribe, getAccentSnapshot, getServerAccentSnapshot);
  const mode = useSyncExternalStore(subscribe, getModeSnapshot, getServerModeSnapshot);

  const [previewTheme, setPreviewThemeState] = useState<GlobalThemeId | null>(null);

  const activeThemeMeta = useMemo(() => {
    const targetId = previewTheme || globalTheme;
    return GLOBAL_THEMES.find((t) => t.id === targetId) || GLOBAL_THEMES[0];
  }, [previewTheme, globalTheme]);

  const isSeasonal = activeThemeMeta.category === 'seasonal';

  const handleSetGlobalTheme = useCallback((next: GlobalThemeId) => {
    setPreviewThemeState(null);
    setGlobalTheme(next);
  }, []);

  const handleSetPreviewTheme = useCallback((next: GlobalThemeId | null) => {
    setPreviewThemeState(next);
    applyPreviewGlobalTheme(next);
  }, []);

  const handleSet = useCallback((next: Theme) => setTheme(next), []);
  const handleSetMode = useCallback((next: ThemeMode) => setThemeMode(next), []);
  const handleSetAccent = useCallback((next: Accent) => setAccent(next), []);

  /**
   * The icon-button toggle in the header. It flips to the opposite *resolved*
   * palette and, crucially, writes an EXPLICIT mode — otherwise a visitor who
   * arrived in `system` mode would tap the toggle, see a change, and find it
   * reverted the next time their OS switched themes.
   */
  const toggle = useCallback(() => {
    if (globalTheme === 'classic') {
      setThemeMode('dark');
      return;
    }
    setThemeMode(theme === 'dark' ? 'light' : 'dark');
  }, [globalTheme, theme]);

  useEffect(() => {
    if (mode !== 'system' || previewTheme) return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode, previewTheme]);

  const value = useMemo(
    () => ({
      globalTheme: previewTheme || globalTheme,
      theme,
      accent,
      mode,
      previewTheme,
      activeThemeMeta,
      isSeasonal,
      setGlobalTheme: handleSetGlobalTheme,
      setPreviewTheme: handleSetPreviewTheme,
      setTheme: handleSet,
      setThemeMode: handleSetMode,
      setAccent: handleSetAccent,
      toggleTheme: toggle,
    }),
    [
      globalTheme,
      theme,
      accent,
      mode,
      previewTheme,
      activeThemeMeta,
      isSeasonal,
      handleSetGlobalTheme,
      handleSetPreviewTheme,
      handleSet,
      handleSetMode,
      handleSetAccent,
      toggle,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;