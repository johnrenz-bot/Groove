'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, CornerDownLeft, Search, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';
import { useUserSearch } from '@/components/shared/useUserSearch';
import type { AppHeaderConfig, HeaderQuickLink } from './appHeaderConfig';
import { translateQuickLink } from './headerText';
import type { NavRole } from './navConfig';
import { translateIn, useLanguage, dashboardLanguage } from '@/lib/i18n/LanguageProvider';

type Row =
  | {
      kind: 'page';
      id: string;
      label: string;
      description?: string;
      href: string;
      icon: LucideIcon;
      group: string;
      haystack: string;
    }
  | {
      kind: 'person';
      id: string;
      label: string;
      description?: string;
      href: string;
      group: string;
    }
  | {
      kind: 'recent';
      id: string;
      label: string;
      group: string;
      query: string;
    };

const RECENT_KEY = (role: NavRole) => `groove:header:recent-searches:${role}`;
const RECENT_LIMIT = 5;

function readRecent(role: NavRole): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY(role));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT) : [];
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
    // Private mode / quota: the palette still works, it just does not remember.
  }
  return next;
}

/**
 * Cmd/Ctrl+K.
 *
 * The page index is the role's own `quickLinks` — the same destinations the bar
 * and the drawer render — so the palette cannot offer a route the signed-in role
 * cannot reach. People come from the existing `useUserSearch` hook (debounced,
 * aborted, RLS-respecting) and are requested only once the query is long enough.
 */
export function CommandPalette({
  open,
  role,
  config,
  onClose,
}: {
  open: boolean;
  role: NavRole;
  config: AppHeaderConfig;
  onClose: () => void;
}) {
  return open ? <PaletteBody role={role} config={config} onClose={onClose} /> : null;
}

