'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { ReportIssueLink } from './ReportIssueLink';
import type { MatchRecap } from '../data/crews';

interface RecapRowProps {
  recap: MatchRecap;
  crewName: string;
  isLatest: boolean;
  showViewAll?: boolean;
  totalRecaps?: number;
  onViewAll?: () => void;
}

export function RecapRow({ recap, crewName, isLatest, showViewAll, totalRecaps, onViewAll }: RecapRowProps) {
  const isChampion = recap.result === 'CHAMPION';
  const isWin = recap.result === 'WIN';

  if (showViewAll && onViewAll) {
    return (
      <button
        type="button"
        onClick={onViewAll}
        className="w-full rounded-xl border border-dashed crew-bd bg-[var(--crew-bg-row)] px-4 py-3 text-center transition-all duration-200 hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
      >
        <span className="text-sm font-medium text-[var(--crew-text-muted)]">
          Show all {totalRecaps} recaps
        </span>
      </button>
    );
  }

  return (
    <article
      className={cn(
        'rounded-xl border p-4 transition-all duration-200',
        isLatest
          ? 'crew-bd bg-[var(--crew-bg-tile)] hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] hover:-translate-y-1'
          : 'crew-bd bg-[var(--crew-bg-row)] hover:crew-bd-accent hover:bg-[var(--crew-bg-row-hover)]'
      )}
    >
      {/* Event Name & Date */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-[var(--crew-text-primary)]">{recap.event}</span>
        <span className="flex items-center gap-1 text-[11px] text-[var(--crew-text-muted)]">
          {recap.date} · {recap.stage}
        </span>
      </div>

      {/* Head-to-Head & Results Banner */}
      <div className="flex items-center justify-between border-y crew-bd py-2.5 mb-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--crew-text-primary)]">
          <span>{crewName}</span>
          {recap.opponent && (
            <>
              <span className="text-[10px] text-[var(--crew-text-muted)]">VS</span>
              <span className="text-[var(--crew-text-muted)]">{recap.opponent}</span>
            </>
          )}
        </div>

        {/* Result Tag */}
        <div className="flex items-center gap-2">
          {recap.score && (
            <span className="text-xs font-semibold text-[var(--crew-text-muted)]">{recap.score}</span>
          )}
          <span
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
              isChampion || isWin
                ? 'border-[color:var(--success)]/40 bg-[var(--success)]/15 text-[var(--success)]'
                : 'border-[color:var(--warning)]/40 bg-[var(--warning)]/15 text-[var(--warning)]'
            )}
          >
            {recap.result}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed text-[var(--crew-text-body)] mb-3 whitespace-normal break-words">
        {recap.summary}
      </p>

      {/* Source Link */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ReportIssueLink
          itemTitle={`${crewName} — ${recap.event}`}
          itemId={recap.id}
          kind="Result"
          className="text-[11px] font-medium text-[var(--crew-text-muted)] hover:text-[var(--crew-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
        />
        <a
          href={recap.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-[var(--crew-accent-gold)] hover:text-[var(--crew-chip-hover-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
          aria-label={`View verification source for ${recap.event}`}
        >
          <span>Verification Source</span>
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default RecapRow;