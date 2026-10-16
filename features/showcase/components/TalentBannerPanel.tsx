'use client';

/**
 * Role & banner panel: the talent selector and the matching circle banner.
 *
 * Sticky on desktop only. On mobile it becomes a compact horizontal strip that
 * sits ABOVE the feed, because on a narrow screen the two-column split is
 * meaningless and the selector has to be reachable before the composer.
 *
 * The top offset accounts for the sticky app header (`--hx-header-h`, 4.5rem), so
 * the panel parks just below it instead of sliding underneath.
 */

import React from 'react';

import { TALENT_BANNERS, talentBanners, type TalentKey } from '../config/talentBanners';
import { cn } from '@/components/shared/cn';

export interface TalentBannerPanelProps {
  /** Circle currently being browsed. */
  selectedKey: TalentKey | null;
  /** The member's own circle — the only one they can post into. */
  postKey: TalentKey | null;
  onSelect: (key: TalentKey) => void;
  className?: string;
}

export function TalentBannerPanel({
  selectedKey,
  postKey,
  onSelect,
  className,
}: TalentBannerPanelProps) {
  const banner = selectedKey ? talentBanners[selectedKey] : null;
  const postBanner = postKey ? talentBanners[postKey] : null;
  const browsingOther = Boolean(postKey && selectedKey && selectedKey !== postKey);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selector — a radiogroup, because choosing one REPLACES the other. */}
      <div
        role="radiogroup"
        aria-label="Choose a community circle"
        className="flex gap-1.5 overflow-x-auto rounded-[14px] border border-border bg-card p-1.5 shadow-[var(--shadow-sm)] lg:grid lg:grid-cols-2 lg:overflow-visible"
      >
        {TALENT_BANNERS.map((item) => {
          const active = item.key === selectedKey;
          const isOwnCircle = item.key === postKey;
          return (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(item.key)}
              className={cn(
                'flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition lg:whitespace-normal',
                active
                  ? cn(
                      'border-accent-border bg-accent-soft text-accent-text ring-2',
                      item.activeRing
                    )
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="truncate">{item.displayName}</span>
              {isOwnCircle && (
                <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground">
                  You
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Banner */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className={cn('h-16 w-full', banner?.gradient)} aria-hidden="true" />
        <div className="space-y-1.5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-foreground">
              {banner ? banner.circleLabel : 'Community Circle'}
            </h3>
            {banner && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent-border bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent-text">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                {banner.displayName}
              </span>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {banner?.description ??
              'Pick a circle to browse rehearsal clips, routines and stage moments from your community.'}
          </p>

          {browsingOther && postBanner && (
            <p className="rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-1.5 text-[10px] leading-relaxed text-warning">
              Browsing {banner?.circleLabel}. You can still post to your own{' '}
              {postBanner.circleLabel} — that is the only circle your account can write to.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TalentBannerPanel;