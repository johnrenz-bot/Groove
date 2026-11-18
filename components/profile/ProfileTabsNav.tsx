'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface ProfileTab {
  id: string;
  label: string;
  count?: number;
}

/**
 * Profile section tabs — the one implementation for client, coach and the
 * public profile. A scrollable row on mobile (no horizontal page overflow),
 * a hairline-bordered row on desktop. Counts are shown only when supplied.
 */
export function ProfileTabsNav({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Profile sections',
}: {
  tabs: ProfileTab[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Roving focus across the tablist: ArrowLeft/ArrowRight move between tabs
  // without activating them, Home/End jump to the ends. Selection stays on
  // Enter/Space (the buttons' native behaviour).
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'Home' ? -Infinity : event.key === 'End' ? Infinity : 0;
    if (delta === 0) return;
    event.preventDefault();
    const target =
      delta === -Infinity
        ? 0
        : delta === Infinity
          ? tabs.length - 1
          : (index + delta + tabs.length) % tabs.length;
    tabRefs.current[target]?.focus();
  };

  return (
    <div className="mb-6 border-b border-border">
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'inline-flex flex-none cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset',
                active
                  ? 'border-accent-text text-accent-text'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    active ? 'bg-accent-soft text-accent-text' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProfileTabsNav;
