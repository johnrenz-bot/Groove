'use client';

/**
 * Tambayan Pulse Card for Groove Performing Arts Community.
 *
 * Imbues the Performing Arts Showcase with a lively Filipino tambayan feel
 * for dancers, coaches, and clients:
 *   - Trending rehearsal topics and cypher hashtags (#CypherFriday, #StudioJam, etc.)
 *   - Live studio activity & rehearsal check-in status
 *   - Quick cheers & community connection points
 */

import React, { useState } from 'react';
import {
  Flame,
  Heart,
  MessageSquare,
  Music2,
  Radio,
  Sparkles,
  Users2,
  Zap,
} from 'lucide-react';
import { cn } from '@/components/shared/cn';

export function TambayanPulseCard() {
  const [cheerCount, setCheerCount] = useState(48);
  const [hasCheered, setHasCheered] = useState(false);

  const tags = [
    { label: '#CypherFriday', count: '12 clips' },
    { label: '#SJDMRehearsals', count: '19 posts' },
    { label: '#ChoreoDrop', count: '8 routines' },
    { label: '#BulacanDancers', count: '24 members' },
    { label: '#VocalWarmup', count: '7 vocalists' },
  ];

  const handleCheer = () => {
    if (!hasCheered) {
      setCheerCount((c) => c + 1);
      setHasCheered(true);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm backdrop-blur-md">
      {/* Top Banner with Tambayan Theme */}
      <div className="relative overflow-hidden bg-gradient-to-r from-accent/20 via-brand-sunburst/15 to-accent/10 px-4 py-3.5 border-b border-border/70">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-accent-text">
              Bulacan Arts Tambayan
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Users2 className="h-3.5 w-3.5 text-accent" />
            <span>Online Community</span>
          </span>
        </div>

        <h3 className="mt-1 text-sm font-bold text-foreground">
          Kwentuhan, Jams &amp; Rehearsals
        </h3>
        <p className="text-[11px] text-muted-foreground">
          San Jose del Monte dancers, coaches, and performing arts students connected in one space.
        </p>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* Trending Tambayan Tags */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
            <Flame className="h-3 w-3 text-amber-500" />
            Active Jams &amp; Hashtags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 px-2 py-1 text-[10px] font-semibold text-foreground hover:border-accent/40 hover:bg-accent/10 transition cursor-default"
              >
                <span>{tag.label}</span>
                <span className="text-muted-foreground/70 text-[9px] font-normal">
                  ({tag.count})
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Quick Tambayan Cheer */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/10 p-2.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent shrink-0" />
            <div className="text-[11px]">
              <p className="font-bold text-foreground">Bigyan ng Cheer ang Tropang Performer!</p>
              <p className="text-muted-foreground text-[10px]">Show support for rehearsals</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheer}
            disabled={hasCheered}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer',
              hasCheered
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-xs'
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', hasCheered && 'fill-current text-emerald-400')} />
            <span>{cheerCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TambayanPulseCard;
