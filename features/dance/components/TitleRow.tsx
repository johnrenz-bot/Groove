'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { CrewAchievement } from '../data/crews';

interface TitleRowProps {
  achievement: CrewAchievement;
  onClick?: () => void;
}

export function TitleRow({ achievement, onClick }: TitleRowProps) {
  const year = achievement.year ? String(achievement.year) : '—';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-[#2A2823] bg-[#131313] px-4 py-3 transition-all duration-200 hover:border-[#6E5A2C] hover:bg-[#17140D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]'
      )}
      aria-label={`View details for ${achievement.title} (${year})`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-14 text-right">
          <span className="text-[12px] font-bold text-[#D4B366]/80">{year}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[#CFC9BA] block whitespace-normal break-words">
            {achievement.title}
          </span>
        </div>
        <div className="shrink-0 flex items-center justify-center">
          <ArrowUpRight className="h-4 w-4 text-[#A39B87] transition-colors group-hover:text-[#D4B366]" aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}

export default TitleRow;