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

/** The OS preference. Guarded for SSR. */
function systemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Resolves a stored preference to the palette it actually means. */
export function resolveMode(mode: ThemeMode): Theme {
  return mode === 'system' ? systemTheme() : mode;
}

export type Accent = 'gold' | 'ember' | 'ocean' | 'orchid' | 'jade' | 'rose';

export const ACCENTS: { value: Accent; label: string; description: string; swatch: string }[] = [
  { value: 'gold', label: 'Groove Gold', description: 'The default brand accent', swatch: '#e8a93b' },
  { value: 'ember', label: 'Ember', description: 'Warm burnt orange', swatch: '#e8703a' },
  { value: 'ocean', label: 'Deep Ocean', description: 'Cool cyan blue', swatch: '#38a8d8' },
  { value: 'orchid', label: 'Orchid', description: 'Vivid violet', swatch: '#a855f7' },
  { value: 'jade', label: 'Jade', description: 'Calm green', swatch: '#2fb98a' },
  { value: 'rose', label: 'Rose', description: 'Soft magenta', swatch: '#e0557f' },
];

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
  if (typeof document === 'undefined') return 'gold';
  const value = document.documentElement.getAttribute('data-accent');
  return ACCENTS.some((a) => a.value === value) ? (value as Accent) : 'gold';
}

const MODES: ThemeMode[] = ['dark', 'light', 'system'];

function getModeSnapshot(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const value = document.documentElement.getAttribute('data-theme-mode');
  return MODES.includes(value as ThemeMode) ? (value as ThemeMode) : 'dark';
}

function getServerSnapshot(): Theme {
  return 'dark';
}

function getServerGlobalThemeSnapshot(): GlobalThemeId {
  return 'dark';
}

function getServerAccentSnapshot(): Accent {
  return 'gold';
}

function getServerModeSnapshot(): ThemeMode {
  return 'dark';
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

export function resolveInitialGlobalTheme(): GlobalThemeId {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(GLOBAL_THEME_KEY);
    if (stored && GLOBAL_THEMES.some((t) => t.id === stored)) {
      return stored as GlobalThemeId;
    }
    const legacy = window.localStorage.getItem(THEME_KEY);
    return legacy === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolveInitialTheme(): Theme {
  const global = resolveInitialGlobalTheme();
  const meta = GLOBAL_THEMES.find((t) => t.id === global);
  return meta?.colorScheme || 'dark';
}

export function resolveInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (MODES.includes(stored as ThemeMode)) return stored as ThemeMode;
    const legacy = window.localStorage.getItem(THEME_KEY);
    return legacy === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolveInitialAccent(): Accent {
  if (typeof window === 'undefined') return 'gold';
  try {
    const value = window.localStorage.getItem(ACCENT_KEY);
    return ACCENTS.some((a) => a.value === value) ? (value as Accent) : 'gold';
  } catch {
    return 'gold';
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
  globalTheme: 'dark',
  theme: 'dark',
  accent: 'gold',
  mode: 'dark',
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

  const toggle = useCallback(() => {
    if (globalTheme === 'classic') {
      setGlobalTheme('dark');
    } else {
      setGlobalTheme(theme === 'dark' ? 'light' : 'dark');
    }
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