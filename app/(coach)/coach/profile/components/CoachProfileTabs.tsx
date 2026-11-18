'use client';

import type { Tab } from '../types/coachProfile.types';

/**
 * Coach profile tab bar. Reconstructed after being deleted during the profile
 * UI redesign — the redesign moved both roles to a shared tabs component
 * (components/profile/ProfileTabsNav.tsx), so this file is kept only so the
 * pre-redesign code path remains buildable if referenced.
 */
interface CoachProfileTabsProps {
  tabs: { id: Tab; label: string; count?: number }[];
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export function CoachProfileTabs({ tabs, activeTab, onChange }: CoachProfileTabsProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === tab.id
              ? 'border-accent-text text-accent-text'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
