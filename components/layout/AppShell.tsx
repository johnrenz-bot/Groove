'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

/**
 * Main application frame: the shared top navigation, then a centred content
 * column. There is no left rail — the header is the navigation for every role,
 * so the content gets the full width of the viewport and one consistent
 * 1240px measure that lines up with `.hx-header-inner`.
 */
export function AppShell({ children, header, className = '' }: AppShellProps) {
  return (
    <div
      className={cn(
        'relative isolate min-h-screen bg-background font-sans text-foreground',
        className
      )}
    >
      <div className="relative z-10 flex min-h-screen flex-col">
        {header}
        <main id="main-content" tabIndex={-1} className="relative z-10 flex-1">
          {/* Same 1240px measure and inline inset as `.hx-header-inner`
              (1.25rem, then 2rem from `sm`) so the content column and the header
              it sits under share one edge at every width. */}
          <div className="mx-auto w-full max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
