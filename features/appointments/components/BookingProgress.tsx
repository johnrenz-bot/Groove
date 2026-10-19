'use client';

import { Check, Clock, History, Loader2 } from 'lucide-react';
import {
  buildTimeline,
  historyFromEvents,
  statusMeta,
  type AppointmentStatus,
  type BookingEvent,
} from '../services/bookingStatus';
import { cn } from '@/components/shared/cn';
import { formatDateTime } from '@/lib/utils';

/**
 * Progress and history for one booking.
 *
 * TWO SOURCES, TWO JOBS
 *   The TIMELINE is built from the booking's own lifecycle `*_at` columns, so it
 *   shows where the booking is and how far it has to go. The HISTORY is built
 *   from `booking_events`, the append-only audit trail written only by the
 *   SECURITY DEFINER trigger — so it is a record of what the database actually
 *   did, including which account did it and any cancellation note.
 *
 *   They are separate because they answer different questions and can legitimately
 *   disagree in length: a booking created before the audit trigger existed has
 *   timestamps but no events, and the timeline must still render.
 */
export function BookingProgress({
  status,
  stamps,
  events = [],
  /** id -> display name, for "who moved this". */
  names = {},
  loading = false,
  className,
}: {
  status: string | null | undefined;
  stamps: Partial<Record<AppointmentStatus, string | null>>;
  events?: readonly BookingEvent[];
  names?: Readonly<Record<string, string>>;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Loading booking history…
      </div>
    );
  }

  const steps = buildTimeline(status, stamps);
  const history = historyFromEvents(events, names);
  const meta = statusMeta(status);

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Progress ── */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Progress
        </p>
        {/* ol, not a div: this is a sequence and a screen reader should say so. */}
        <ol className="flex flex-wrap gap-x-1 gap-y-2">
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <li key={step.status} className="flex items-center gap-1">
                <span
                  aria-current={step.current ? 'step' : undefined}
                  className={cn(
                    'inline-flex min-h-[26px] items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                    step.current
                      ? 'border-accent-border bg-accent-soft text-accent-text'
                      : step.reached
                        ? 'border-success/40 bg-success-soft text-success'
                        : 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  {step.reached ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Clock className="h-3 w-3 opacity-60" aria-hidden="true" />
                  )}
                  <span>{step.label}</span>
                </span>
                {!last && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-px w-4',
                      steps[i + 1]?.reached ? 'bg-success/40' : 'bg-border'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* A booking that stopped off the happy path has stages it never
            reached, so the status itself has to carry the explanation. */}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{meta.label}.</span>{' '}
          {meta.description}
        </p>
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <details className="group rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            History ({history.length})
          </summary>
          <ol className="mt-3 space-y-2.5">
            {history.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="flex gap-3 text-xs">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {entry.label}
                    <span className="font-normal text-muted-foreground"> · {entry.who}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(entry.at)}</p>
                  {entry.note && (
                    <p className="mt-0.5 leading-relaxed text-foreground/80">
                      &ldquo;{entry.note}&rdquo;
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

export default BookingProgress;