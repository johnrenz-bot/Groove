'use client';

import React, { useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import {
  CALENDAR_VIEWS,
  VIEW_LABELS,
  type CalendarView,
} from '../lib/dateUtils';

/**
 * Toolbar above the calendar: the range label, date navigation, and the view
 * switcher.
 *
 * The prev/next step depends on the active view — a year view steps twelve
 * months, a week view steps seven days — so the buttons always do what the
 * heading beneath them suggests.
 *
 * The switcher follows the ARIA tabs pattern: arrow keys move between views,
 * Home/End jump to the ends, and only the selected tab is in the tab order.
 */
export function CalendarToolbar({
  title,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  className,
}: {
  title: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
}) {
  const tabsRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const index = CALENDAR_VIEWS.indexOf(view);
      let nextIndex: number | null = null;

      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (index + 1) % CALENDAR_VIEWS.length;
          break;
        case 'ArrowLeft':
          nextIndex = (index - 1 + CALENDAR_VIEWS.length) % CALENDAR_VIEWS.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = CALENDAR_VIEWS.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextView = CALENDAR_VIEWS[nextIndex];
      onViewChange(nextView);
      // Move focus with the selection, as the tabs pattern requires.
      requestAnimationFrame(() => {
        tabsRef.current
          ?.querySelector<HTMLButtonElement>(`[data-view="${nextView}"]`)
          ?.focus();
      });
    },
    [view, onViewChange]
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-divider p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          Today
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            aria-label={`Previous ${VIEW_LABELS[view].toLowerCase()}`}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={`Next ${VIEW_LABELS[view].toLowerCase()}`}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Announced so a screen-reader user hears the range change too. */}
        <h2 className="sr-only" aria-live="polite" aria-atomic="true">
          {title}
        </h2>
      </div>

      <h2
        aria-hidden="true"
        className="order-first min-w-0 truncate text-lg font-bold tracking-[-0.01em] text-foreground sm:order-none sm:text-left"
      >
        {title}
      </h2>

      <div
        ref={tabsRef}
        role="tablist"
        aria-label="Calendar view"
        onKeyDown={onKeyDown}
        className="flex shrink-0 gap-1 overflow-x-auto rounded-full border border-border bg-muted/60 p-1"
      >
        {CALENDAR_VIEWS.map((option) => {
          const selected = option === view;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              data-view={option}
              aria-selected={selected}
              aria-controls="calendar-view-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => onViewChange(option)}
              className={cn(
                'cursor-pointer whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                selected
                  ? 'bg-accent text-accent-foreground shadow-[var(--shadow-sm)]'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              )}
            >
              {VIEW_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarToolbar;