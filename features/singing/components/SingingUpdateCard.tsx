'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  MapPin,
  ExternalLink,
  ArrowUpRight,
  Calendar,
  Mic,
  Award,
} from 'lucide-react';
import type { DanceUpdateRecord } from '@/features/dance/services/danceService';
import { isUpcomingEvent } from '@/features/dance/services/danceService';
import { formatEventDate } from '@/lib/dance/types';
import { ReportIssueLink } from '@/features/dance/components/ReportIssueLink';
import { getCountdownLabel } from '@/features/dance/utils/countdown';

interface SingingUpdateCardProps {
  update: DanceUpdateRecord;
  language: 'en' | 'tl';
}

// Fixed 420px card height matching the Dance baseline design system
const CARD_HEIGHT = 420; // px

export function SingingUpdateCard({ update, language }: SingingUpdateCardProps) {
  // Event date formatting
  const eventDate = React.useMemo(() => formatEventDate(update.event_date), [update.event_date]);

  // Past event calculation
  const isPastEvent = React.useMemo(
    () => Boolean(eventDate) && !isUpcomingEvent(update),
    [eventDate, update]
  );

  // Countdown label
  const countdownLabel = React.useMemo(
    () => getCountdownLabel(update.event_date),
    [update.event_date]
  );

  // Summary selection (fall back to English if Tagalog is empty)
  const summaryText = language === 'tl' && update.summary_tl ? update.summary_tl : update.summary;

  // Event image
  const eventImageUrl = update.image_url;
  const hasEventImage = Boolean(eventImageUrl);

  // Touch/expand state for mobile
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(hover: none)').matches
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Handle keyboard toggle for touch
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  }, []);

  // Reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Category label mapping
  const categoryLabel = React.useMemo(() => {
    const cat = (update.category || '').toLowerCase();
    if (cat === 'competition') return 'Choral Competition';
    if (cat === 'event') return 'Choral Festival';
    if (cat === 'workshop') return 'Pedagogy & Masterclass';
    if (cat === 'results') return 'Awards & Results';
    if (cat === 'news') return 'Vocal Update';
    return update.category || 'Vocal Arts';
  }, [update.category]);

  return (
    <article
      ref={cardRef}
      className={`group relative flex flex-col overflow-hidden rounded-[22px] border transition-all duration-700 ease-out-expo ${
        isPastEvent
          ? 'border-neutral-700 bg-[#111] group-hover:border-neutral-500 group-focus-within:border-neutral-500 data-[expanded]:border-neutral-500'
          : 'crew-bd bg-[var(--crew-bg-panel)] group-hover:crew-bd-gold group-focus-within:crew-bd-gold data-[expanded]:crew-bd-gold'
      } ${reducedMotion ? 'transition-none' : ''} ${
        isTouchDevice && isExpanded ? 'ring-1 ring-[#E6C77A]' : ''
      }`}
      style={{ height: CARD_HEIGHT }}
      data-expanded={isTouchDevice && isExpanded ? '' : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={isTouchDevice ? 0 : -1}
      role={isTouchDevice ? 'button' : 'article'}
      aria-expanded={isTouchDevice ? isExpanded : undefined}
      aria-label={isTouchDevice ? `${update.title}, ${isExpanded ? 'expanded' : 'collapsed'}` : undefined}
    >
      {/* Full-bleed event image background */}
      <div
        className={`absolute inset-0 z-0 overflow-hidden transition-transform duration-700 ease-out-expo ${
          reducedMotion ? 'transition-none' : ''
        } group-hover:scale-[1.07] group-focus-within:scale-[1.07] data-[expanded]:scale-[1.07]`}
        aria-hidden="true"
      >
        {hasEventImage ? (
          <Image
            src={eventImageUrl!}
            alt={update.image_alt || update.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 420px"
            className={`object-cover object-center ${isPastEvent ? 'grayscale-[60%]' : ''}`}
            preload={false}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br from-[var(--crew-bg-panel)] via-[var(--crew-bg-tile)] to-[var(--crew-bg-row)] ${
              isPastEvent ? 'grayscale-[60%]' : ''
            }`}
            aria-hidden="true"
          />
        )}

        {/* Dual dark scrims ensuring high contrast in both dark and light modes */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out-expo ${
            reducedMotion ? 'transition-none' : ''
          }`}
          style={{
            background: `
              linear-gradient(
                to top,
                rgba(0,0,0,0.92) 0%,
                rgba(0,0,0,0.45) 100%
              )
            `,
          }}
          aria-hidden="true"
        />
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out-expo ${
            reducedMotion ? 'transition-none' : ''
          } opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[expanded]:opacity-100`}
          style={{
            background: `
              linear-gradient(
                to top,
                rgba(0,0,0,0.97) 0%,
                rgba(0,0,0,0.60) 100%
              )
            `,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Card lift on hover/focus (desktop) or touch expand */}
      <div
        className={`relative z-10 flex flex-col h-full transition-transform duration-700 ease-out-expo ${
          reducedMotion ? 'transition-none' : ''
        } group-hover:-translate-y-1 group-focus-within:-translate-y-1 data-[expanded]:-translate-y-1`}
      >
        {/* TOP ROW: Badges */}
        <div className="absolute left-4 top-4 right-4 z-20 flex items-start justify-between gap-2 p-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Organization badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                isPastEvent
                  ? 'bg-neutral-400 text-neutral-900'
                  : 'bg-[#F7F0E1] text-[#111]'
              } backdrop-blur-sm shadow-sm shrink-0`}
            >
              <Mic className="h-3 w-3 text-[#111]/70" aria-hidden="true" />
              {update.organization}
            </span>

            {/* Category pill */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isPastEvent
                  ? 'bg-neutral-900/70 text-neutral-400 border border-neutral-700/50'
                  : 'bg-black/60 text-[#D8D2C4] border border-white/10'
              } backdrop-blur-sm shrink-0`}
            >
              {categoryLabel}
            </span>
          </div>

          {/* Right: Countdown or Concluded pill */}
          {countdownLabel && !isPastEvent && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-[#111] bg-[#E6C77A] shadow-sm shrink-0"
              aria-label={countdownLabel}
            >
              {countdownLabel}
            </span>
          )}
          {isPastEvent && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-neutral-400 bg-neutral-900/70 border border-neutral-700/50 backdrop-blur-sm shrink-0"
              aria-label="Concluded"
            >
              Concluded
            </span>
          )}
        </div>

        {/* BOTTOM: Date + Headline (Rest State) */}
        <div
          className={`absolute left-4 right-4 bottom-4 z-20 flex flex-col gap-2 transition-all duration-450 ease-out-expo ${
            reducedMotion ? 'transition-none' : ''
          } group-hover:opacity-0 group-hover:pointer-events-none group-hover:translate-y-1 group-focus-within:opacity-0 group-focus-within:pointer-events-none group-focus-within:translate-y-1 data-[expanded]:opacity-0 data-[expanded]:pointer-events-none data-[expanded]:translate-y-1`}
        >
          {eventDate && (
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-[#E6C77A]">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <time dateTime={update.event_date ?? undefined}>{eventDate}</time>
            </div>
          )}

          <h2
            className={`font-display text-[22px] leading-tight font-semibold text-white line-clamp-3 ${
              isPastEvent ? 'text-neutral-300' : ''
            }`}
          >
            {update.title}
          </h2>
        </div>

        {/* EXPANDED INFO BLOCK - slides up on hover/focus or tap */}
        <div
          id={`singing-card-details-${update.id}`}
          className={`absolute left-0 right-0 bottom-0 z-20 p-4 pb-6 flex flex-col gap-3 overflow-hidden transition-all duration-450 ease-out-expo ${
            reducedMotion ? 'transition-none' : ''
          } group-hover:opacity-100 group-hover:max-h-[270px] group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:max-h-[270px] group-focus-within:translate-y-0 data-[expanded]:opacity-100 data-[expanded]:max-h-[270px] data-[expanded]:translate-y-0 opacity-0 max-h-0 translate-y-3 pointer-events-none`}
          role="region"
          aria-label="Singing event details"
        >
          {/* Location */}
          {update.location && (
            <div className="flex items-start gap-2 text-[13px] text-[#D8D2C4] leading-relaxed">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[#E6C77A]" aria-hidden="true" />
              <span className="whitespace-normal break-words">{update.location}</span>
            </div>
          )}

          {/* Full summary text */}
          <p className="text-[13.5px] leading-relaxed text-[#D8D2C4] whitespace-normal break-words">
            {summaryText}
          </p>

          {/* Action row: Primary gold button + ghost Official Source */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <a
              href={update.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 min-h-[44px] text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-panel)] ${
                isPastEvent
                  ? 'bg-neutral-700 text-neutral-200 border border-neutral-600 hover:bg-neutral-600'
                  : 'bg-[#E6C77A] text-[#111] hover:bg-[#F4BE4D] shadow-lg shadow-[#E6C77A]/30'
              }`}
              aria-label={isPastEvent ? `View results for ${update.title}` : `View registration or details for ${update.title}`}
            >
              {isPastEvent ? 'View Results' : 'Event Details / Register'}
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>

            <a
              href={update.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 min-h-[44px] text-xs font-semibold text-[#D8D2C4] border border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-panel)]"
              aria-label={`View official source for ${update.title}`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Official Source</span>
            </a>
          </div>

          {/* Footer row: divider, tags left, Report link right */}
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2 overflow-hidden">
              {update.region && (
                <span className="text-[11px] font-medium text-[#E6C77A]">#{update.region}</span>
              )}
              {update.image_credit && (
                <span className="truncate text-[10px] text-white/50">
                  © {update.image_credit}
                </span>
              )}
            </div>

            <ReportIssueLink
              itemTitle={update.title}
              itemId={update.id}
              kind="Singing Update"
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-panel)]"
            />
          </div>
        </div>

        {/* Touch toggle button - only visible on touch devices when not expanded */}
        {isTouchDevice && !isExpanded && (
          <button
            type="button"
            className="absolute inset-0 z-30 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-panel)]"
            onClick={() => setIsExpanded(true)}
            aria-expanded={false}
            aria-controls={`singing-card-details-${update.id}`}
            aria-label={`Expand details for ${update.title}`}
          >
            <span className="sr-only">Expand event details</span>
          </button>
        )}

        {/* Touch close button - only visible on touch devices when expanded */}
        {isTouchDevice && isExpanded && (
          <button
            type="button"
            className="absolute top-3 right-3 z-30 rounded-full p-1.5 bg-black/50 text-white hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--crew-bg-panel)]"
            onClick={() => setIsExpanded(false)}
            aria-expanded={true}
            aria-label={`Collapse details for ${update.title}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}

export default SingingUpdateCard;
