'use client';

import React from 'react';
import { ExternalLink, Calendar, MapPin, Sparkles } from 'lucide-react';
import type { DanceUpdateRecord } from '../services/danceService';
import { NEW_ITEM_WINDOW_HOURS } from '@/lib/dance/constants';

interface UpdateCardProps {
  update: DanceUpdateRecord;
  language: 'en' | 'tl';
}

export function UpdateCard({ update, language }: UpdateCardProps) {
  // Determine if item is "NEW" (< 24 hours old)
  const isNew = React.useMemo(() => {
    if (!update.published_at) return false;
    const publishedTime = new Date(update.published_at).getTime();
    const hoursAgo = (Date.now() - publishedTime) / (1000 * 60 * 60);
    return hoursAgo <= NEW_ITEM_WINDOW_HOURS;
  }, [update.published_at]);

  // Format published date
  const formattedDate = React.useMemo(() => {
    if (!update.published_at) return 'Recently published';
    try {
      return new Date(update.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently published';
    }
  }, [update.published_at]);

  // Summary selection (fall back to English if Tagalog is empty)
  const summaryText =
    language === 'tl' && update.summary_tl ? update.summary_tl : update.summary;

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden border border-white/10 bg-[#0A141C] transition-all hover:-translate-y-1 hover:border-[#C6F10E]/40 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      {/* Top Red Accent Edge */}
      <div className="h-1 w-full bg-[#0E1C26] transition-colors group-hover:bg-[#C8102E]" />

      <div>
        {/* Thumbnail Image Header */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#050B10]">
          {update.image_url ? (
            <img
              src={update.image_url}
              alt={update.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#050B10] text-[#93A3AF]">
              <span className="font-mono text-2xl font-black text-white/20">
                {update.organization.toUpperCase()}
              </span>
            </div>
          )}

          {/* Overlay Organization & Status Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-none bg-[#050B10]/90 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-[#C6F10E] backdrop-blur-sm">
              {update.organization}
            </span>
            <span className="rounded-none bg-[#C8102E] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              {update.category}
            </span>
          </div>

          {/* NEW Badge */}
          {isNew && (
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1 bg-[#C6F10E] px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-[#050B10] shadow-sm animate-pulse">
                <Sparkles className="h-2.5 w-2.5" />
                NEW
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5">
          {/* Metadata Row: Date & Location */}
          <div className="mb-2.5 flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#93A3AF]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-white/40" />
              {formattedDate}
            </span>
            {update.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#C8102E]" />
                {update.location}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="line-clamp-2 font-mono text-base font-black uppercase tracking-tight text-white transition-colors group-hover:text-[#C6F10E]">
            {update.title}
          </h2>

          {/* Summary */}
          <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-[#93A3AF]">
            {summaryText}
          </p>
        </div>
      </div>

      {/* Card Footer: Outbound link & Tag list */}
      <div className="border-t border-white/5 bg-[#050B10]/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {update.region && (
              <span className="font-mono text-[10px] uppercase text-[#93A3AF]">
                #{update.region}
              </span>
            )}
            {language === 'tl' && update.summary_tl && (
              <span className="border border-[#C6F10E]/30 px-1 font-mono text-[9px] text-[#C6F10E]">
                TL
              </span>
            )}
          </div>

          <a
            href={update.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex items-center gap-1 font-mono text-xs font-black uppercase tracking-wider text-white transition-colors hover:text-[#C6F10E]"
          >
            <span>OFFICIAL SOURCE</span>
            <ExternalLink className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
