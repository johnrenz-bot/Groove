'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { SafeImage } from '@/features/dance/components/SafeImage';

/**
 * The minimum a card needs to render in the shared roster selector. All four
 * discipline data files already carry these fields, so the wrappers only need
 * to map their own record type onto this shape.
 */
export interface FeaturedRosterItem {
  id: string;
  name: string;
  country: string;
  flag: string;
  division: string;
  image?: { url: string | null; alt?: string } | null;
  logo?: { url: string | null; verified?: boolean } | null;
}

export interface FeaturedRosterSelectorProps {
  items: FeaturedRosterItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** DOM id prefix: `crew` produces `crew-tab-*` / `crew-panel-*`. */
  idPrefix: string;
  /** Small line above the rail, e.g. "Select a crew". */
  label: string;
  tablistLabel: string;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Photo-led horizontal card selector shared by the four performing-arts pages.
 *
 * It is intentionally a real `tablist`: arrow keys move focus, Home/End jump to
 * the ends, and each card controls the dossier panel below it. The rail is
 * snap-scrolling on touch and has quiet arrow buttons on desktop.
 */
export function FeaturedRosterSelector({
  items,
  selectedId,
  onSelect,
  idPrefix,
  label,
  tablistLabel,
  className,
}: FeaturedRosterSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedChip = chipsRef.current?.querySelector('[aria-selected="true"]');
    selectedChip?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selectedId]);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex = index;

      if (event.key === 'ArrowRight') {
        nextIndex = Math.min(index + 1, items.length - 1);
      } else if (event.key === 'ArrowLeft') {
        nextIndex = Math.max(index - 1, 0);
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(items[index].id);
        return;
      } else {
        return;
      }

      event.preventDefault();
      const nextTab = chipsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex];
      nextTab?.focus();
    },
    [items, onSelect]
  );

  const arrowClass =
    'rounded-full border border-[color:var(--crew-border)] bg-[var(--crew-bg-tile)] p-2 text-[var(--crew-text-muted)] transition-colors hover:border-[color:var(--crew-border-hover)] hover:bg-[var(--crew-bg-hover)] hover:text-[var(--crew-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]';

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--crew-text-muted)]">
          {label}
          <span className="ml-1.5 text-[var(--crew-accent-gold)]">({items.length})</span>
        </p>

        <div className="hidden items-center gap-2 md:flex">
          <button type="button" onClick={scrollLeft} aria-label="Scroll roster left" className={arrowClass}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={scrollRight} aria-label="Scroll roster right" className={arrowClass}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="relative">
        <div
          className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-10 bg-gradient-to-r from-[var(--crew-bg-page)] to-transparent sm:w-16"
          aria-hidden="true"
        />

        <div
          ref={chipsRef}
          role="tablist"
          aria-label={tablistLabel}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 pt-1"
        >
          {items.map((item, index) => {
            const isSelected = item.id === selectedId;
            const initials = getInitials(item.name);
            const division = item.division.split('&')[0]?.trim();
            const imageUrl = item.image?.url ?? null;
            const logoUrl =
              item.logo?.verified && item.logo.url ? item.logo.url : null;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`${idPrefix}-panel-${item.id}`}
                id={`${idPrefix}-tab-${item.id}`}
                onClick={() => onSelect(item.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  'group relative w-[152px] shrink-0 snap-start overflow-hidden rounded-2xl border bg-[var(--crew-bg-tile)] text-left transition-all duration-300 sm:w-[172px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]',
                  isSelected
                    ? 'border-[color:var(--crew-accent-gold)] shadow-[0_16px_36px_-20px_rgba(0,0,0,0.9)]'
                    : 'border-[color:var(--crew-border)] hover:-translate-y-0.5 hover:border-[color:var(--crew-border-hover)]'
                )}
              >
                <span className="relative block h-[104px] w-full overflow-hidden bg-[var(--crew-bg-row)]">
                  {imageUrl ? (
                    <SafeImage
                      src={imageUrl}
                      alt=""
                      sizes="172px"
                      className={cn(
                        'object-cover object-center transition-transform duration-500',
                        isSelected ? 'scale-[1.04]' : 'group-hover:scale-105'
                      )}
                      fallback={
                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--crew-bg-hover)] via-[var(--crew-bg-tile)] to-[var(--crew-bg-card)] text-xl font-black tracking-tight text-[var(--crew-accent-gold)]">
                          {initials}
                        </span>
                      }
                    />
                  ) : logoUrl ? (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--crew-bg-hover)] via-[var(--crew-bg-tile)] to-[var(--crew-bg-card)] p-5">
                      {/* Small decorative marks may be plain <img>: there is no
                          layout to shift, and SafeImage would add a second box. */}
                      <img
                        src={logoUrl}
                        alt=""
                        className="max-h-14 w-auto max-w-[112px] object-contain drop-shadow"
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--crew-bg-hover)] via-[var(--crew-bg-tile)] to-[var(--crew-bg-card)] text-xl font-black tracking-tight text-[var(--crew-accent-gold)]">
                      {initials}
                    </span>
                  )}

                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10"
                    aria-hidden="true"
                  />

                  <span className="absolute bottom-2 left-2.5 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-white/85">
                    <span aria-hidden="true">{item.flag}</span>
                    <span className="max-w-[110px] truncate">{item.country}</span>
                  </span>

                  {isSelected && (
                    <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--crew-accent-gold)] text-[var(--crew-on-gold)] shadow-sm">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </span>

                <span className="block px-2.5 py-2.5">
                  <span
                    className={cn(
                      'block truncate text-[11px] font-semibold leading-snug transition-colors',
                      isSelected
                        ? 'text-[var(--crew-accent-gold)]'
                        : 'text-[var(--crew-text-primary)] group-hover:text-[var(--crew-accent-gold)]'
                    )}
                  >
                    {item.name}
                  </span>
                  {division && (
                    <span className="mt-0.5 block truncate text-[9px] font-medium uppercase tracking-wider text-[var(--crew-text-muted)]">
                      {division}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-10 bg-gradient-to-l from-[var(--crew-bg-page)] to-transparent sm:w-16"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default FeaturedRosterSelector;
