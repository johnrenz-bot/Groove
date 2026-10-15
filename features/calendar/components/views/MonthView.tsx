'use client';

import React, { useMemo } from 'react';
import { cn } from '@/components/shared/cn';
import type { CalendarEntry } from '../../lib/entries';
import { statusDotClass } from '../../lib/entries';
import {
  WEEKDAY_SHORT,
  isSameMonth,
  isToday,
  monthMatrix,
  toDateKey,
} from '../../lib/dateUtils';
import type { DateKeyLookup } from '../../lib/entries';

/**
 * Month grid.
 *
 * This is the view the calendar already had, upgraded rather than replaced:
 * the seven-column shape, the Today marker and the per-day status dot all
 * behave exactly as before. Days now also show up to three appointment chips
 * with the session time and counterpart, and a "+N more" affordance appears
 * when a day holds more, so the grid answers "what is on" without a click.
 */
export function MonthView({
  anchor,
  byDate,
  selectedDate,
  onSelectDate,
}: {
  anchor: Date;
  byDate: DateKeyLookup;
  selectedDate: string;
  onSelectDate: (date: Date) => void;
}) {
  const rows = useMemo(() => monthMatrix(anchor), [anchor]);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b border-divider">
        {WEEKDAY_SHORT.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {rows.map((row, rowIndex) =>
          row.map((date, colIndex) => {
            if (!date) return <div key={`pad-${rowIndex}-${colIndex}`} aria-hidden="true" />;

            const key = toDateKey(date);
            const entries = byDate.get(key) ?? [];
            const inMonth = isSameMonth(date, anchor);
            const today = isToday(date);
            const selected = key === selectedDate;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(date)}
                aria-pressed={selected}
                aria-label={`${date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}${entries.length ? `, ${entries.length} session${entries.length === 1 ? '' : 's'}` : ', no sessions'}`}
                className={cn(
                  'group flex min-h-[5.5rem] cursor-pointer flex-col gap-1 border-b border-r border-divider p-1.5 text-left transition sm:min-h-[7rem] sm:p-2',
                  'last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                  inMonth ? 'bg-card' : 'bg-muted/30',
                  selected ? 'bg-accent-soft' : 'hover:bg-muted/60'
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums',
                      today
                        ? 'bg-accent font-extrabold text-accent-foreground'
                        : inMonth
                          ? 'text-foreground'
                          : 'text-subtle-foreground',
                      selected && !today && 'bg-accent/20 text-accent-text'
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {entries.length > 0 && (
                    <span className="hidden items-center gap-1 sm:flex">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          statusDotClass(entries[0].status)
                        )}
                      />
                      <span className="text-[10px] font-semibold tabular-nums text-subtle-foreground">
                        {entries.length}
                      </span>
                    </span>
                  )}
                </span>

                {/* Compact chips: time on the left, counterpart initials after.
                    Hidden on the smallest breakpoint, where the dot above
                    carries the signal instead. */}
                <span className="hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex">
                  {entries.slice(0, 2).map((entry) => (
                    <MonthChip key={entry.id} entry={entry} />
                  ))}
                  {entries.length > 2 && (
                    <span className="truncate text-[10px] font-semibold text-subtle-foreground">
                      +{entries.length - 2} more
                    </span>
                  )}
                </span>

                {entries.length > 0 && (
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {entries.slice(0, 3).map((entry) => (
                      <span
                        key={entry.id}
                        aria-hidden="true"
                        className={cn('h-1 w-1 rounded-full', statusDotClass(entry.status))}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function MonthChip({ entry }: { entry: CalendarEntry }) {
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-md border-l-2 bg-muted/70 px-1.5 py-0.5 text-[10px] leading-tight',
        entry.status === 'declined' || entry.status === 'cancelled'
          ? 'border-muted-foreground/40 opacity-70'
          : 'border-accent/70'
      )}
    >
      <span className="shrink-0 tabular-nums text-accent-text">
        {entry.startMinutes === null ? '--:--' : formatShortTime(entry.startMinutes)}
      </span>
      <span className="min-w-0 truncate text-muted-foreground">
        {shortLabel(entry)}
      </span>
    </span>
  );
}

function formatShortTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'p' : 'a';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** Drops the role prefix so the chip reads as a name, not a sentence. */
function shortLabel(entry: CalendarEntry): string {
  return entry.counterpartLabel.replace(/^(Coach|Student)\s+/, '');
}

export default MonthView;