'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Globe, Flag } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { DanceCrew } from '../data/crews';

interface CrewChipsProps {
  crews: DanceCrew[];
  selectedCrew: DanceCrew;
  onSelectCrew: (crew: DanceCrew) => void;
  regionFilter: 'all' | 'ph' | 'intl';
  onRegionFilterChange: (filter: 'all' | 'ph' | 'intl') => void;
}

const regionOptions = [
  { value: 'all', label: 'All', icon: Globe },
  { value: 'ph', label: 'PH', icon: Flag },
  { value: 'intl', label: 'Intl', icon: Globe },
] as const;

export function CrewChips({
  crews,
  selectedCrew,
  onSelectCrew,
  regionFilter,
  onRegionFilterChange,
}: CrewChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  // Filter crews by region
  const filteredCrews = React.useMemo(() => {
    if (regionFilter === 'all') return crews;
    if (regionFilter === 'ph') return crews.filter((c) => c.country === 'Philippines');
    return crews.filter((c) => c.country !== 'Philippines');
  }, [crews, regionFilter]);

  // Scroll selected chip into view
  useEffect(() => {
    if (chipsRef.current) {
      const selectedChip = chipsRef.current.querySelector('[aria-selected="true"]');
      if (selectedChip) {
        selectedChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedCrew.id, regionFilter]);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, crew: DanceCrew, index: number) => {
      const filtered = filteredCrews;
      let newIndex = index;
      if (e.key === 'ArrowRight') {
        newIndex = Math.min(index + 1, filtered.length - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        newIndex = Math.max(index - 1, 0);
        e.preventDefault();
      } else if (e.key === 'Home') {
        newIndex = 0;
        e.preventDefault();
      } else if (e.key === 'End') {
        newIndex = filtered.length - 1;
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === ' ') {
        onSelectCrew(crew);
        e.preventDefault();
      }
      if (newIndex !== index) {
        const nextChip = chipsRef.current?.querySelectorAll('[role="tab"]')[newIndex] as HTMLElement;
        nextChip?.focus();
      }
    },
    [filteredCrews, onSelectCrew]
  );

  return (
    <div className="w-full">
      {/* Region Filter Toggle */}
      <div
        role="group"
        aria-label="Filter crews by region"
        className="flex items-center justify-between mb-4"
      >
        <div className="inline-flex items-center gap-1 rounded-full bg-[#151515] border border-[#2A2823] p-1">
          {regionOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onRegionFilterChange(value as 'all' | 'ph' | 'intl')}
              aria-pressed={regionFilter === value}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]',
                regionFilter === value
                  ? 'bg-[#D4B366] text-[#0A0A0A] shadow-sm'
                  : 'text-[#A39B87] hover:bg-[#1A160D] hover:text-[#F3EEDF] hover:border-[#8F7335]'
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Crew Chips Scrollable Row */}
      <div
        ref={scrollRef}
        className="relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Left fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10"
          aria-hidden="true"
        />

        <div
          ref={chipsRef}
          role="tablist"
          aria-label="Featured crews"
          className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {filteredCrews.map((crew, index) => {
            const isSelected = selectedCrew.id === crew.id;
            const initials = crew.name
              .split(/\s+/)
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <button
                key={crew.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`crew-panel-${crew.id}`}
                id={`crew-tab-${crew.id}`}
                onClick={() => onSelectCrew(crew)}
                onKeyDown={(e) => handleKeyDown(e, crew, index)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 min-h-[44px] text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] snap-start',
                  isSelected
                    ? 'bg-[#D4B366] text-[#0A0A0A] shadow-sm ring-1 ring-[#D4B366]'
                    : 'bg-[#151515] text-[#CFC9BA] border border-[#2A2823] hover:bg-[#1A160D] hover:border-[#8F7335] hover:text-[#F3EEDF]'
                )}
                style={{ scrollSnapAlign: 'center' }}
              >
                {crew.logo?.verified && crew.logo.url ? (
                  <img
                    src={crew.logo.url}
                    alt=""
                    className="h-4 w-4 rounded-full object-cover ring-1 ring-[#2A2823]"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[#2A2823] text-[#D4B366] text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                )}
                <span className="whitespace-nowrap">{crew.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10"
          aria-hidden="true"
        />
      </div>

      {/* Scroll buttons for non-touch */}
      <div className="hidden md:flex items-center justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={scrollLeft}
          aria-label="Scroll crews left"
          className="rounded-full p-2 bg-[#151515] border border-[#2A2823] text-[#A39B87] hover:bg-[#1A160D] hover:border-[#8F7335] hover:text-[#F3EEDF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={scrollRight}
          aria-label="Scroll crews right"
          className="rounded-full p-2 bg-[#151515] border border-[#2A2823] text-[#A39B87] hover:bg-[#1A160D] hover:border-[#8F7335] hover:text-[#F3EEDF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default CrewChips;