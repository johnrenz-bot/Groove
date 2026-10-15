'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  dictionaries,
  navDictionaries,
  type DictNode,
  type Language,
  type NavText,
} from './dictionaries';
import type { NavLeaf, NavRole } from '@/components/header/navConfig';

export type { Language };
export { LANGUAGES } from './dictionaries';

/**
 * ONE language preference for every dashboard (Admin, Coach, Client).
 *
 * Stored under a dedicated key (`groove-language`) so it can never collide
 * with the theme keys (`groove-theme-mode`, …) or the Supabase auth store.
 * Public/auth pages never mount the switcher and never read this — they stay
 * English-only by simply not consuming it.
 *
 * HYDRATION: the server snapshot is always `en`. The stored value is applied
 * in an effect after mount, matching the ThemeProvider pattern in this repo
 * (server default first, stored preference after). A momentary English-first
 * paint for a returning Tagalog user is the accepted trade — the alternative
 * (reading localStorage during render) is a hydration mismatch.
 */

function lookup(node: DictNode | undefined, segments: string[]): string | undefined {
  let current: string | DictNode | undefined = node;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = current[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match
  );
}

/**
 * Pure lookup: nested key (`header.search`), English fallback, `{var}`
 * interpolation. Used directly by components shared between guest and
 * signed-in contexts so they can gate the language by role.
 */
export function translateIn(
  language: Language,
  key: string,
  fallback?: string,
  vars?: Record<string, string | number>
): string {
  const segments = key.split('.');
  const template =
    lookup(dictionaries[language], segments) ??
    lookup(dictionaries.en, segments) ??
    fallback ??
    key;
  return interpolate(template, vars);
}

function resolveInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'tl' ? 'tl' : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (next: Language) => void;
  /** Nested key (`header.search`), English fallback, `{var}` interpolation. */
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, fallback) => fallback ?? key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(resolveInitialLanguage());
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Private mode / storage blocked — preference simply doesn't persist.
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string, vars?: Record<string, string | number>): string =>
      translateIn(language, key, fallback, vars),
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Alias with the conventional i18n name. */
export function useTranslation(): LanguageContextValue {
  return useContext(LanguageContext);
}

/**
 * Nav label/description in the active language, mirroring navConfig's
 * `labelByRole` / `descriptionByRole` overrides. Falls back to the leaf's own
 * hardcoded English for anything the dictionary doesn't cover yet.
 */
export function translateNavLeaf(
  language: Language,
  leaf: NavLeaf,
  role: NavRole
): { label: string; description?: string } {
  const entry: NavText | undefined = navDictionaries[language]?.[leaf.id];
  const label =
    (role === 'client' ? entry?.label_client : entry?.label_coach) ??
    entry?.label ??
    leaf.labelByRole?.[role] ??
    leaf.label;
  const description =
    (role === 'client' ? entry?.description_client : entry?.description_coach) ??
    entry?.description ??
    leaf.descriptionByRole?.[role] ??
    leaf.description;
  return { label, description };
}

/** Section title in the active language: `t('nav.<sectionId>', fallback)`. */

/**
 * Public pages (role `guest`: landing, auth, public community) stay
 * English-only even when a Tagalog preference is stored from an earlier
 * signed-in session. Dashboards use the stored language.
 */
export function dashboardLanguage(
  role: 'guest' | string,
  language: Language
): Language {
  return role === 'guest' ? 'en' : language;
}

/** Admin console label by route href — the admin nav model carries no stable ids. */
const ADMIN_KEY_BY_HREF: Record<string, string> = {
  '/admin/dashboard': 'overview',
  '/admin/verifications': 'verificationDocs',
  '/admin/users': 'usersDir',
  '/admin/coaches': 'coaches',
  '/admin/clients': 'clients',
  '/admin/bookings': 'bookings',
  '/admin/inquiries': 'inquiries',
  '/admin/messages': 'clientMessages',
  '/admin/transactions': 'contracts',
  '/admin/control': 'sysControl',
  '/admin/announcements': 'announcements',
  '/admin/maintenance': 'maintenance',
  '/admin/theme': 'appearance',
  '/admin/settings': 'sysSettings',
};

const ADMIN_GROUP_KEYS: Record<string, string> = {
  People: 'people',
  Operations: 'operations',
  Platform: 'platform',
};

export function translateAdminLabel(
  t: LanguageContextValue['t'],
  href: string | undefined,
  fallback: string
): string {
  const key = (href && ADMIN_KEY_BY_HREF[href]) || null;
  return key ? t(`admin.${key}`, fallback) : fallback;
}

export function translateAdminGroup(t: LanguageContextValue['t'], fallback: string): string {
  const key = ADMIN_GROUP_KEYS[fallback];
  return key ? t(`admin.${key}`, fallback) : fallback;
}
