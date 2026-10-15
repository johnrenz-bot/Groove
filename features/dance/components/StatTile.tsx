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
      <div className="rounded-xl border border-[#2A2823] bg-[#131313] p-4 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A39B87]">
          {label}
        </div>
        <div className="mt-1 text-sm font-medium text-[#A39B87] italic">
          Not yet verified
        </div>
        {onSuggestUpdate && crewName && (
          <button
            type="button"
            onClick={onSuggestUpdate}
            className="mt-2 inline-flex items-center gap-1 rounded-md text-[10px] font-semibold text-[#D4B366] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
            aria-label={`Suggest an update for ${crewName} ${label}`}
          >
            Suggest an update
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A2823] bg-[#151515] p-4 text-center transition-all duration-200 hover:border-[#8F7335] hover:bg-[#1A160D] hover:-translate-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A39B87]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[#F3EEDF] leading-snug whitespace-normal break-words">
        {value}
      </div>
    </div>
  );
}

export default StatTile;