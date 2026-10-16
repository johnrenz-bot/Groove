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
        'relative rounded-xl border bg-[var(--crew-bg-tile)] p-4 transition-all duration-200 hover:-translate-y-1',
        isTopThree
          ? 'crew-bd hover:crew-bd-hover hover:bg-[var(--crew-bg-hover)] hover:shadow-[0_8px_24px_-8px_rgba(143,115,53,0.3)]'
          : 'crew-bd hover:crew-bd-accent hover:bg-[var(--crew-bg-row-hover)]'
      )}
    >
      {/* Year badge - gold for top 3 */}
      <div
        className={cn(
          'absolute -top-3 left-4 px-3 py-1 rounded-full text-[11px] font-bold',
          isTopThree
            ? 'bg-[var(--crew-accent-gold)] text-[var(--crew-bg-page)]'
            : 'bg-[var(--crew-border)] text-[var(--crew-accent-gold)] border crew-bd'
        )}
      >
        {year}
      </div>

      <div className="pt-6">
        <h4 className="font-serif text-base font-semibold text-[var(--crew-text-primary)] leading-snug whitespace-normal break-words mb-2">
          {achievement.title}
        </h4>

        <a
          href={achievement.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--crew-text-muted)] hover:text-[var(--crew-accent-gold)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crew-accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-page)]"
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