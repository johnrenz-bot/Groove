'use client';

import React from 'react';
import { Search, X, Globe, Sparkles, Languages } from 'lucide-react';
import { CATEGORIES, REGIONS } from '@/lib/dance/constants';

interface UpdatesFilterBarProps {
  region: string;
  category: string;
  searchQuery: string;
  language: 'en' | 'tl';
  onSelectRegion: (reg: string) => void;
  onSelectCategory: (cat: string) => void;
  onSearchChange: (q: string) => void;
  onToggleLanguage: (lang: 'en' | 'tl') => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function UpdatesFilterBar({
  region,
  category,
  searchQuery,
  language,
  onSelectRegion,
  onSelectCategory,
  onSearchChange,
  onToggleLanguage,
  onClearFilters,
  hasActiveFilters,
}: UpdatesFilterBarProps) {
  return (
    <div className="space-y-4 border-b border-[#0E1C26] bg-[#050B10] py-6 text-white">
      {/* Top Filter Controls: Search & Region & Language */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input with sports style */}
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#93A3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search competitions, crews, cities..."
            className="w-full rounded-none border border-white/15 bg-[#0A141C] py-2.5 pl-10 pr-10 font-mono text-xs text-white placeholder-[#93A3AF] transition-colors focus:border-[#C6F10E] focus:outline-none focus:ring-1 focus:ring-[#C6F10E]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93A3AF] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Region & Language Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Region Tabs (Philippines vs International) */}
          <div className="flex items-center rounded border border-white/10 bg-[#0A141C] p-1">
            <button
              type="button"
              onClick={() => onSelectRegion('all')}
              className={`px-3 py-1 font-mono text-xs font-bold uppercase transition ${
                region === 'all'
                  ? 'bg-[#C8102E] text-white shadow-sm'
                  : 'text-[#93A3AF] hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => onSelectRegion('philippines')}
              className={`flex items-center gap-1 px-3 py-1 font-mono text-xs font-bold uppercase transition ${
                region === 'philippines'
                  ? 'bg-[#C8102E] text-white shadow-sm'
                  : 'text-[#93A3AF] hover:text-white'
              }`}
            >
              <span>🇵🇭 PH</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectRegion('international')}
              className={`flex items-center gap-1 px-3 py-1 font-mono text-xs font-bold uppercase transition ${
                region === 'international'
                  ? 'bg-[#C8102E] text-white shadow-sm'
                  : 'text-[#93A3AF] hover:text-white'
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>INTL</span>
            </button>
          </div>

          {/* Language Toggle (English vs Tagalog summary) */}
          <div className="flex items-center rounded border border-white/10 bg-[#0A141C] p-1">
            <span className="flex items-center gap-1 px-2 text-xs text-[#93A3AF]">
              <Languages className="h-3.5 w-3.5" />
            </span>
            <button
              type="button"
              onClick={() => onToggleLanguage('en')}
              className={`px-2.5 py-1 font-mono text-xs font-bold transition ${
                language === 'en'
                  ? 'bg-[#C6F10E] text-[#050B10]'
                  : 'text-[#93A3AF] hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onToggleLanguage('tl')}
              className={`px-2.5 py-1 font-mono text-xs font-bold transition ${
                language === 'tl'
                  ? 'bg-[#C6F10E] text-[#050B10]'
                  : 'text-[#93A3AF] hover:text-white'
              }`}
              title="Tagalog / Filipino summaries"
            >
              TAGALISMO (TL)
            </button>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 px-3 py-1 font-mono text-xs text-[#C8102E] hover:underline"
            >
              <X className="h-3 w-3" />
              RESET
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pt-2">
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`shrink-0 rounded-none border px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider transition-all ${
                isActive
                  ? 'border-[#C8102E] bg-[#C8102E] text-white shadow-sm'
                  : 'border-white/10 bg-[#0A141C] text-[#93A3AF] hover:border-white/20 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
