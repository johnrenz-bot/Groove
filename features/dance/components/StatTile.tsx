'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

interface StatTileProps {
  label: string;
  value: string;
  isMissing?: boolean;
  onSuggestUpdate?: () => void;
  crewName?: string;
}

export function StatTile({ label, value, isMissing, onSuggestUpdate, crewName }: StatTileProps) {
  if (isMissing) {
    return (
      <div className="rounded-xl border crew-bd bg-[var(--crew-bg-row)] p-4 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-sm font-medium text-[var(--crew-text-muted)] italic">
          Not yet verified
        </div>
        {onSuggestUpdate && crewName && (
          <button
            type="button"
            onClick={onSuggestUpdate}
            className="mt-2 inline-flex items-center gap-1 rounded-md text-[10px] font-semibold text-[var(--crew-accent-gold)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
            aria-label={`Suggest an update for ${crewName} ${label}`}
          >
            Suggest an update
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border crew-bd bg-[var(--crew-bg-tile)] p-4 text-center transition-all duration-200 hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] hover:-translate-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--crew-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--crew-text-primary)] leading-snug whitespace-normal break-words">
        {value}
      </div>
    </div>
  );
}

export default StatTile;