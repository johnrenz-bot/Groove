'use client';

import React from 'react';
import { LANGUAGES, useLanguage } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/components/shared/cn';

/**
 * EN | TL segmented switcher for dashboard navbars (Admin, Coach, Client).
 * Refactored for the unified AccountPanel layout.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-accent-border bg-card p-1 shadow-sm',
        className
      )}
      role="group"
      aria-label="Language / Wika"
    >
      {LANGUAGES.map(({ value, short, label }) => {
        const active = language === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            aria-pressed={active}
            title={label}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-accent text-accent-foreground shadow-sm scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
