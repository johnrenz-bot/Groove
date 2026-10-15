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
        className="w-full rounded-xl border border-dashed border-[#2A2823] bg-[#131313] px-4 py-3 text-center transition-all duration-200 hover:border-[#8F7335] hover:bg-[#1A160D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
      >
        <span className="text-sm font-medium text-[#A39B87]">
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
          ? 'border-[#2A2823] bg-[#151515] hover:border-[#8F7335] hover:bg-[#1A160D] hover:-translate-y-1'
          : 'border-[#2A2823] bg-[#131313] hover:border-[#6E5A2C] hover:bg-[#17140D]'
      )}
    >
      {/* Event Name & Date */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-[#F3EEDF]">{recap.event}</span>
        <span className="flex items-center gap-1 text-[11px] text-[#A39B87]">
          {recap.date} · {recap.stage}
        </span>
      </div>

      {/* Head-to-Head & Results Banner */}
      <div className="flex items-center justify-between border-y border-[#2A2823] py-2.5 mb-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F3EEDF]">
          <span>{crewName}</span>
          {recap.opponent && (
            <>
              <span className="text-[10px] text-[#A39B87]">VS</span>
              <span className="text-[#A39B87]">{recap.opponent}</span>
            </>
          )}
        </div>

        {/* Result Tag */}
        <div className="flex items-center gap-2">
          {recap.score && (
            <span className="text-xs font-semibold text-[#A39B87]">{recap.score}</span>
          )}
          <span
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
              isChampion || isWin
                ? 'border-[#6FBF93]/40 bg-[#6FBF93]/15 text-[#6FBF93]'
                : 'border-[#D9A94A]/40 bg-[#D9A94A]/15 text-[#D9A94A]'
            )}
          >
            {recap.result}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed text-[#CFC9BA] mb-3 whitespace-normal break-words">
        {recap.summary}
      </p>

      {/* Source Link */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ReportIssueLink
          itemTitle={`${crewName} — ${recap.event}`}
          itemId={recap.id}
          kind="Result"
          className="text-[11px] font-medium text-[#A39B87] hover:text-[#F3EEDF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
        />
        <a
          href={recap.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-[#D4B366] hover:text-[#E2C887] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
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