function PaletteBody({
  role,
  config,
  onClose,
}: {
  role: NavRole;
  config: AppHeaderConfig;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent(role));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const people = useUserSearch();
  const { language } = useLanguage();
  const lang = dashboardLanguage(role, language);
  const t = (key: string, fallback?: string) => translateIn(lang, key, fallback);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // One debounce for everything the user sees. People requests are additionally
  // debounced inside `useUserSearch`, which is where abort/cancellation lives.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  const quickRows: Extract<Row, { kind: 'page' }>[] = config.quickLinks.map(
    (link: HeaderQuickLink) => {
      const text = translateQuickLink(role, language, link);
      return {
        kind: 'page',
        id: `quick-${link.id}`,
        label: text.label,
        description: text.description,
        href: link.href,
        icon: link.icon,
        group: text.group ?? t('palette.pages', 'Pages'),
        haystack: [
          text.label,
          link.label,
          text.description,
          link.description,
          ...(link.keywords ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      };
    }
  );

  const q = debounced.trim().toLowerCase();
  const pages = q
    ? quickRows
        .filter((row) => row.haystack.includes(q))
        .sort((a, b) => Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q)))
        .slice(0, 8)
    : quickRows;

  const peopleRows: Row[] =
    people.isSearchable && people.status === 'success'
      ? people.results.map((person) => ({
          kind: 'person',
          id: `person-${person.id}`,
          label: `${person.firstname} ${person.lastname}`.trim(),
          description: [person.role, person.city_name].filter(Boolean).join(' · ') || undefined,
          href: `/userprofile/${person.id}`,
          group: t('palette.people', 'People'),
        }))
      : [];

  const recentRows: Row[] = !q
    ? recent.map((entry, index) => ({
        kind: 'recent',
        // A query may contain spaces; an HTML id may not.
        id: `recent-${index}`,
        label: entry,
        group: t('palette.recent', 'Recent searches'),
        query: entry,
      }))
    : [];

  const rows: Row[] = [...recentRows, ...pages, ...peopleRows];

  const onChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    people.setQuery(value);
  };

  const go = useCallback(
    (href: string) => {
      if (query.trim()) setRecent(writeRecent(role, query.trim()));
      onClose();
      router.push(href);
    },
    [onClose, query, role, router]
  );

  const select = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.kind === 'recent') {
        onChange(row.query);
        inputRef.current?.focus();
        return;
      }
      go(row.href);
    },
    // `onChange` is intentionally not memoised; this callback is recreated with
    // the selected row's data and never stored by a child.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [go]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? rows.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(rows[activeIndex]);
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const peopleLoading = people.status === 'loading';
  const noResults = rows.length === 0 && !peopleLoading;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      showClose={false}
      aria-label={t('header.searchLabel', 'Search pages and people')}
      className="hx-cmdk"
    >
      <div className="hx-cmdk-head">
        <Search className="hx-cmdk-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('palette.placeholder', 'Search pages and people…')}
          aria-label={t('palette.placeholder', 'Search pages and people')}
          aria-expanded
          aria-controls="hx-cmdk-list"
          aria-activedescendant={rows[activeIndex] ? `hx-cmdk-${rows[activeIndex].id}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          className="hx-cmdk-input"
        />
        <kbd className="hx-cmdk-kbd">Esc</kbd>
      </div>

      <div ref={listRef} id="hx-cmdk-list" role="listbox" aria-label="Results" className="hx-cmdk-list g-scroll">
        {rows.map((row, index) => {
          const previous = rows[index - 1];
          const showGroup = !previous || previous.group !== row.group;
          return (
            <React.Fragment key={row.id}>
              {showGroup && (
                <p className="hx-cmdk-group">
                  {row.kind === 'person' && <UserRound className="h-3 w-3" aria-hidden="true" />}
                  {row.kind === 'recent' && <Clock3 className="h-3 w-3" aria-hidden="true" />}
                  {row.group}
                </p>
              )}
              <RowView
                row={row}
                query={q}
                index={index}
                activeIndex={activeIndex}
                onHover={() => setActiveIndex(index)}
                onActivate={() => select(row)}
              />
            </React.Fragment>
          );
        })}

        {peopleLoading && q.length > 1 && (
          <div className="hx-cmdk-skeletons" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="hx-cmdk-skeleton-row">
                <span className="hx-cmdk-skeleton-avatar" />
                <span className="hx-cmdk-skeleton-text">
                  <span style={{ width: `${58 - index * 7}%` }} />
                  <span style={{ width: `${34 + index * 5}%` }} />
                </span>
              </div>
            ))}
          </div>
        )}

        {peopleLoading && q.length > 1 && (
          <p className="hx-cmdk-status" role="status">
            {t('common.loading', 'Loading…')}
          </p>
        )}

        {noResults && (
          <p className="hx-cmdk-empty">
            {query.trim()
              ? t('palette.noResults', 'No matches. Try a different word.')
              : t('palette.placeholder', 'Search pages and people…')}
          </p>
        )}
      </div>

      <div className="hx-cmdk-foot">
        <span>
          <kbd className="hx-cmdk-kbd">↑</kbd>
          <kbd className="hx-cmdk-kbd">↓</kbd> {t('palette.navigate', 'to navigate')}
        </span>
        <span>
          <kbd className="hx-cmdk-kbd">
            <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
          </kbd>
          {t('palette.openHint', 'to open')}
        </span>
      </div>
    </Modal>
  );
}

function RowView({
  row,
  query,
  index,
  activeIndex,
  onHover,
  onActivate,
}: {
  row: Row;
  query: string;
  index: number;
  activeIndex: number;
  onHover: () => void;
  onActivate: () => void;
}) {
  const active = index === activeIndex;

  return (
    <div
      id={`hx-cmdk-${row.id}`}
      role="option"
      aria-selected={active}
      data-active={active || undefined}
      onMouseEnter={onHover}
      onClick={onActivate}
      className={cn('hx-cmdk-row', active && 'is-active')}
    >
      <span className="hx-cmdk-row-icon" aria-hidden="true">
        {row.kind === 'page' ? (
          <row.icon className="h-4 w-4" />
        ) : row.kind === 'recent' ? (
          <Clock3 className="h-4 w-4" />
        ) : (
          <span className="hx-cmdk-avatar">{getInitials(row.label, '')}</span>
        )}
      </span>
      <span className="hx-cmdk-row-text">
        <span className="hx-cmdk-row-label">
          <Highlight text={row.label} query={query} />
        </span>
        {row.kind !== 'recent' && row.description && (
          <span className="hx-cmdk-row-desc">{row.description}</span>
        )}
        {row.kind === 'recent' && (
          <span className="hx-cmdk-row-desc">Search again for “{row.query}”</span>
        )}
      </span>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="hx-cmdk-mark">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}

export default CommandPalette;
