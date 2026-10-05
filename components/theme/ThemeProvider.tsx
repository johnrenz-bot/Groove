'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

/**
 * The single source of truth for theme in this application.
 *
 * Design rules this file enforces:
 *  - DARK is the default. `:root` in globals.css already carries the dark
 *    palette, so "no class" means dark and nothing has to be applied for the
 *    app to look right on first paint.
 *  - LIGHT is the opt-in, expressed only as a `light` class on <html>.
 *  - No other component reads or writes theme state, keeps a second copy of it,
 *    or reimplements the toggle. Pages consume `useTheme()`.
 *
 * The theme lives in an external store (localStorage + the <html> class) rather
 * than in component state. `useSyncExternalStore` is what makes that safe: React
 * reads the current value during render, so there is no setState-in-effect, no
 * cascading render, and no flash of the wrong palette. A pre-paint inline script
 * in app/layout.tsx applies the class before React ever runs.
 */

export type Theme = 'dark' | 'light';

/**
 * What the USER chose, as opposed to what is currently painted.
 *
 * `Theme` is the resolved palette; `ThemeMode` is the preference behind it. The
 * three-mode choice (dark / light / system) only became meaningful once the
 * switch moved out of the header chrome and into the account menu — a two-state
 * toggle cannot express "follow the OS", and users who never touch a theme
 * control are better served by matching their device than by inheriting whatever
 * the last person to use that browser picked.
 *
 * The resolved `Theme` remains readable off the DOM class exactly as before, so
 * every existing consumer of `useTheme().theme` is unaffected.
 */
export type ThemeMode = 'dark' | 'light' | 'system';

/** The OS preference. Guarded because this runs during SSR too. */
function systemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Resolves a stored preference to the palette it actually means. */
export function resolveMode(mode: ThemeMode): Theme {
  return mode === 'system' ? systemTheme() : mode;
}

/**
 * Platform accent palettes. The slugs match the `data-accent` selectors in
 * app/globals.css — changing that CSS means changing this list.
 */
export type Accent = 'gold' | 'ember' | 'ocean' | 'orchid' | 'jade' | 'rose';

export const ACCENTS: { value: Accent; label: string; description: string; swatch: string }[] = [
  { value: 'gold', label: 'Groove Gold', description: 'The default brand accent', swatch: '#e8a93b' },
  { value: 'ember', label: 'Ember', description: 'Warm burnt orange', swatch: '#e8703a' },
  { value: 'ocean', label: 'Deep Ocean', description: 'Cool cyan blue', swatch: '#38a8d8' },
  { value: 'orchid', label: 'Orchid', description: 'Vivid violet', swatch: '#a855f7' },
  { value: 'jade', label: 'Jade', description: 'Calm green', swatch: '#2fb98a' },
  { value: 'rose', label: 'Rose', description: 'Soft magenta', swatch: '#e0557f' },
];

const THEME_KEY = 'groove-theme';
const MODE_KEY = 'groove-theme-mode';
const ACCENT_KEY = 'groove-accent';
const EVENT = 'groove-theme-change';

/** Listener set for cross-component sync within the tab. */
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Reads the live theme off <html>. The class is the source of truth at render
 * time, so every consumer stays consistent with what is actually painted.
 */
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changing the theme should update this one too.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getSnapshot(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function getAccentSnapshot(): Accent {
  if (typeof document === 'undefined') return 'gold';
  const value = document.documentElement.getAttribute('data-accent');
  return ACCENTS.some((a) => a.value === value) ? (value as Accent) : 'gold';
}

const MODES: ThemeMode[] = ['dark', 'light', 'system'];

/** The stored preference. The palette class is the source of truth for what is
 *  PAINTED; `data-theme-mode` records the CHOICE, which the class cannot
 *  represent — 'system' and an explicit 'dark' look identical until the OS flips. */
function getModeSnapshot(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const value = document.documentElement.getAttribute('data-theme-mode');
  return MODES.includes(value as ThemeMode) ? (value as ThemeMode) : 'dark';
}

/** Server render and the first client render must agree: dark + gold. */
function getServerSnapshot(): Theme {
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
 * Paints a resolved palette. Split from the preference setter so that a change
 * in the OS appearance — which is not a user choice in this app — can re-paint
 * without overwriting what the user stored.
 */
function applyTheme(resolved: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('light', resolved === 'light');
  root.style.colorScheme = resolved;

  try {
    window.localStorage.setItem(THEME_KEY, resolved);
  } catch {
    // Private mode / blocked storage: the theme still applies for this session.
  }
  emit();
}

/**
 * The only function that mutates the palette. Everything else — the toggle, the
 * provider, cross-tab sync — goes through here.
 *
 * Retained for the pages and settings screens that only know dark/light. Setting
 * it also pins the mode, because an explicit palette choice is a stronger
 * statement than "follow the system".
 */
export function setTheme(next: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme-mode', next);
  applyTheme(next);
}

/** Sets the user's preference, which may be 'system'. */
export function setThemeMode(next: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme-mode', next);
  try {
    window.localStorage.setItem(MODE_KEY, next);
  } catch {
    // Blocked storage: the mode still applies for this session.
  }
  applyTheme(resolveMode(next));
}

/**
 * Applies a platform accent palette. Writing `data-accent` is enough — the
 * stylesheet's `[data-accent='…']` blocks redefine the accent token family, and
 * every token-driven component follows without re-rendering.
 */
export function setAccent(next: Accent) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', next);
  try {
    window.localStorage.setItem(ACCENT_KEY, next);
  } catch {
    // Blocked storage: the accent still applies for this session.
  }
  emit();
}

export function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * The pre-paint mode. Mirrors app/layout.tsx's inline script, which must run
 * before React exists and therefore cannot call into here.
 */
export function resolveInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (MODES.includes(stored as ThemeMode)) return stored as ThemeMode;
    // Fall back to the legacy single-key preference so an existing user's
    // dark/light choice survives the upgrade rather than snapping to dark.
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
  theme: Theme;
  accent: Accent;
  /** The preference, which may be 'system'. */
  mode: ThemeMode;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  accent: 'gold',
  mode: 'dark',
  setTheme: () => {},
  setThemeMode: () => {},
  setAccent: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const accent = useSyncExternalStore(subscribe, getAccentSnapshot, getServerAccentSnapshot);
  const mode = useSyncExternalStore(subscribe, getModeSnapshot, getServerModeSnapshot);

  const handleSet = useCallback((next: Theme) => setTheme(next), []);
  const handleSetMode = useCallback((next: ThemeMode) => setThemeMode(next), []);
  const handleSetAccent = useCallback((next: Accent) => setAccent(next), []);
  // Toggling from 'system' has to break out of it: flipping an auto-following
  // theme to the opposite of what is on screen is the only predictable result.
  const toggle = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme]
  );

  // While the user is on 'system', an OS appearance change re-paints the app.
  // This is a subscription to an external source, not a state copy, and it must
  // NOT rewrite the stored mode — that is precisely the preference being made.
  useEffect(() => {
    if (mode !== 'system') return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode]);

  const value = useMemo(
    () => ({
      theme,
      accent,
      mode,
      setTheme: handleSet,
      setThemeMode: handleSetMode,
      setAccent: handleSetAccent,
      toggleTheme: toggle,
    }),
    [theme, accent, mode, handleSet, handleSetMode, handleSetAccent, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;