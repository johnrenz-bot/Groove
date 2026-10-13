'use client';

import React, { useState } from 'react';
import { Trophy, Users, Shield, Award, ChevronRight, Flame } from 'lucide-react';
import { FEATURED_CREWS, type DanceCrew } from '../data/crews';
import { MatchRecapsSection } from './MatchRecapsSection';

export function FeaturedCrewsRoster() {
  const [selectedCrew, setSelectedCrew] = useState<DanceCrew>(FEATURED_CREWS[0]);

  return (
    <section className="border-b border-[#0E1C26] bg-[#050B10] py-16 text-white">
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        {/* Header Banner */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 bg-[#C6F10E]" />
              <span className="font-mono text-xs font-black uppercase tracking-widest text-[#C8102E]">
                IDL TEAM ROSTER & CREW DOSSIERS
              </span>
            </div>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-tight sm:text-4xl">
              FEATURED <span className="text-[#C6F10E]">CREWS & DANCERS</span>
            </h2>
          </div>
          <p className="max-w-md font-mono text-xs text-[#93A3AF]">
            World Champion franchise teams and Philippine battle contenders. Inspect roster stats, leadership, and match records.
          </p>
        </div>

        {/* Crew Selector Tabs */}
        <div className="no-scrollbar mt-8 flex items-center gap-3 overflow-x-auto border-b border-white/10 pb-4">
          {FEATURED_CREWS.map((crew) => {
            const isSelected = selectedCrew.id === crew.id;
            return (
              <button
                key={crew.id}
                type="button"
                onClick={() => setSelectedCrew(crew)}
                className={`group flex shrink-0 items-center gap-3 border px-5 py-3 font-mono text-left transition-all ${
                  isSelected
                    ? 'border-[#C6F10E] bg-[#0A141C] text-white shadow-[0_0_20px_rgba(198,241,14,0.15)]'
                    : 'border-white/10 bg-[#0A141C]/50 text-[#93A3AF] hover:border-white/30 hover:text-white'
                }`}
              >
                <span className="text-xl">{crew.flag}</span>
                <div>
                  <div
                    className={`text-xs font-black uppercase tracking-wider ${
                      isSelected ? 'text-[#C6F10E]' : 'text-white'
                    }`}
                  >
                    {crew.name}
                  </div>
                  <div className="text-[10px] text-[#93A3AF]">{crew.city}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Team Dossier Presentation */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Hero Crew Card with Photo & Badges (5 cols) */}
          <div className="relative overflow-hidden border border-white/10 bg-[#0A141C] lg:col-span-5">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#050B10]">
              <img
                src={selectedCrew.coverImage}
                alt={selectedCrew.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A141C] via-transparent to-black/30" />

              {/* Watermark Logo */}
              <div className="absolute right-4 top-4 font-mono text-3xl font-black text-white/20">
                {selectedCrew.logoText}
              </div>

              {/* Tagline Ribbon */}
              <div className="absolute bottom-4 left-4 right-4">
                <span className="inline-block bg-[#C8102E] px-3 py-1 font-mono text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                  {selectedCrew.record} · {selectedCrew.division}
                </span>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                  {selectedCrew.name}
                </h3>
              </div>
            </div>

            {/* Crew Details & Bio */}
            <div className="p-6">
              <p className="text-xs leading-relaxed text-[#93A3AF]">
                {selectedCrew.bio}
              </p>

              {/* Key Stats Grid */}
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-b border-white/10 py-4 font-mono">
                <div>
                  <div className="text-[10px] uppercase text-[#93A3AF]">TITLES</div>
                  <div className="mt-0.5 text-xl font-black text-[#C6F10E]">{selectedCrew.titlesCount}x</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-[#93A3AF]">ROSTER</div>
                  <div className="mt-0.5 text-xl font-black text-white">{selectedCrew.membersCount} Dancers</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-[#93A3AF]">FOUNDED</div>
                  <div className="mt-0.5 text-xl font-black text-white">{selectedCrew.founded}</div>
                </div>
              </div>

              {/* Major Achievements */}
              <div className="mt-5">
                <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#93A3AF]">
                  MAJOR LEAGUE CHAMPIONSHIPS
                </div>
                <ul className="space-y-1.5 font-mono text-xs">
                  {selectedCrew.achievements.map((ach, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-white/90">
                      <Trophy className="h-3 w-3 shrink-0 text-[#C6F10E]" />
                      <span>{ach}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Key Dancers & Match Recaps (7 cols) */}
          <div className="space-y-8 lg:col-span-7">
            {/* Key Dancers Roster */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#C6F10E]" />
                  <span className="font-mono text-xs font-black uppercase tracking-widest text-white">
                    LEADERSHIP & KEY DANCERS
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#93A3AF]">
                  ACTIVE ATHLETES
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedCrew.keyDancers.map((dancer, idx) => (
                  <div
                    key={idx}
                    className="border border-white/10 bg-[#0A141C] p-4 transition-colors hover:border-[#C6F10E]/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black uppercase text-white">
                        {dancer.name}
                      </span>
                      {dancer.alias && (
                        <span className="border border-[#C8102E] bg-[#C8102E]/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                          "{dancer.alias}"
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-[#C6F10E]">
                      {dancer.role}
                    </div>
                    <div className="mt-2 text-xs text-[#93A3AF]">
                      Style: <span className="text-white">{dancer.specialty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Recaps Presentation */}
            <MatchRecapsSection recaps={selectedCrew.recentRecaps} crewName={selectedCrew.name} />
          </div>
        </div>
      </div>
    </section>
  );
}
