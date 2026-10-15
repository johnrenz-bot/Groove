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
    Rehearsal: 'border-warning/30 bg-warning/10 text-warning',
    Coaching: 'border-info/30 bg-info/10 text-info',
    Performance: 'border-danger/30 bg-danger/10 text-danger',
  }[tag];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3.5 transition hover:border-accent-border hover:shadow-[0_2px_8px_rgba(20,40,75,0.04)]">
      {/* Date block */}
      <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-background">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{month}</span>
        <span className="text-lg font-bold tabular-nums text-foreground">{day}</span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-foreground">{timeRange}</span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagStyle}`}>
            {tag}
          </span>
          {showAgreementBadge && (
            <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">
              Agreement required
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      {/* Status */}
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        {status}
      </span>
    </div>
  );
}

export default SessionRow;
