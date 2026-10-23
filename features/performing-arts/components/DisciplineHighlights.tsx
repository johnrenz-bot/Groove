'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { DisciplineHighlight } from '../data/disciplineMeta';

export interface DisciplineHighlightsProps {
  items: DisciplineHighlight[];
  /**
   * When provided, a card applies the matching category/search to the live
   * update feed and scrolls to it. The href remains on the card for keyboard
   * users, middle-clicks and open-in-new-tab.
   */
  onSelect?: (item: DisciplineHighlight) => void;
  className?: string;
}

/**
 * The four main content cards that sit directly beneath the page header.
 *
 * Layout is 1 / 2 / 4 columns, cards are a compact p-4, descriptions are
 * clamped to two lines, metadata is muted, and the hover treatment is a
 * restrained amber/gold edge rather than a lift or a shadow.
 */
export function DisciplineHighlights({
  items,
  onSelect,
  className,
}: DisciplineHighlightsProps) {
  return (
    <ul
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}
      aria-label="Performing arts categories"
    >
      {items.map((item) => {
        const Icon = item.icon;

        /*
         * Keep a real href on the card. The click handler below applies the
         * filter in-place, but middle-click / open-in-new-tab / keyboard users
         * still get the same category and search as a shareable URL.
         */
        const params = new URLSearchParams();
        if (item.filter.category) params.set('category', item.filter.category);
        if (item.filter.query) params.set('q', item.filter.query);
        const query = params.toString();
        const href = `${query ? `?${query}` : ''}#latest-updates`;

        const cardContent = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--crew-border-accent)] bg-[var(--brand-sunburst-soft)] text-[var(--crew-accent-gold)]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="rounded-full border border-[var(--crew-border-accent)] bg-[var(--brand-sunburst-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--crew-accent-gold)]">
                {item.status}
              </span>
            </div>

            <h2 className="mt-3 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--crew-accent-gold)]">
              {item.title}
            </h2>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            <p className="mt-auto flex items-center gap-1 pt-3 text-[10px] text-muted-foreground/80">
              <span className="line-clamp-1">{item.meta}</span>
              <ArrowUpRight
                className="ml-auto h-3 w-3 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </p>
          </>
        );

        return (
          <li key={item.id} className="h-full">
            <Link
              href={href}
              onClick={(event) => {
                if (!onSelect) return;
                event.preventDefault();
                onSelect(item);
              }}
              className={cn(
                'group flex h-full flex-col rounded-xl border border-border/70 bg-card/50 p-4',
                'transition-colors duration-200 hover:border-[var(--crew-border-hover)] hover:bg-[var(--crew-bg-hover)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'motion-reduce:transition-none'
              )}
            >
              {cardContent}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default DisciplineHighlights;
