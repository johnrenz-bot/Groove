'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/components/shared/cn';

/**
 * The theme switch — the only control in the app that changes the theme. It
 * delegates to `useTheme()` and holds no theme state of its own, so there is no
 * second copy to fall out of sync with the provider.
 *
 * Because the provider reads from the DOM via useSyncExternalStore, the icon is
 * correct on the very first paint after hydration, including on a page the user
 * arrived at directly.
 */
export function ThemeToggle({
  className,
  /** Bare icon button for tight bars, or a labelled pill for page headers. */
  variant = 'icon',
}: {
  className?: string;
  variant?: 'icon' | 'pill';
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          className
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      // `g-topbar-action` so the header's icon controls share one hit target and
      // one hover treatment — the toggle must not read as a different control
      // from the notifications bell beside it.
      className={cn('g-topbar-action cursor-pointer', className)}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}

export default ThemeToggle;