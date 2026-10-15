'use client';

import React, { useMemo } from 'react';
import { cn } from '@/components/shared/cn';
import { statusDotClass } from '../../lib/entries';
import type { DateKeyLookup } from '../../lib/entries';
import {
  WEEKDAY_NARROW,
  isToday,
  monthMatrix,
  toDateKey,
  yearMonths,
} from '../../lib/dateUtils';

/**
 * Twelve mini-months for the anchor year.
 *
 * Each mini-month is a real, navigable grid rather than a number grid: days
 * carry an appointment marker, and the month total is shown in the caption.
 * Clicking a month header jumps straight into that month view; clicking a day
 * jumps to the day view for it.
 */
export function YearView({
  anchor,
  byDate,
  onSelectMonth,
  onSelectDate,
}: {
  anchor: Date;
  byDate: DateKeyLookup;
  onSelectMonth: (date: Date) => void;
  onSelectDate: (date: Date) => void;
}) {
  const months = useMemo(() => yearMonths(anchor), [anchor]);
  const year = anchor.getFullYear();

  // Year totals drive the per-month caption.
  const totals = useMemo(() => {
    const counts = new Array(12).fill(0) as number[];
    for (const [key, list] of byDate) {
      const month = Number(key.slice(5, 7)) - 1;
      const yearOf = Number(key.slice(0, 4));
      if (yearOf === year && month >= 0 && month < 12) counts[month] += list.length;
    }
    return counts;
  }, [byDate, year]);

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month, index) => (
        <section
          key={month.getFullYear() + '-' + index}
          aria-label={month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelectMonth(month)}
              className="min-w-0 cursor-pointer truncate rounded-md px-1 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {month.toLocaleDateString(undefined, { month: 'short' })}
            </button>
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                totals[index] > 0
                  ? 'bg-accent-soft text-accent-text'
                  : 'text-subtle-foreground'
              )}
            >
              {totals[index] || '—'}
            </span>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAY_NARROW.map((label, i) => (
              <span
                key={`${label}-${i}`}
                aria-hidden="true"
                className="text-center text-[9px] font-semibold uppercase text-subtle-foreground"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {monthMatrix(month)
              .flat()
              .map((date, i) => {
                if (!date) return <span key={`pad-${i}`} aria-hidden="true" />;
                const key = toDateKey(date);
                const entries = byDate.get(key);
                const today = isToday(date);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectDate(date)}
                    aria-label={`${date.toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}${entries?.length ? `, ${entries.length} session${entries.length === 1 ? '' : 's'}` : ', no sessions'}`}
                    className={cn(
                      'relative flex h-6 cursor-pointer items-center justify-center rounded text-[10px] tabular-nums transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      today
                        ? 'bg-accent font-extrabold text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {date.getDate()}
                    {entries && entries.length > 0 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute bottom-0.5 h-1 w-1 rounded-full',
                          today ? 'bg-accent-foreground' : statusDotClass(entries[0].status)
                        )}
                      />
                    )}
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default YearView;