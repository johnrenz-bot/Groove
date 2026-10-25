'use client';

import React, { useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeProvider';
import { cn } from '@/components/shared/cn';

/**
 * Compact 3-segment appearance control.
 * Refactored for the unified AccountPanel layout.
 */
export function ThemeModeSelect() {
  const { mode, setThemeMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-40 h-8 bg-muted/20 rounded-full animate-pulse" />;

  const options: Array<{ value: ThemeMode; label: string; icon: React.ElementType }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full border border-accent-border bg-card p-1 shadow-sm"
      role="group"
      aria-label="Appearance"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setThemeMode(value)}
            aria-pressed={active}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ThemeModeSelect;
