'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/shared/cn';
import type { Appointment } from '@/lib/types';
import {
  endOfMonth,
  startOfDay,
  stepAnchor,
  toDateKey,
  viewTitle,
  type CalendarView,
} from '../lib/dateUtils';
import { indexByDate, toCalendarEntries } from '../lib/entries';
import CalendarToolbar from './CalendarToolbar';
import MonthView from './views/MonthView';
import YearView from './views/YearView';
import WeekView from './views/WeekView';
import DayView from './views/DayView';
import AgendaView from './views/AgendaView';
import EntryCard from './EntryCard';

/**
 * The calendar shell: view state, navigation, and the selected-day panel.
 *
 * It owns NO data. Appointments are fetched by each portal page and passed in,
 * so nothing here can change what is stored or who may see it — this component
 * only decides how to display what it is handed.
 *
 * The selected-day panel on the right is the original calendar's feature,
 * preserved: clicking a date still lists that day's sessions with their status,
 * coach/student and location, and the message link is unchanged.
 */
export function AppointmentCalendar({
  appointments,
  role,
  className,
  emptySlot,
  /** Footer action, e.g. the existing "Book New Session" button. */
  footerAction,
}: {
  appointments: Appointment[];
  role: 'client' | 'coach';
  className?: string;
  emptySlot?: React.ReactNode;
  footerAction?: React.ReactNode;
}) {
  const [view, setView] = useState<CalendarView>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const entries = useMemo(
    () => toCalendarEntries(appointments, { role }),
    [appointments, role]
  );
  const byDate = useMemo(() => indexByDate(entries), [entries]);

  const title = viewTitle(anchor, view);

  const goToday = useCallback(() => {
    const now = startOfDay(new Date());
    setAnchor(now);
    setSelectedDate(toDateKey(now));
  }, []);

  const step = useCallback(
    (direction: -1 | 1) => {
      setAnchor((current) => stepAnchor(current, view, direction));
    },
    [view]
  );

  const selectDate = useCallback((date: Date) => {
    setAnchor(startOfDay(date));
    setSelectedDate(toDateKey(date));
  }, []);

  /**
   * Switching from the year grid drops straight into the month, and from the
   * agenda into the day, because those are the views whose contents the anchor
   * now narrows to. Month, week and day are already single-scale.
   */
  const changeView = useCallback((next: CalendarView) => {
    setView((current) => {
      if (current === 'year' && next === 'agenda') return next;
      if (next === 'day' && current === 'agenda') return next;
      return next;
    });
  }, []);

  // Keyboard paging, as every desktop calendar supports. Ignored while a
  // control inside the calendar has focus so the switcher keeps its own arrows.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.closest('[role="tablist"]')) return;

      if (event.key === 'PageDown') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        step(-1);
      } else if (event.key === 't' || event.key === 'T') {
        if (target?.tagName === 'BUTTON') return;
        goToday();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, goToday]);

  const selectedEntries = byDate.get(selectedDate) ?? [];
  const selectedDateLabel = new Date(
    Number(selectedDate.slice(0, 4)),
    Number(selectedDate.slice(5, 7)) - 1,
    Number(selectedDate.slice(8, 10))
  );

  const monthCount = useMemo(() => {
    const from = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-01`;
    const last = endOfMonth(anchor);
    const to = toDateKey(last);
    let count = 0;
    for (const list of byDate.values()) {
      for (const entry of list) {
        if (entry.date >= from && entry.date <= to) count += 1;
      }
    }
    return count;
  }, [byDate, anchor]);

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6', className)}>
      <div
        id="calendar-view-panel"
        role="tabpanel"
        aria-label={`${title} calendar`}
        className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[var(--shadow-sm)] lg:col-span-2"
      >
        <CalendarToolbar
          title={title}
          view={view}
          onViewChange={changeView}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToday={goToday}
        />

        {/* A short summary of what is in view, so switching views gives the
            same answer to "is anything scheduled?" without reading the grid. */}
        <p className="border-b border-divider px-4 py-2 text-xs text-muted-foreground sm:px-5">
          {view === 'year'
            ? `${entries.length} session${entries.length === 1 ? '' : 's'} in ${anchor.getFullYear()}`
            : view === 'agenda'
              ? `${monthCount} session${monthCount === 1 ? '' : 's'} in ${anchor.toLocaleDateString(undefined, { month: 'long' })}`
              : selectedEntries.length > 0
                ? `${selectedEntries.length} session${selectedEntries.length === 1 ? '' : 's'} on ${selectedDateLabel.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                : 'No sessions on the selected day'}
        </p>

        <div className="min-h-[26rem]">
          {view === 'year' && (
            <YearView
              anchor={anchor}
              byDate={byDate}
              onSelectMonth={(month) => {
                setAnchor(month);
                setView('month');
              }}
              onSelectDate={selectDate}
            />
          )}
          {view === 'month' && (
            <MonthView
              anchor={anchor}
              byDate={byDate}
              selectedDate={selectedDate}
              onSelectDate={selectDate}
            />
          )}
          {view === 'week' && <WeekView anchor={anchor} byDate={byDate} onSelectDate={selectDate} />}
          {view === 'day' && <DayView anchor={anchor} entries={selectedEntries} />}
          {view === 'agenda' && (
            <AgendaView anchor={anchor} entries={entries} onSelectDate={selectDate} />
          )}
        </div>
      </div>

      {/* Selected day — the original calendar's detail column, retained. */}
      <aside className="flex flex-col rounded-[20px] border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="p-5 sm:p-6">
          <h3 className="flex items-center gap-2 border-b border-divider pb-4 text-base font-bold text-foreground">
            <CalendarGlyph />
            <span className="truncate">
              Schedule for{' '}
              {selectedDateLabel.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </h3>

          <div className="mt-5 space-y-3">
            {selectedEntries.length === 0 ? (
              emptySlot ?? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No coaching appointments for this date.
                </p>
              )
            ) : (
              selectedEntries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
            )}
          </div>
        </div>

        {footerAction && <div className="border-t border-divider p-5 sm:p-6">{footerAction}</div>}
      </aside>
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-accent-text"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export default AppointmentCalendar;