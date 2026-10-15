'use client';

import React from 'react';
import { Trophy, Calendar, ExternalLink } from 'lucide-react';
import type { MatchRecap } from '../data/crews';
import { ReportIssueLink } from './ReportIssueLink';
import { cn } from '@/components/shared/cn';

interface MatchRecapsSectionProps {
  recaps: MatchRecap[];
  crewName: string;
}

export function MatchRecapsSection({ recaps, crewName }: MatchRecapsSectionProps) {
  if (!recaps || recaps.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      {/* Title */}
      <div className="mb-4 flex items-center justify-between border-b border-divider pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent-text" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Official Match Recaps &amp; Battle Breakdown
          </h4>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          Verified Records
        </span>
      </div>

      <div className="space-y-4">
        {recaps.map((recap) => {
          const isChamp = recap.result === 'CHAMPION';
          const isWin = recap.result === 'WIN';

          return (
            <div
              key={recap.id}
              className="rounded-xl border border-border bg-muted/20 p-4 transition-all hover:border-border-strong"
            >
              {/* Event Name & Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">
                  {recap.event}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {recap.date} · {recap.stage}
                </span>
              </div>

              {/* Head-to-Head & Results Banner */}
              <div className="mt-2.5 flex items-center justify-between border-b border-t border-divider/60 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span>{crewName}</span>
                  {recap.opponent && (
                    <>
                      <span className="text-[10px] text-muted-foreground">VS</span>
                      <span className="text-muted-foreground">{recap.opponent}</span>
                    </>
                  )}
                </div>

                {/* Result Tag (Small accent) */}
                <div className="flex items-center gap-2">
                  {recap.score && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {recap.score}
                    </span>
                  )}
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
                      isChamp || isWin
                        ? 'border-success/40 bg-success-soft text-success'
                        : 'border-warning/40 bg-warning-soft text-warning'
                    )}
                  >
                    {recap.result}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                {recap.summary}
              </p>

              {/* Source Link */}
              <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                <ReportIssueLink itemTitle={`${crewName} — ${recap.event}`} itemId={recap.id} kind="Result" />
                <a
                  href={recap.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <span>Verification Source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
