'use client';

import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { EmptyState } from '@/components/shared/EmptyState';
import { statusBarClass } from '../../lib/entries';
import type { CalendarEntry } from '../../lib/entries';
import {
  WEEKDAY_SHORT,
  blockHeight,
  blockTop,
  formatHourLabel,
  hourWindow,
  toDateKey,
} from '../../lib/dateUtils';

/**
 * Day view: a single column, positioned by time of day.
 *
 * Shares the hour-window maths and block positioning with the week view, so a
 * session that sits at 14:00 appears at exactly the same height in both — a
 * user switching views never has to re-learn where things are.
 */
export function DayView({ anchor, entries }: { anchor: Date; entries: CalendarEntry[] }) {
  const dayKey = toDateKey(anchor);

  const { start: startHour, end: endHour } = useMemo(
    () => hourWindow(entries.map((e) => ({ start: e.startMinutes, end: e.endMinutes }))),
    [entries]
  );
  const span = endHour - startHour;
  const hours = Array.from({ length: span }, (_, i) => startHour + i);

  const now = new Date();
  const isToday = dayKey === toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3 border-b border-divider px-4 py-3 sm:px-5">
        <span className="text-2xl font-bold tabular-nums text-foreground">{anchor.getDate()}</span>
        <span className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {WEEKDAY_SHORT[anchor.getDay()]}
        </span>
        <span className="ml-auto text-xs text-subtle-foreground">
          {entries.length > 0
            ? `${entries.length} session${entries.length === 1 ? '' : 's'}`
            : 'No sessions'}
        </span>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          compact
          icon={<CalendarDays className="h-5 w-5" />}
          title="Nothing scheduled"
          description="No sessions on this day. Use the arrows to move to another date."
        />
      ) : (
        <div className="relative flex">
          <div className="w-16 shrink-0 border-r border-divider">
            {hours.map((hour) => (
              <div key={hour} className="relative h-20 border-b border-divider/60">
                <span className="absolute -top-1.5 right-1.5 whitespace-nowrap text-[10px] tabular-nums text-subtle-foreground">
                  {formatHourLabel(hour * 60)}
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex-1">
            {hours.map((hour) => (
              <div key={hour} className="h-20 border-b border-divider/60" />
            ))}

            {isToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 z-20"
                style={{ top: blockTop(nowMinutes, startHour, span) }}
              >
                <div className="relative h-px bg-danger">
                  <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-danger" />
                </div>
              </div>
            )}

            {entries.map((entry) =>
              entry.startMinutes === null ? (
                <div
                  key={entry.id}
                  className={cn(
                    'absolute inset-x-2 top-2 rounded-xl border border-l-2 p-3',
                    statusBarClass(entry.status)
                  )}
                >
                  <p className="text-sm font-bold text-foreground">{entry.counterpartLabel}</p>
                  <p className="text-xs text-muted-foreground">{entry.timeLabel}</p>
                </div>
              ) : (
                <DayBlock key={entry.id} entry={entry} startHour={startHour} span={span} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayBlock({
  entry,
  startHour,
  span,
}: {
  entry: CalendarEntry;
  startHour: number;
  span: number;
}) {
  const from = entry.startMinutes!;
  const to = entry.endMinutes ?? from + 60;
  const top = blockTop(from, startHour, span);
  // A one-hour session on a long day is a thin strip, so the block is floored at
  // a height that fits two lines. Only the counterpart and the time are shown
  // here; the full detail lives in the side panel and the agenda, so nothing is
  // lost and the text can never be clipped mid-word.
  const height = blockHeight(from, to, startHour, span, 3.75);

  return (
    <div
      className={cn(
        'absolute inset-x-2 z-10 overflow-hidden rounded-xl border border-l-2 p-2.5',
        statusBarClass(entry.status)
      )}
      style={{ top, height }}
    >
      <p className="truncate text-[13px] font-bold leading-tight text-foreground">
        {entry.counterpartLabel}
      </p>
      <p className="truncate text-[11px] leading-tight tabular-nums text-muted-foreground">
        {entry.timeLabel}
        {entry.duration ? ` · ${entry.duration}` : ''}
      </p>
    </div>
  );
}

export default DayView;