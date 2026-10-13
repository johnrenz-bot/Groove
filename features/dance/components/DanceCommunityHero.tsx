'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ShieldCheck, Trophy, Globe, ArrowRight, Zap } from 'lucide-react';

interface DanceCommunityHeroProps {
  totalUpdatesCount?: number;
  totalEventsCount?: number;
  onExploreEvents?: () => void;
}

export function DanceCommunityHero({
  totalUpdatesCount = 18,
  totalEventsCount = 6,
  onExploreEvents,
}: DanceCommunityHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[#0E1C26] bg-[#050B10] text-white">
      {/* Background Graphic Elements */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-[#C8102E]/20 blur-3xl" />
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-[#C6F10E]/15 blur-3xl" />
        {/* Angled grid pattern */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 1px, transparent 1px, transparent 24px)`,
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
        {/* Top Eyebrow Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded bg-[#C8102E] px-3 py-1 font-mono text-[11px] font-black uppercase tracking-widest text-white shadow-sm">
            <Flame className="h-3.5 w-3.5 fill-white text-white" />
            OFFICIAL LEAGUE & BATTLE PULSE
          </span>
          <span className="inline-flex items-center gap-1.5 rounded border border-[#C6F10E]/30 bg-[#0A141C] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#C6F10E]">
            <Zap className="h-3 w-3" />
            IDL SPORTS PRESENTATION
          </span>
          <span className="hidden items-center gap-1.5 font-mono text-[11px] text-[#93A3AF] sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-[#C6F10E]" />
            AI-VERIFIED EVERY 6 HOURS
          </span>
        </div>

        {/* Main Headline — Bold Condensed Uppercase Typography */}
        <div className="mt-6 max-w-4xl">
          <h1 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            DANCE <span className="text-[#C6F10E]">COMMUNITY</span>
          </h1>
          <p className="mt-3 font-mono text-base font-bold uppercase tracking-widest text-[#C8102E] sm:text-xl md:text-2xl">
            COMPETITIONS · EVENTS · CREWS · PHILIPPINES & WORLDWIDE
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#93A3AF] sm:text-lg">
            The national and international battleground connecting Philippine street dance crews with global leagues.
            Real-time competition announcements, battle recaps, and certified federation updates curated for dancers,
            directors, and fans.
          </p>
        </div>

        {/* CTA Bar & League Metric Chips */}
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {onExploreEvents ? (
              <button
                type="button"
                onClick={onExploreEvents}
                className="group inline-flex items-center gap-2.5 rounded-none border-b-4 border-[#8B0018] bg-[#C8102E] px-6 py-3.5 font-mono text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#E01334]"
              >
                <span>UPCOMING EVENTS & BATTLES</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <a
                href="#upcoming-events"
                className="group inline-flex items-center gap-2.5 rounded-none border-b-4 border-[#8B0018] bg-[#C8102E] px-6 py-3.5 font-mono text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#E01334]"
              >
                <span>UPCOMING EVENTS & BATTLES</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            )}

            <Link
              href="/client/talent"
              className="inline-flex items-center gap-2 rounded-none border border-white/20 bg-[#0A141C] px-5 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:border-[#C6F10E] hover:text-[#C6F10E]"
            >
              FIND DANCE COACHES
            </Link>
          </div>

          {/* Quick Stats Tickers */}
          <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4 sm:border-t-0 sm:pt-0">
            <div className="rounded border border-white/10 bg-[#0A141C]/80 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#93A3AF]">
                <Globe className="h-3 w-3 text-[#C6F10E]" />
                FEDERATIONS
              </div>
              <div className="mt-0.5 font-mono text-xl font-black text-white sm:text-2xl">8+</div>
            </div>
            <div className="rounded border border-white/10 bg-[#0A141C]/80 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#93A3AF]">
                <Trophy className="h-3 w-3 text-[#C8102E]" />
                UPCOMING
              </div>
              <div className="mt-0.5 font-mono text-xl font-black text-[#C6F10E] sm:text-2xl">
                {totalEventsCount}
              </div>
            </div>
            <div className="rounded border border-white/10 bg-[#0A141C]/80 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#93A3AF]">
                <Zap className="h-3 w-3 text-white" />
                UPDATES
              </div>
              <div className="mt-0.5 font-mono text-xl font-black text-white sm:text-2xl">
                {totalUpdatesCount}+
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
