'use client';

/**
 * HeaderSearch — inline search for the top bar.
 *
 * The header shows a real <input>, never a button that opens a modal.
 * Results drop down in a panel anchored under the input's RIGHT edge:
 *   - absolutely positioned, width = min(420px, viewport − 16px)
 *   - max-height = min(60dvh, 420px); only the list scrolls
 *   - on phones (<640px) it portals to <body> and sits fixed under the
 *     header (left/right 8px, top = header height + 4px), because both
 *     headers use backdrop-filter and would otherwise swallow `fixed`
 *   - no backdrop, no blur, no focus trap
 *
 * Behaviour:
 *   - Ctrl/Cmd+K focuses the input and selects its text (it never opens a
 *     modal, and it does not fire while the user is in another editable).
 *   - Escape collapses the panel (and clears the query). Outside click,
 *     route change and any other overlay opening also collapse it.
 *   - Below lg: the header shows a search icon; tapping it expands the
 *     search inline across the header row. The same control toggles back.
 *   - On phones the panel spans the viewport minus 16px on each side.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Search, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppHeaderConfig } from '@/components/header/appHeaderConfig';
import type { NavRole } from '@/components/header/navConfig';
import { translateIn, useLanguage, dashboardLanguage } from '@/lib/i18n/LanguageProvider';
import { useGlobalSearch } from './useGlobalSearch';
import { SearchResultsList } from './SearchResultsList';

export interface HeaderSearchProps {
  config: AppHeaderConfig;
  role: NavRole;
  /** The single overlay state owns whether the panel is rendered. */
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** True while a different overlay (menu/drawer/profile) is open — collapses the panel. */
  suspended?: boolean;
  /** 'dash' renders the compact topbar pill, 'header' the public header pill. */
  variant?: 'dash' | 'header';
}

