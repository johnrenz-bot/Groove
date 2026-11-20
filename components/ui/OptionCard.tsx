'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

/**
 * Selectable option row for modals (e.g. "Upload Resume / Create Resume").
 * Unselected: --bg-surface-2 bg, 1px --border. Selected: 1px --accent border,
 * --accent-soft tint, accent icon, filled accent radio.
 */
export function OptionCard({ selected, onSelect, icon, title, description, className }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-4 rounded-[12px] border p-4 text-left transition-colors',
        selected
          ? 'border-accent bg-accent-soft'
          : 'border-border bg-surface-2 hover:border-border-strong hover:bg-hover',
        className
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
          selected ? 'bg-accent-soft text-accent' : 'bg-surface text-muted-foreground'
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold', selected ? 'text-foreground' : 'text-foreground')}>{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-accent bg-accent' : 'border-border-strong bg-surface'
        )}
        aria-hidden="true"
      >
        {selected && <span className="h-2 w-2 rounded-full bg-accent-contrast" />}
      </span>
    </button>
  );
}

export default OptionCard;