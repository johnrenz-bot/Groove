'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '@/lib/types';
import { cn } from '@/components/shared/cn';
import {
  clientBusyWindowsForDate,
  dayAvailability,
  formatBookingDate,
  type DayAvailability,
} from '../services/bookingTime';

const POPOVER_WIDTH = 340;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

const STATUS_LABEL: Record<DayAvailability, string> = {
  available: 'available',
  past: 'past date',
  notice: "inside the coach's notice period",
  unavailable: 'no available start times',
};

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date | null {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function fullDateLabel(value: string): string {
  const date = parseDateValue(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface CalendarCell {
  value: string;
  day: number;
  status: DayAvailability;
}

export interface BookingCalendarProps {
  /** `YYYY-MM-DD`, the value written to `appointments.date`. */
  value: string;
  onChange: (value: string) => void;
  nowMs: number;
  earliestMs: number;
  durationMinutes: number;
  /** Only the viewer's own bookings are readable, so only these can be checked. */
  ownAppointments: readonly Appointment[];
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  noticeLabel?: string;
}

/**
 * A compact month calendar for the booking modal.
 *
 * The trigger looks like a normal field; the month grid is portalled to
 * `document.body` so the modal body's scroll container cannot clip it. It is a
 * date PICKER, not an availability promise: a day is only selectable when
 * `dayAvailability` proves at least one start time survives the same rules as
 * the time grid (notice period, past times, and the client's own bookings).
 */
export function BookingCalendar({
  value,
  onChange,
  nowMs,
  earliestMs,
  durationMinutes,
  ownAppointments,
  disabled = false,
  invalid = false,
  describedBy,
  noticeLabel,
}: BookingCalendarProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: POPOVER_WIDTH });

  const selectedDate = parseDateValue(value);
  const [view, setView] = useState(() => {
    const base = selectedDate ?? new Date(nowMs);
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const currentMonth = new Date(nowMs);
  const canGoPrevious =
    view.year > currentMonth.getFullYear() ||
    (view.year === currentMonth.getFullYear() && view.month > currentMonth.getMonth());

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, Math.max(260, window.innerWidth - 24));
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    left = Math.max(12, left);

    const height = popoverRef.current?.offsetHeight ?? 380;
    const below = rect.bottom + 8;
    const above = rect.top - height - 8;
    const top = below + height > window.innerHeight - 8 && above >= 8 ? above : below;

    setPosition({ left, top, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place, view]);

  useEffect(() => {
    if (!open) return;

    const onScroll = () => place();
    const onResize = () => place();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const selected = popoverRef.current?.querySelector<HTMLElement>(
        '[data-day-state="selected"]:not([disabled])'
      );
      const firstAvailable = popoverRef.current?.querySelector<HTMLElement>(
        '[data-day-state="available"]:not([disabled])'
      );
      (selected ?? firstAvailable)?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, view]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(view.year, view.month, 1);
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells: Array<CalendarCell | null> = Array.from(
      { length: firstOfMonth.getDay() },
      () => null
    );

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(view.year, view.month, day);
      const dateValue = localDateValue(date);
      const busy = clientBusyWindowsForDate(ownAppointments, dateValue);
      cells.push({
        value: dateValue,
        day,
        status: dayAvailability({
          date: dateValue,
          durationMinutes,
          nowMs,
          earliestMs,
          busy,
        }),
      });
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [durationMinutes, earliestMs, nowMs, ownAppointments, view]);

  const weeks = useMemo(() => {
    const chunks: Array<Array<CalendarCell | null>> = [];
    for (let index = 0; index < days.length; index += 7) {
      chunks.push(days.slice(index, index + 7));
    }
    return chunks;
  }, [days]);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const todayValue = localDateValue(new Date(nowMs));

  const shiftMonth = (delta: number) => {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const openCalendar = () => {
    if (disabled) return;
    const base = parseDateValue(value) ?? new Date(nowMs);
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setOpen(true);
  };

  const closeCalendar = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const chooseDate = (nextValue: string) => {
    if (nextValue !== value) onChange(nextValue);
    closeCalendar();
  };

  const handlePopoverKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeCalendar();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = popoverRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled])'
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-invalid={invalid || undefined}
        data-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={`Session date: ${fullDateLabel(value)}. Choose a date.`}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        className={cn(
          'g-input flex h-11 w-full cursor-pointer items-center justify-between gap-2 text-left',
          invalid && 'border-danger',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays
            className="h-4 w-4 shrink-0 text-accent-text"
            aria-hidden="true"
          />
          <span className="truncate text-sm font-semibold text-foreground">
            {formatBookingDate(value)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label="Choose a session date"
            style={{
              position: 'fixed',
              left: position.left,
              top: position.top,
              width: position.width,
            }}
            onKeyDown={handlePopoverKeyDown}
            className="z-[120] rounded-2xl border border-accent-border bg-card p-3.5 text-foreground shadow-[var(--shadow-lg)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!canGoPrevious}
                aria-label="Previous month"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <p aria-live="polite" className="text-sm font-bold text-foreground">
                {monthLabel}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div role="grid" aria-label={`${monthLabel} availability`}>
              <div role="row" className="grid grid-cols-7">
                {WEEKDAYS.map((weekday) => (
                  <span
                    key={weekday}
                    role="columnheader"
                    className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {weekday}
                  </span>
                ))}
              </div>

              {weeks.map((week, weekIndex) => (
                <div role="row" key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                  {week.map((cell, cellIndex) => {
                    if (!cell) {
                      return (
                        <span
                          key={`empty-${weekIndex}-${cellIndex}`}
                          aria-hidden="true"
                          className="h-9"
                        />
                      );
                    }

                    const selected = cell.value === value;
                    const selectable = cell.status === 'available';
                    const today = cell.value === todayValue;

                    return (
                      <button
                        key={cell.value}
                        type="button"
                        role="gridcell"
                        disabled={!selectable}
                        aria-selected={selected}
                        aria-current={today ? 'date' : undefined}
                        data-day-state={selected ? 'selected' : cell.status}
                        aria-label={`${fullDateLabel(cell.value)} — ${
                          selected ? 'selected, ' : ''
                        }${STATUS_LABEL[cell.status]}${today ? ', today' : ''}`}
                        onClick={() => chooseDate(cell.value)}
                        className={cn(
                          'flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          selected
                            ? 'bg-accent text-accent-foreground shadow-[var(--shadow-sm)]'
                            : cell.status === 'available'
                              ? 'cursor-pointer text-foreground hover:bg-muted'
                              : cell.status === 'notice'
                                ? 'cursor-not-allowed border border-dashed border-border text-subtle-foreground/60'
                                : cell.status === 'past'
                                  ? 'cursor-not-allowed text-subtle-foreground/45 line-through'
                                  : 'cursor-not-allowed bg-muted/30 text-subtle-foreground/55 line-through',
                          today && !selected && 'ring-1 ring-border-strong/50'
                        )}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-divider pt-2.5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" aria-hidden="true" />
                Selected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-[3px] border border-border"
                  aria-hidden="true"
                />
                Available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-border"
                  aria-hidden="true"
                />
                Notice
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-muted" aria-hidden="true" />
                Unavailable
              </span>
            </div>

            {noticeLabel ? (
              <p className="mt-2 text-[10px] leading-relaxed text-subtle-foreground">
                This coach needs {noticeLabel} notice. Your request still needs the coach&apos;s
                confirmation.
              </p>
            ) : (
              <p className="mt-2 text-[10px] leading-relaxed text-subtle-foreground">
                Times are requests until the coach confirms the final slot.
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default BookingCalendar;