export function HeaderSearch({
  config,
  role,
  open,
  onOpenChange,
  suspended = false,
  variant = 'dash',
}: HeaderSearchProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const lang = dashboardLanguage(role, language);
  const t = (key: string, fallback: string) => translateIn(lang, key, fallback);

  const search = useGlobalSearch(config, role);
  const { clearQuery, rows, activeIndex, setActiveIndex, onKeyDown, optionId } = search;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listId = `gs-panel-list-${variant}`;
  const [expanded, setExpanded] = useState(false);
  const isMobileExpanded = expanded && variant === 'dash';

  // Phones (<640px) get the panel portaled to <body> and fixed under the
  // header — both headers use backdrop-filter, which would otherwise make
  // `position: fixed` resolve against the header instead of the viewport.
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639.5px)');
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Render-time reset on route change: wipe the query, collapse the panel and
  // the mobile expansion — no effect, no cascading render.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    clearQuery();
    setExpanded(false);
    onOpenChange(false);
  }

  // Close the panel when another overlay takes over.
  useEffect(() => {
    if (suspended) onOpenChange(false);
  }, [suspended, onOpenChange]);

  // Ctrl/Cmd + K: focus the input and select its text. On phones, expand the
  // search row first so the input is visible before it is focused.
  useEffect(() => {
    const onKeyDownGlobal = (event: KeyboardEvent) => {
      const isK = (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
      if (!isK) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      event.preventDefault();
      setExpanded(true);
      onOpenChange(true);
      window.requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
        inputRef.current?.select();
      });
    };
    document.addEventListener('keydown', onKeyDownGlobal);
    return () => document.removeEventListener('keydown', onKeyDownGlobal);
  }, [onOpenChange]);

  // Focus the input whenever the panel opens (desktop) — keeps the combobox contract honest.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  // Outside pointer closes the panel. The header is the containing block, so a
  // click anywhere outside it (or on its non-search parts) collapses the list.
  // The ≤640px panel is portaled to <body>, so its own clicks must not count
  // as "outside" — they are checked against panelRef instead.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  const handleEscapeInInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    clearQuery();
    onOpenChange(false);
    setExpanded(false);
    event.currentTarget.blur();
  };

  const activeRow = rows[activeIndex];

  const panel = open ? (
    <div
      ref={panelRef}
      className={cn('gs-panel', isPhone && 'gs-panel--fixed', isPhone && (variant === 'dash' ? 'gs-panel--dash' : 'gs-panel--header'))}
      role="presentation"
    >
      <SearchResultsList
        listId={listId}
        rows={rows}
        activeIndex={search.activeIndex}
        onHover={setActiveIndex}
        onSelect={(row) => {
          search.activateRow(row);
          if (row.kind !== 'recent') {
            // Navigation happened — collapse like a route change.
            clearQuery();
            onOpenChange(false);
            setExpanded(false);
          }
        }}
        status={search.status}
        error={search.error}
        onRetry={search.retry}
        query={search.query}
        optionId={optionId}
        ariaLabel={t('search.resultsLabel', 'Search results')}
      />
      <div className="gs-foot" aria-hidden="true">
        <span>↑↓ {t('search.navigateHint', 'navigate')}</span>
        <span>↵ {t('search.openHint', 'open')}</span>
        <span>Esc {t('search.escapeHint', 'close')}</span>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'gs-wrapper',
        variant === 'dash' ? 'gs-wrapper--dash' : 'gs-wrapper--header',
        isMobileExpanded && 'gs-wrapper--expanded'
      )}
    >
      {/* Mobile (sub-lg): icon button opens the inline expanded search row */}
      {!expanded && (
        <button
          type="button"
          className="gs-toggle"
          onClick={() => {
            setExpanded(true);
            onOpenChange(true);
            window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
          }}
          aria-label={t('search.openLabel', 'Search pages and people')}
          aria-controls={listId}
          aria-expanded={open}
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {/* The inline search row: input + clear/collapse controls */}
      {(expanded || variant === 'dash' || variant === 'header') && (
        <label
          className={cn(
            'gs-pill',
            variant === 'dash' ? 'gs-pill--dash' : 'gs-pill--header',
            !expanded && 'gs-pill--collapsed' // collapses to icon-pill at <lg when not expanded
          )}
          aria-label={t('search.inputLabel', 'Search pages and people')}
        >
          {/* Back/collapse control — visible <lg while expanded, and on all sizes when open */}
          <button
            type="button"
            className="gs-collapse"
            onClick={() => {
              clearQuery();
              onOpenChange(false);
              setExpanded(false);
            }}
            aria-label={t('search.closeLabel', 'Close search')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <Search className="gs-pill-icon" aria-hidden="true" />

          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeRow ? optionId(activeRow) : undefined}
            aria-autocomplete="list"
            aria-keyshortcuts="Control+K Meta+K"
            aria-label={t('search.inputLabel', 'Search pages and people')}
            autoComplete="off"
            spellCheck={false}
            value={search.query}
            onChange={(event) => {
              search.setQuery(event.target.value);
              if (!open) onOpenChange(true);
            }}
            onFocus={() => onOpenChange(true)}
            onKeyDown={(event) => {
              handleEscapeInInput(event);
              onKeyDown(event);
            }}
            placeholder={t('search.placeholder', 'Search pages and people…')}
            className="gs-input"
          />

          {/* Clear control — only while there is text. 44px hit area. */}
          {search.query && (
            <button
              type="button"
              className="gs-clear"
              onClick={() => {
                clearQuery();
                inputRef.current?.focus();
              }}
              aria-label={t('search.clearLabel', 'Clear search')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <kbd className="gs-kbd" aria-hidden="true">
            Ctrl K
          </kbd>
        </label>
      )}

      {/* Dropdown panel — right edge of the input. On phones it portals to
          <body> and anchors to the viewport (see .gs-panel--fixed). */}
      {isPhone && panel ? createPortal(panel, document.body) : panel}
    </div>
  );
}

export default HeaderSearch;

