'use client';

import React from 'react';
import { ORGANIZATIONS } from '@/lib/dance/constants';

interface OrgLogoBarProps {
  selectedOrg: string;
  onSelectOrg: (orgId: string) => void;
}

export function OrgLogoBar({ selectedOrg, onSelectOrg }: OrgLogoBarProps) {
  return (
    <section className="border-b border-[#0E1C26] bg-[#0A141C] py-5">
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs font-black uppercase tracking-widest text-[#93A3AF]">
            OFFICIAL LEAGUES & FEDERATIONS
          </span>
          <span className="text-[11px] font-semibold text-[#C6F10E]/80">
            Click an organization to filter updates
          </span>
        </div>

        {/* Horizontal scrollable track of stylized logo buttons */}
        <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5">
          {/* ALL ORGANIZATIONS pill */}
          <button
            type="button"
            onClick={() => onSelectOrg('all')}
            className={`group shrink-0 rounded-none border px-4 py-2 font-mono text-xs font-black uppercase tracking-wider transition-all ${
              selectedOrg === 'all'
                ? 'border-[#C6F10E] bg-[#C6F10E] text-[#050B10] shadow-[0_0_15px_rgba(198,241,14,0.3)]'
                : 'border-white/10 bg-[#050B10] text-[#93A3AF] hover:border-white/30 hover:text-white'
            }`}
          >
            <span>ALL LEAGUES</span>
          </button>

          {ORGANIZATIONS.map((org) => {
            const isSelected = selectedOrg.toLowerCase() === org.id.toLowerCase() ||
              selectedOrg.toLowerCase() === org.label.toLowerCase();

            return (
              <button
                key={org.id}
                type="button"
                onClick={() => onSelectOrg(isSelected ? 'all' : org.id)}
                className={`group flex shrink-0 items-center gap-2 rounded-none border px-4 py-2 font-mono text-xs font-black uppercase tracking-wider transition-all ${
                  isSelected
                    ? 'border-[#C6F10E] bg-[#0E1C26] text-[#C6F10E] shadow-[0_0_15px_rgba(198,241,14,0.25)]'
                    : 'border-white/10 bg-[#050B10] text-white hover:border-[#C8102E] hover:text-[#C8102E]'
                }`}
                title={org.fullName}
              >
                {/* Visual badge mark indicator */}
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isSelected ? 'bg-[#C6F10E]' : 'bg-[#C8102E] opacity-70 group-hover:opacity-100'
                  }`}
                />
                <span>{org.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
