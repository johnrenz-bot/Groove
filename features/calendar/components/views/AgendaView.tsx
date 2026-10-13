'use client';

import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { EmptyState } from '@/components/shared/EmptyState';
import type { CalendarEntry } from '../../lib/entries';
import {
  endOfMonth,
  fromDateKey,
  startOfMonth,
  toDateKey,
} from '../../lib/dateUtils';
import EntryCard from '../EntryCard';

/**
 * Agenda view: a chronological list, grouped by day.
 *
 * Scoped to the anchor month and divided into "Upcoming" and "Earlier" so the
 * most actionable sessions are always at the top without hiding what already
 * happened. Within each day, sessions are ordered by start time.
 */
export function AgendaView({
  anchor,
  entries,
  onSelectDate,
}: {
  anchor: Date;
  entries: CalendarEntry[];
  onSelectDate: (date: Date) => void;
}) {
  const todayKey = toDateKey(new Date());

  const grouped = useMemo(() => {
    const from = startOfMonth(anchor);
    const to = endOfMonth(anchor);
    const fromKey = toDateKey(from);
    const toKey = toDateKey(to);

    const buckets = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      if (entry.date < fromKey || entry.date > toKey) continue;
      const list = buckets.get(entry.date);
      if (list) list.push(entry);
      else buckets.set(entry.date, [entry]);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [anchor, entries]);

  const upcoming = grouped.filter(([key]) => key >= todayKey);
  const earlier = grouped.filter(([key]) => key < todayKey);

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-5 w-5" />}
        title="No sessions this month"
        description="Nothing is scheduled in the selected month. Use the arrows to move between months."
      />
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <Section
        title="Upcoming"
        grouped={upcoming}
        todayKey={todayKey}
        onSelectDate={onSelectDate}
      />
      {earlier.length > 0 && (
        <Section
          title="Earlier this month"
          grouped={earlier}
          todayKey={todayKey}
          onSelectDate={onSelectDate}
        />
      )}
    </div>
  );
}

function Section({
  title,
  grouped,
  todayKey,
  onSelectDate,
}: {
  title: string;
  grouped: [string, CalendarEntry[]][];
  todayKey: string;
  onSelectDate: (date: Date) => void;
}) {
  if (grouped.length === 0) return null;

  return (
    <section aria-label={title}>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-4">
        {grouped.map(([key, list]) => {
          const date = fromDateKey(key);
          const isToday = key === todayKey;
          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                className={cn(
                  'mb-2 flex w-full cursor-pointer items-baseline gap-2 rounded-md text-left transition hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isToday ? 'text-accent-text' : 'text-foreground'
                )}
              >
                <span className="text-sm font-bold tracking-[-0.01em]">
                  {date.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {isToday && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-text">
                    Today
                  </span>
                )}
                <span className="ml-auto text-xs text-subtle-foreground">
                  {list.length} session{list.length === 1 ? '' : 's'}
                </span>
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    dateLabel={date.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AgendaView;