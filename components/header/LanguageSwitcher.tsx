'use client';

import React from 'react';
import { LANGUAGES, useLanguage } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/components/shared/cn';

/**
 * EN | TL segmented switcher for dashboard navbars (Admin, Coach, Client).
 *
 * Rendered ONLY for signed-in dashboard users — public/auth pages stay
 * English-only by never mounting this. Compact pill that fits the header
 * action cluster and the mobile drawer alike.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-card p-0.5',
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
              'rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
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
