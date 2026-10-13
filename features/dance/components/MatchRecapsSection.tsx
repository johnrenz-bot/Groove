'use client';

import React from 'react';
import { Flame, Trophy, Swords, Calendar } from 'lucide-react';
import type { MatchRecap } from '../data/crews';

interface MatchRecapsSectionProps {
  recaps: MatchRecap[];
  crewName: string;
}

export function MatchRecapsSection({ recaps, crewName }: MatchRecapsSectionProps) {
  if (!recaps || recaps.length === 0) return null;

  return (
    <div className="border border-white/10 bg-[#0A141C] p-6">
      {/* Sports Match Recaps Title */}
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#C8102E]" />
          <h4 className="font-mono text-xs font-black uppercase tracking-widest text-white">
            MATCH RECAPS & BATTLE BREAKDOWN
          </h4>
        </div>
        <span className="font-mono text-[10px] uppercase text-[#C6F10E]">
          OFFICIAL SCORECARDS
        </span>
      </div>

      <div className="space-y-4">
        {recaps.map((recap) => {
          const isChamp = recap.result === 'CHAMPION';
          const isWin = recap.result === 'WIN';

          return (
            <div
              key={recap.id}
              className="border-l-4 border-[#C8102E] bg-[#050B10] p-4 transition-all hover:border-[#C6F10E]"
            >
              {/* Event Name & Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-[#C6F10E]">
                  {recap.event}
                </span>
                <span className="flex items-center gap-1 font-mono text-[10px] text-[#93A3AF]">
                  <Calendar className="h-3 w-3" />
                  {recap.date} · {recap.stage}
                </span>
              </div>

              {/* Head-to-Head Banner */}
              <div className="mt-2 flex items-center justify-between border-t border-b border-white/5 py-2">
                <div className="flex items-center gap-2 font-mono text-sm font-black uppercase text-white">
                  <span>{crewName}</span>
                  <span className="text-xs text-[#C8102E]">VS</span>
                  <span className="text-white/80">{recap.opponent} ({recap.opponentCountry})</span>
                </div>

                {/* Score & Verdict Tag */}
                <div className="flex items-center gap-2">
                  {recap.score && (
                    <span className="font-mono text-xs font-bold text-[#93A3AF]">
                      {recap.score}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                      isChamp || isWin
                        ? 'bg-[#C6F10E] text-[#050B10]'
                        : 'bg-[#C8102E] text-white'
                    }`}
                  >
                    {recap.result}
                  </span>
                </div>
              </div>

              {/* Editorial Summary */}
              <p className="mt-2 text-xs leading-relaxed text-[#93A3AF]">
                {recap.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
