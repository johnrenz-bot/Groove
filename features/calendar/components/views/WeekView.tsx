'use client';

import React, { useMemo } from 'react';
import { cn } from '@/components/shared/cn';
import { statusBarClass } from '../../lib/entries';
import type { CalendarEntry } from '../../lib/entries';
import {
  WEEKDAY_SHORT,
  blockHeight,
  blockTop,
  formatHourLabel,
  formatMinutes,
  hourWindow,
  isToday,
  toDateKey,
  weekDates,
} from '../../lib/dateUtils';

/**
 * Week view: one column per day, positioned by time of day.
 *
 * Because appointment times vary, this uses a proportional time grid rather
 * than a fixed row per hour: each block's top and height are the fraction of the
 * visible window that its start and end occupy. The visible window itself is
 * derived from the appointments present, so there is no dead space above the
 * first session or below the last.
 */
export function WeekView({
  anchor,
  byDate,
  onSelectDate,
}: {
  anchor: Date;
  byDate: Map<string, CalendarEntry[]>;
  onSelectDate: (date: Date) => void;
}) {
  const days = useMemo(() => weekDates(anchor), [anchor]);
  const allEntries = useMemo(
    () => days.flatMap((day) => byDate.get(toDateKey(day)) ?? []),
    [days, byDate]
  );
  const { start: startHour, end: endHour } = useMemo(
    () => hourWindow(allEntries.map((e) => ({ start: e.startMinutes, end: e.endMinutes }))),
    [allEntries]
  );
  const span = endHour - startHour;
  const hours = Array.from({ length: span }, (_, i) => startHour + i);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b border-divider">
        {days.map((day) => (
          <button
            key={toDateKey(day)}
            type="button"
            onClick={() => onSelectDate(day)}
            className={cn(
              'cursor-pointer px-1 py-2 text-center transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              isToday(day) && 'bg-accent-soft'
            )}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {WEEKDAY_SHORT[day.getDay()]}
            </span>
            <span
              className={cn(
                'mx-auto mt-0.5 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full text-sm font-bold tabular-nums',
                isToday(day) ? 'bg-accent text-accent-foreground' : 'text-foreground'
              )}
            >
              {day.getDate()}
            </span>
          </button>
        ))}
      </div>

      <div className="relative flex">
        <div className="w-16 shrink-0 border-r border-divider">
          {hours.map((hour) => (
            <div key={hour} className="relative h-14 border-b border-divider/60">
              <span className="absolute -top-1.5 right-1.5 whitespace-nowrap text-[10px] tabular-nums text-subtle-foreground">
                {formatHourLabel(hour * 60)}
              </span>
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7">
          {days.map((day) => {
            const key = toDateKey(day);
            const entries = byDate.get(key) ?? [];
            return (
              <div
                key={key}
                className={cn(
                  'relative border-r border-divider/60 last:border-r-0',
                  isToday(day) && 'bg-accent-soft/30'
                )}
              >
                {hours.map((hour) => (
                  <div key={hour} className="h-14 border-b border-divider/60" />
                ))}

                {/* Now-line, only on today's column. */}
                {isToday(day) && <NowLine startHour={startHour} span={span} />}

                {entries.map((entry) => (
                  <WeekBlock
                    key={entry.id}
                    entry={entry}
                    startHour={startHour}
                    span={span}
                    onSelectDate={onSelectDate}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekBlock({
  entry,
  startHour,
  span,
  onSelectDate,
}: {
  entry: CalendarEntry;
  startHour: number;
  span: number;
  onSelectDate: (date: Date) => void;
}) {
  if (entry.startMinutes === null) {
    // An entry with no usable time still belongs in the week — park it at the
    // top of the column rather than dropping it.
    return (
      <button
        type="button"
        onClick={() => onSelectDate(new Date(entry.date))}
        className={cn(
          'absolute inset-x-1 top-1 z-10 cursor-pointer rounded-lg border-l-2 p-1.5 text-left transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          statusBarClass(entry.status)
        )}
        title={entry.counterpartLabel}
      >
        <span className="block truncate text-[10px] font-semibold text-foreground">
          {entry.counterpartLabel.replace(/^(Coach|Student)\s+/, '')}
        </span>
      </button>
    );
  }

  const from = entry.startMinutes;
  const to = entry.endMinutes ?? from + 60;
  const top = blockTop(from, startHour, span);
  const height = blockHeight(from, to, startHour, span, 2.75);

  return (
    <button
      type="button"
      onClick={() => onSelectDate(new Date(entry.date))}
      title={`${entry.timeLabel} · ${entry.counterpartLabel} · ${entry.status}`}
      className={cn(
        'absolute inset-x-1 z-10 cursor-pointer overflow-hidden rounded-lg border-l-2 p-1.5 text-left transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        statusBarClass(entry.status)
      )}
      style={{ top, height }}
    >
      <span className="block truncate text-[10px] font-semibold text-foreground">
        {entry.counterpartLabel.replace(/^(Coach|Student)\s+/, '')}
      </span>
      <span className="block truncate text-[9px] tabular-nums text-muted-foreground">
        {formatMinutes(from)}
      </span>
    </button>
  );
}

function NowLine({ startHour, span }: { startHour: number; span: number }) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = blockTop(minutes, startHour, span);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-20" style={{ top }}>
      <div className="relative h-px bg-danger">
        <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-danger" />
      </div>
    </div>
  );
}

export default WeekView;