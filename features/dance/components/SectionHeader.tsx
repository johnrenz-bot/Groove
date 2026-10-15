'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

interface SectionHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  /** Right-side slot: counts, links, actions. */
  meta?: React.ReactNode;
  className?: string;
}

/**
 * One header shape for every dance-page section (Upcoming Events, Latest
 * Updates, Featured Crews): gold eyebrow, serif title with italic accent,
 * muted description, optional right-aligned meta. Keeps the page reading as
 * one editorial surface instead of five separately-styled blocks.
 */
export function SectionHeader({ eyebrow, title, description, meta, className = '' }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <span className="g-eyebrow mb-2">{eyebrow}</span>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {meta && <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}

export default SectionHeader;
