'use client';

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Sparkles, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export type DirectoryTabValue = 'coaches' | 'community';

interface TabDef {
  id: DirectoryTabValue;
  label: string;
  icon: LucideIcon;
}

const TABS: readonly TabDef[] = [
  { id: 'coaches', label: 'Coach Directory', icon: Users },
  { id: 'community', label: 'Community Showcase', icon: Sparkles },
] as const;

/**
 * Accessible segmented control for the directory views.
 *
 * role="tablist" with a shared track and ONE orange pill that slides between
 * the two tabs (measured from the DOM, never guessed). Line icons only;
 * the pill is the single orange surface in the header.
 */
export function DirectoryTabs({
  value,
  onChange,
  className,
}: {
  value: DirectoryTabValue;
  onChange: (tab: DirectoryTabValue) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<DirectoryTabValue, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const btn = buttonRefs.current[value];
    if (!track || !btn) return;
    const t = track.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setPill({ left: b.left - t.left, width: b.width });
  }, [value]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="Directory sections"
      className={cn(
        'relative flex w-full items-stretch gap-1 rounded-2xl border border-white/5 bg-[#161616] p-1 shadow-[var(--shadow-sm)] sm:w-fit',
        className
      )}
    >
      {/* Sliding active pill — purely decorative, sized from the active tab */}
      {pill && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 rounded-xl bg-gradient-to-r from-accent to-accent-hover shadow-[var(--shadow-sm)] transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {TABS.map((tab) => {
        const selected = value === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[tab.id] = el;
            }}
            id={`directory-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`directory-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative z-10 inline-flex min-h-[40px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616] sm:flex-none sm:px-5',
              selected ? 'text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DirectoryTabs;

