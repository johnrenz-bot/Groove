'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ViewTransition } from 'react';

/**
 * Route-level entrance transition.
 *
 * Uses React's `<ViewTransition>` (Next 16 / React 19) so Suspense
 * reveals crossfade with direction, and falls back to the CSS
 * `page-enter` animation everywhere else — including browsers
 * without View Transition support and `prefers-reduced-motion`.
 * The keyed wrapper remounts per route, so every navigation gets
 * a fresh entrance without any JS-driven transform loop.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition
      name="page-content"
      share="auto"
      enter="auto"
      default="none"
      key={pathname ?? 'root'}
    >
      <div className="page-enter w-full flex-1 flex flex-col">{children}</div>
    </ViewTransition>
  );
}

export default PageTransition;
