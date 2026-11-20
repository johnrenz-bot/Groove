'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOCATION_OPTIONS } from './types';

/**
 * Location combobox — searchable list of Bulacan cities/areas.
 * Keyboard navigable (↑↓ to move, Enter to select, Esc to close), dark
 * themed, icon per row, check on the current selection.
 */
export function LocationMenu({
  value,
  onChange,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  const autoId = useId();
  const buttonId = id ?? `location-trigger-${autoId}`;
  const listboxId = `location-listbox-${autoId}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = LOCATION_OPTIONS.find((o) => o.id === value) ?? LOCATION_OPTIONS[0];

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlight(0);
  }, []);

  const filtered = LOCATION_OPTIONS.filter((o) =>
    o.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  // Outside click closes.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  // Focus the search on open; highlight resets via the trigger click handler.
  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const commit = (option: { id: string }) => {
    onChange(option.id);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (event.key === 'Enter' && filtered[highlight]) {
      event.preventDefault();
      commit(filtered[highlight]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            const idx = LOCATION_OPTIONS.findIndex((o) => o.id === value);
            setHighlight(idx >= 0 ? idx : 0);
          } else {
            setQuery('');
            setHighlight(0);
          }
        }}
        className={cn(
          'inline-flex h-11 w-full cursor-pointer items-center gap-2 rounded-[14px] border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          value === 'All'
            ? 'border-divider bg-muted text-foreground hover:border-border'
            : 'border-accent/40 bg-accent-soft/15 text-foreground'
        )}
      >
        <MapPin className="h-4 w-4 shrink-0 stroke-[1.5] text-accent-text" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{selected.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Filter by location"
          id={listboxId}
          className="absolute left-0 z-30 mt-2 w-[280px] overflow-hidden rounded-2xl border border-divider bg-muted shadow-[var(--shadow-lg)]"
        >
          <label className="sr-only" htmlFor={`${buttonId}-search`}>
            Search locations
          </label>
          <div className="flex items-center gap-2 border-b border-divider px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id={`${buttonId}-search`}
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search area…"
              className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
              aria-activedescendant={`${buttonId}-option-${highlight}`}
            />
          </div>
          <ul role="presentation" className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                No areas match “{query}”
              </li>
            ) : (
              filtered.map((option, index) => {
                const selectedRow = option.id === value;
                const active = index === highlight;
                return (
                  <li
                    key={option.id}
                    id={`${buttonId}-option-${index}`}
                    role="option"
                    aria-selected={selectedRow}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] transition-colors',
                      active ? 'bg-accent-soft text-foreground' : 'text-muted-foreground',
                      selectedRow && 'text-foreground'
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => commit(option)}
                  >
                    <MapPin className="h-4 w-4 shrink-0 stroke-[1.5] text-accent-text" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {selectedRow && (
                      <Check className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LocationMenu;

