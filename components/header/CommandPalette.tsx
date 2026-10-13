'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search, UserRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';
import { useUserSearch } from '@/components/shared/useUserSearch';
import {
  descriptionFor,
  hrefFor,
  labelFor,
  leavesForRole,
  type NavRole,
} from './navConfig';

type Row =
  | {
      kind: 'page';
      id: string;
      label: string;
      description?: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
    }
  | { kind: 'person'; id: string; label: string; description?: string; href: string };

/**
 * Cmd/Ctrl+K.
 *
 * Indexes the SAME nav config the bar renders, so the palette can never offer a
 * destination the bar hides — no second list to keep in sync, and a role that
 * cannot see "Groovey AI" cannot search for it either.
 *
 * People come from the existing `useUserSearch` hook, which already debounces,
 * aborts in-flight requests and talks to /api/users. The "/" shortcut that opened
 * the old inline field still works and opens this — an addition, not a
 * replacement.
 */
export function CommandPalette({
  open,
  role,
  danceAllowed,
  onClose,
}: {
  open: boolean;
  role: NavRole;
  danceAllowed: boolean;
  onClose: () => void;
}) {
  // The body is a separate component so the palette is BORN blank every time it
  // opens. Clearing `query` from an effect on the open transition would be a
  // cascading render on every open, and would still show the previous query for
  // one frame.
  return open ? <PaletteBody role={role} danceAllowed={danceAllowed} onClose={onClose} /> : null;
}

function PaletteBody({
  role,
  danceAllowed,
  onClose,
}: {
  role: NavRole;
  danceAllowed: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const people = useUserSearch();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const navRows = useMemo(
    () =>
      leavesForRole(role, { danceAllowed }).map(({ leaf }) => {
        const label = labelFor(leaf, role);
        const description = descriptionFor(leaf, role);
        return {
          kind: 'page' as const,
          id: leaf.id,
          label,
          description,
          href: hrefFor(leaf, role),
          icon: leaf.icon,
          // Searching "coach" should find "Find Coaches" even though the word
          // appears in its description and keywords, not its label.
          haystack: [label, description, ...(leaf.keywords ?? [])].join(' ').toLowerCase(),
        };
      }),
    [role, danceAllowed]
  );

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const pages = q
      ? navRows.filter((row) => row.haystack.includes(q)).slice(0, 6)
      : navRows.slice(0, 6);
    const matchedPeople = people.isSearchable
      ? people.results.map((person) => ({
          kind: 'person' as const,
          id: person.id,
          label: `${person.firstname} ${person.lastname}`.trim(),
          description: [person.role, person.city_name].filter(Boolean).join(' · ') || undefined,
          href: `/userprofile/${person.id}`,
        }))
      : [];
    return [...pages, ...matchedPeople];
  }, [query, navRows, people.isSearchable, people.results]);

  /**
   * Any edit invalidates the highlight — the highlighted row is no longer the
   * best match for the new text. Done in the handler rather than in an effect
   * on `[query]`, which would be a cascading render per keystroke.
   */
  const onChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
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
      const target = rows[activeIndex];
      if (target) go(target.href);
    }
  };

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const hasPages = rows.some((row) => row.kind === 'page');
  const hasPeople = rows.some((row) => row.kind === 'person');

  return (
    <Modal open onClose={onClose} size="lg" showClose={false} className="hx-cmdk">
      <div className="hx-cmdk-head">
        <Search className="hx-cmdk-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search pages and people…"
          aria-label="Search pages and people"
          aria-expanded={true}
          aria-controls="hx-cmdk-list"
          aria-activedescendant={rows[activeIndex] ? `hx-cmdk-${rows[activeIndex].id}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          className="hx-cmdk-input"
        />
        <kbd className="hx-cmdk-kbd">Esc</kbd>
      </div>

      <div
        ref={listRef}
        id="hx-cmdk-list"
        role="listbox"
        aria-label="Results"
        className="hx-cmdk-list g-scroll"
      >
        {rows.length === 0 && (
          <p className="hx-cmdk-empty">
            {query.trim()
              ? `Nothing matches “${query.trim()}”.`
              : people.status === 'loading'
                ? 'Searching…'
                : 'Type to search pages and people.'}
          </p>
        )}

        {hasPages && (
          <>
            <p className="hx-cmdk-group">Pages</p>
            {/* `index` is the position in the FLAT `rows` list, not within this
                group — the highlight is shared with the people rows below, so
                both groups must agree on what is "current". */}
            {rows.map((row, index) =>
              row.kind === 'page' ? (
                <RowView
                  key={row.id}
                  row={row}
                  index={index}
                  activeIndex={activeIndex}
                  onHover={() => setActiveIndex(index)}
                  onActivate={() => go(row.href)}
                />
              ) : null
            )}
          </>
        )}

        {hasPeople && (
          <>
            <p className="hx-cmdk-group">
              <UserRound className="h-3 w-3" aria-hidden="true" />
              People
            </p>
            {rows.map((row, index) =>
              row.kind === 'person' ? (
                <RowView
                  key={row.id}
                  row={row}
                  index={index}
                  activeIndex={activeIndex}
                  onHover={() => setActiveIndex(index)}
                  onActivate={() => go(row.href)}
                />
              ) : null
            )}
          </>
        )}
      </div>

      <div className="hx-cmdk-foot">
        <span>
          <kbd className="hx-cmdk-kbd">↑</kbd>
          <kbd className="hx-cmdk-kbd">↓</kbd> to navigate
        </span>
        <span>
          <kbd className="hx-cmdk-kbd">
            <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
          </kbd>
          to open
        </span>
      </div>
    </Modal>
  );
}

function RowView({
  row,
  index,
  activeIndex,
  onHover,
  onActivate,
}: {
  row: Row;
  index: number;
  activeIndex: number;
  onHover: () => void;
  onActivate: () => void;
}) {
  const active = index === activeIndex;
  const Icon = row.kind === 'page' ? row.icon : null;

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
        {Icon ? (
          <Icon className="h-4 w-4" />
        ) : (
          <span className="hx-cmdk-avatar">{getInitials(row.label, '')}</span>
        )}
      </span>
      <span className="hx-cmdk-row-text">
        <span className="hx-cmdk-row-label">{row.label}</span>
        {row.description && <span className="hx-cmdk-row-desc">{row.description}</span>}
      </span>
    </div>
  );
}

export default CommandPalette;
