'use client';

/**
 * HeaderSearch - the ONLY search surface in the application.
 *
 * A compact input lives directly in the header. Results appear in a light,
 * anchored suggestion panel immediately below it - no modal, no portal, no
 * second search anywhere else. The data hook is unchanged: pages and nav
 * destinations come from the role config, people from /api/users, and recent
 * searches from local storage. Keyboard navigation and permissions are kept.
 */

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';

import type { AppHeaderConfig } from '@/components/header/appHeaderConfig';
import type { NavRole } from '@/components/header/navConfig';
import { dashboardLanguage, translateIn, useLanguage } from '@/lib/i18n/LanguageProvider';
import { useGlobalSearch } from './useGlobalSearch';
import { SearchResultsList } from './SearchResultsList';

export interface HeaderSearchProps {
  config: AppHeaderConfig;
  role: NavRole;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  suspended?: boolean;
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
  const listId = `gs-suggestions-${variant}`;
  const [expanded, setExpanded] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const close = React.useCallback(() => {
    clearQuery();
    onOpenChange(false);
    setExpanded(false);
  }, [clearQuery, onOpenChange]);

  // Route changes wipe the query and collapse the field. This runs in an
  // effect, never during render, so it cannot set state on another component
  // while React is rendering this one.
  const previousPathRef = useRef(pathname);
  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      clearQuery();
      onOpenChange(false);
      setExpanded(false);
    }
    // clearQuery/onOpenChange are intentionally not dependencies: only a real
    // pathname change should reset the field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Only collapse OUR surface when another one takes over; the parent owns a
  // single overlay enum and calling onOpenChange(false) unconditionally would
  // also close the drawer or account menu that just opened.
  useEffect(() => {
    if (suspended && open) onOpenChange(false);
  }, [suspended, open, onOpenChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      event.currentTarget.blur();
      return;
    }
    onKeyDown(event);
  };

  const activeRow = rows[activeIndex];
  const showInput = expanded || !isPhone;

  return (
    <div
      ref={wrapperRef}
      className="gs-inline"
      data-open={open || undefined}
      data-expanded={expanded || undefined}
    >
      {!showInput && (
        <button
          type="button"
          className="gs-inline-toggle"
          aria-label={t('search.openLabel', 'Search pages and people')}
          aria-keyshortcuts="Control+K Meta+K"
          onClick={() => {
            setExpanded(true);
            onOpenChange(true);
            window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
          }}
        >
          <Search aria-hidden="true" />
        </button>
      )}

      {showInput && (
        <div className="gs-inline-field">
          <Search className="gs-inline-icon" aria-hidden="true" />
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
            placeholder={t('search.placeholder', 'Search pages, people, and more...')}
            className="gs-inline-input"
            value={search.query}
            onChange={(event) => {
              search.setQuery(event.target.value);
              if (!open) onOpenChange(true);
            }}
            onFocus={() => {
              setExpanded(true);
              onOpenChange(true);
            }}
            onKeyDown={handleInputKeyDown}
          />
          {search.query ? (
            <button
              type="button"
              className="gs-inline-clear"
              aria-label="Clear search"
              onClick={() => {
                clearQuery();
                inputRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </button>
          ) : (
            <kbd className="gs-inline-kbd" aria-hidden="true">Ctrl K</kbd>
          )}
        </div>
      )}

      {open && (
        <div className="gs-suggestions" role="presentation">
          <SearchResultsList
            listId={listId}
            rows={rows}
            activeIndex={search.activeIndex}
            onHover={setActiveIndex}
            onSelect={(row) => {
              search.activateRow(row);
              if (row.kind !== 'recent') close();
            }}
            status={search.status}
            error={search.error}
            onRetry={search.retry}
            query={search.query}
            optionId={optionId}
            ariaLabel={t('search.resultsLabel', 'Search results')}
          />
          <div className="gs-suggestions-foot" aria-hidden="true">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>Esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeaderSearch;
