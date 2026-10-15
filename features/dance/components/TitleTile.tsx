'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { CrewAchievement } from '../data/crews';

interface TitleTileProps {
  achievement: CrewAchievement;
  index: number;
  isTopThree: boolean;
}

export function TitleTile({ achievement, index, isTopThree }: TitleTileProps) {
  const year = achievement.year ? String(achievement.year) : '—';

  return (
    <article
      className={cn(
        'relative rounded-xl border bg-[#151515] p-4 transition-all duration-200 hover:-translate-y-1',
        isTopThree
          ? 'border-[#2A2823] hover:border-[#8F7335] hover:bg-[#1A160D] hover:shadow-[0_8px_24px_-8px_rgba(143,115,53,0.3)]'
          : 'border-[#2A2823] hover:border-[#6E5A2C] hover:bg-[#17140D]'
      )}
    >
      {/* Year badge - gold for top 3 */}
      <div
        className={cn(
          'absolute -top-3 left-4 px-3 py-1 rounded-full text-[11px] font-bold',
          isTopThree
            ? 'bg-[#D4B366] text-[#0A0A0A]'
            : 'bg-[#2A2823] text-[#D4B366] border border-[#2A2823]'
        )}
      >
        {year}
      </div>

      <div className="pt-6">
        <h4 className="font-serif text-base font-semibold text-[#F3EEDF] leading-snug whitespace-normal break-words mb-2">
          {achievement.title}
        </h4>

        <a
          href={achievement.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#A39B87] hover:text-[#D4B366] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
          aria-label={`View verification source for ${achievement.title}`}
        >
          <span>Source</span>
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default TitleTile;