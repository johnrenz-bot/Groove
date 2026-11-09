import React from 'react';

export interface SessionRowProps {
  month: string;
  day: string;
  timeRange: string;
  tag: 'Rehearsal' | 'Coaching' | 'Performance';
  subtitle: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  showAgreementBadge?: boolean;
}

/**
 * One upcoming session.
 *
 * The row is a bordered inset rather than a card-on-card: it reads as a list
 * item inside the panel, keeps its own edge in Light mode, and wraps cleanly on
 * a phone instead of squeezing the status pill off the right side.
 */
export function SessionRow({
  month,
  day,
  timeRange,
  tag,
  subtitle,
  status,
  showAgreementBadge,
}: SessionRowProps) {
  const tagStyle = {
    Rehearsal: 'bg-warning-soft text-warning',
    Coaching: 'bg-info-soft text-info',
    Performance: 'bg-danger-soft text-danger',
  }[tag];

  const statusStyle = {
    Confirmed: 'bg-success-soft text-success',
    Pending: 'bg-warning-soft text-warning',
    Cancelled: 'bg-danger-soft text-danger line-through',
  }[status];

  const dotStyle = {
    Confirmed: 'bg-success',
    Pending: 'bg-warning',
    Cancelled: 'bg-danger',
  }[status];

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3 transition-colors hover:border-border-strong hover:bg-muted/40 sm:items-center sm:gap-4 sm:p-3.5">
      {/* Date block */}
      <div className="flex h-[3.25rem] w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-card">
        <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-muted-foreground">
          {month}
        </span>
        <span className="mt-0.5 text-base font-bold leading-none tabular-nums text-foreground">
          {day}
        </span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-foreground">
            {timeRange}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagStyle}`}
          >
            {tag}
          </span>
          {showAgreementBadge && (
            <span className="inline-flex items-center rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">
              Agreement required
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {/* Status */}
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} aria-hidden="true" />
        {status}
      </span>
    </div>
  );
}

export default SessionRow;
