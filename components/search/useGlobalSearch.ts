'use client';

/**
 * useGlobalSearch — the one data hook behind the inline header and sidebar
 * search boxes.
 *
 * DATA SOURCES (unchanged from the command palette it replaces):
 *   - Pages: the role's `quickLinks` from appHeaderConfig (translated).
 *   - People: /api/users through the shared useUserSearch hook (debounced,
 *     aborted, admin-excluded, RLS-respecting, public directory columns only).
 *   - Recent searches: localStorage (per role), carried over from the palette.
 *
 * ROLE-AWARENESS comes from the caller passing the role's own `config`;
 * there is no role decision made inside this hook.
 *
 * KEYBOARD CONTRACT (used by both surfaces):
 *   ArrowUp / ArrowDown — move through rows (wraps)
 *   Home / End          — first / last row
 *   Enter               — activate the active row
 *   Escape              — caller clears/collapses (hook only moves focus nowhere)
 * Rows are real links wrapped in a role="option" for screen readers, reached via
 * aria-activedescendant — focus never leaves the input.
 */

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock3, type LucideIcon } from 'lucide-react';

import type { AppHeaderConfig, HeaderQuickLink } from '@/components/header/appHeaderConfig';
import { translateQuickLink } from '@/components/header/headerText';
import type { NavRole } from '@/components/header/navConfig';
import { translateIn, useLanguage, dashboardLanguage } from '@/lib/i18n/LanguageProvider';
import { useUserSearch, type UserSearchResult } from '@/components/shared/useUserSearch';

export type SearchRowKind = 'page' | 'person' | 'recent';

export interface SearchRow {
  kind: SearchRowKind;
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon?: LucideIcon;
  /** Pre-computed lowercase haystack for page rows. */
  haystack?: string;
  /** Only for kind: 'recent' — the stored query to re-apply on select. */
  query?: string;
  /** Group caption the rows render under, e.g. "Pages". */
  group: string;
}

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

const RECENT_KEY = (role: NavRole) => `groove:header:recent-searches:${role}`;
const RECENT_LIMIT = 5;

function readRecent(role: NavRole): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY(role));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(role: NavRole, value: string): string[] {
  const next = [value, ...readRecent(role).filter((entry) => entry.toLowerCase() !== value.toLowerCase())].slice(
    0,
    RECENT_LIMIT
  );
  try {
    window.localStorage.setItem(RECENT_KEY(role), JSON.stringify(next));
  } catch {
    /* private mode / quota — the search still works, it just does not remember */
  }
  return next;
}

export interface GlobalSearch {
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  rows: SearchRow[];
  /** 'idle' when the query is too short and nothing was searched yet. */
  status: SearchStatus;
  error: string | null;
  retry: () => void;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  /** Key handler to spread onto the input. */
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Activate the active row. */
  selectActive: () => void;
  activateRow: (row: SearchRow) => void;
  /** All ids needed for aria-activedescendant wiring. */
  optionId: (row: SearchRow) => string;
  /** True when the query is short/empty and recent rows are showing. */
  showingRecent: boolean;
  language: string;
}

export function useGlobalSearch(config: AppHeaderConfig, role: NavRole): GlobalSearch {
  const router = useRouter();
  const people = useUserSearch();
  const { language } = useLanguage();
  const lang = dashboardLanguage(role, language);
  const t = useCallback((key: string, fallback: string) => translateIn(lang, key, fallback), [lang]);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent(role));

  const pageRows: SearchRow[] = useMemo(
    () =>
      config.quickLinks.map((link: HeaderQuickLink) => {
        const text = translateQuickLink(role, language, link);
        return {
          kind: 'page' as const,
          id: `page-${link.id}`,
          label: text.label,
          description: text.description,
          href: link.href,
          icon: link.icon ?? Search,
          group: text.group ?? t('palette.pages', 'Pages'),
          haystack: [
            text.label,
            link.label,
            text.description ?? '',
            link.description ?? '',
            ...(link.keywords ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        };
      }),
    // role + language fully determine the translated rows
    [config.quickLinks, language, role, t]
  );

  const q = query.trim().toLowerCase();

  const filteredPages: SearchRow[] = useMemo(() => {
    if (!q) return pageRows.slice(0, 50);
    return pageRows
      .filter((row) => row.haystack?.includes(q))
      .sort(
        (a, b) =>
          Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q))
      )
      .slice(0, 8);
  }, [pageRows, q]);

  const peopleRows: SearchRow[] = useMemo(() => {
    if (people.status !== 'success' || !people.isSearchable) return [];
    return people.results.map((person: UserSearchResult) => ({
      kind: 'person' as const,
      id: `person-${person.id}`,
      label: `${person.firstname} ${person.lastname}`.trim(),
      description:
        [person.role, person.city_name].filter(Boolean).join(' · ') || person.username,
      href: `/userprofile/${person.id}`,
      group: t('palette.people', 'People'),
    }));
  }, [people.status, people.isSearchable, people.results, t]);

  const recentRows: SearchRow[] = useMemo(
    () =>
      !q
        ? recent.map((entry, index) => ({
            kind: 'recent' as const,
            id: `recent-${index}`,
            label: entry,
            group: t('palette.recent', 'Recent searches'),
            query: entry,
            icon: Clock3,
          }))
        : [],
    [q, recent, t]
  );

  const rows: SearchRow[] = useMemo(
    () => [...recentRows, ...filteredPages, ...peopleRows],
    [recentRows, filteredPages, peopleRows]
  );

  const showingRecent = !q && recentRows.length > 0;

  const status: SearchStatus =
    people.status === 'error'
      ? 'error'
      : people.status === 'loading'
        ? 'loading'
        : q
          ? 'success'
          : 'idle';

  const setQueryValue = useCallback((value: string) => {
    setQuery(value);
    setActiveIndex(0);
    people.setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- people is a stable hook object within a mount
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    people.reset();
    setActiveIndex(0);
  }, [people]);

  const optionId = useCallback((row: SearchRow) => `gs-option-${row.kind}-${row.id}`, []);

  const activateRow = useCallback(
    (row: SearchRow) => {
      if (row.kind === 'recent') {
        setQueryValue(row.query ?? '');
        return;
      }
      if (query.trim()) setRecent(writeRecent(role, query.trim()));
      if (row.href) router.push(row.href);
    },
    [query, role, router, setQueryValue]
  );

  const selectActive = useCallback(() => {
    const row = rows[activeIndex];
    if (row) activateRow(row);
  }, [rows, activeIndex, activateRow]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? rows.length - 1 : i - 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(rows.length ? rows.length - 1 : 0);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        selectActive();
      }
      // Escape is handled by the surface (header dropdown collapse / sidebar clear)
    },
    [rows.length, selectActive]
  );

  // Keep the active row inside bounds when the list shrinks mid-search —
  // clamped on read, no effect required.
  const boundedActiveIndex = rows.length === 0 ? 0 : Math.min(activeIndex, rows.length - 1);

  return {
    query,
    setQuery: setQueryValue,
    clearQuery,
    rows,
    status,
    error: people.error,
    retry: people.refresh,
    activeIndex: boundedActiveIndex,
    setActiveIndex,
    onKeyDown,
    selectActive,
    activateRow,
    optionId,
    showingRecent,
    language: lang,
  };
}

export default useGlobalSearch;
