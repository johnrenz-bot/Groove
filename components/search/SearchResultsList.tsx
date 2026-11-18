'use client';

/**
 * SearchResultsList — the shared results renderer for the header and sidebar
 * inline search boxes.
 *
 * ARIA contract (the input in the caller owns focus):
 *   role="listbox"   on the scroll area
 *   role="option"    on each row, id = optionId(row), aria-selected = active
 *   aria-live="polite" result-count caption at the top
 *
 * Headers per group match the app's uppercase caption style; the highlighted
 * substring uses <mark> with the accent soft background. When the people
 * request fails the pages still render — only the People section carries the
 * inline error with a Retry button.
 */

import React, { useEffect, useRef } from 'react';
import { Clock3, UserRound, Search, RotateCw, AlertCircle } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { SearchRow, SearchStatus } from './useGlobalSearch';

export interface SearchResultsListProps {
  rows: SearchRow[];
  activeIndex: number;
  listId: string;
  onHover: (index: number) => void;
  onSelect: (row: SearchRow) => void;
  status: SearchStatus;
  error: string | null;
  onRetry: () => void;
  query: string;
  ariaLabel?: string;
  className?: string;
  /** Prefix for option ids (must match aria-activedescendant in the input). */
  optionId: (row: SearchRow) => string;
}

/** Split a label around the (first) case-insensitive query match. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const index = text.toLowerCase().indexOf(q);
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="gs-mark">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}

function groupIconFor(kind: SearchRow['kind']) {
  if (kind === 'person') return <UserRound className="h-3 w-3" aria-hidden="true" />;
  if (kind === 'recent') return <Clock3 className="h-3 w-3" aria-hidden="true" />;
  return <Search className="h-3 w-3" aria-hidden="true" />;
}

export function SearchResultsList({
  rows,
  activeIndex,
  listId,
  onHover,
  onSelect,
  status,
  error,
  onRetry,
  query,
  ariaLabel = 'Search results',
  className,
  optionId,
}: SearchResultsListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Keep the active row visible while the user arrows through.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, rows.length]);

  const loading = status === 'loading';
  const isSearchable = query.trim().length > 0;
  // Group by name — consecutive AND non-consecutive rows fold into one block.
  // Insertion-ordered so captions keep the registry order (recent, pages, people).
  const groupMap = new Map<string, { group: string; kind: SearchRow['kind']; items: SearchRow[] }>();
  for (const row of rows) {
    const existing = groupMap.get(row.group);
    if (existing) {
      existing.items.push(row);
    } else {
      groupMap.set(row.group, { group: row.group, kind: row.kind, items: [row] });
    }
  }
  const grouped = Array.from(groupMap.values());

  let rowIndex = -1;

  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={ariaLabel}
      className={cn('gs-list g-scroll', className)}
    >
      {/* Screen-reader count announcement */}
      <p aria-live="polite" className="sr-only">
        {rows.length === 0
          ? isSearchable
            ? 'No results'
            : 'Start typing to search'
          : `${rows.length} result${rows.length === 1 ? '' : 's'}`}
      </p>

      {grouped.map(({ group, kind, items }) => (
        <div key={group} role="group" aria-label={group}>
          <p className="gs-group">
            {groupIconFor(kind)}
            <span>{group}</span>
          </p>
          {items.map((row) => {
            rowIndex += 1;
            const index = rowIndex;
            const active = index === activeIndex;
            const RowIcon = row.icon;
            return (
              <div
                key={row.id}
                id={optionId(row)}
                role="option"
                aria-selected={active}
                data-active={active || undefined}
                onMouseEnter={() => onHover(index)}
                onMouseDown={(event) => event.preventDefault() /* keep focus in the input */}
                onClick={() => onSelect(row)}
                className={cn('gs-row', active && 'is-active')}
              >
                {row.kind === 'person' ? (
                  <span className="gs-row-avatar" aria-hidden="true">
                    {initialsOf(row.label)}
                  </span>
                ) : RowIcon ? (
                  <span className="gs-row-icon" aria-hidden="true">
                    <RowIcon className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="gs-row-icon" aria-hidden="true">
                    <Search className="h-4 w-4" />
                  </span>
                )}
                <span className="gs-row-text">
                  <span className="gs-row-label">
                    <Highlight text={row.label} query={query} />
                  </span>
                  {row.description && (
                    <span className="gs-row-desc">{row.description}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {/* People-loading skeleton rows (pages stay visible meanwhile) */}
      {loading && isSearchable && (
        <>
          <p className="gs-group gs-group-loading">
            <UserRound className="h-3 w-3" aria-hidden="true" />
            <span>People</span>
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="gs-skeleton-row" aria-hidden="true">
              <span className="gs-skeleton-avatar" />
              <span className="gs-skeleton-text" />
            </div>
          ))}
        </>
      )}

      {/* People request failed — pages still render, offer a retry inline */}
      {status === 'error' && (
        <div role="alert" className="gs-error">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <span className="gs-error-text">
            {error ?? 'Search is unavailable right now.'}
          </span>
          <button type="button" className="gs-retry" onClick={onRetry}>
            <RotateCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* Nothing matched anywhere */}
      {!loading && rows.length === 0 && isSearchable && (
        <p className="gs-empty">No results for “{query.trim()}”.</p>
      )}
    </div>
  );
}

function initialsOf(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '•';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

