'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Route-level entrance transition.
 *
 * This used to be a Framer `motion.div` with a `useEffect` + `matchMedia`
 * subscription. The CSS animation below is equivalent, but it costs no React
 * state, no subscription and no JS-driven transform updates — and the
 * `prefers-reduced-motion` branch is handled by the stylesheet, so there is no
 * first-frame animation before a media-query effect can run.
 *
 * The keyed wrapper mirrors the previous behaviour: a new route remounts the
 * wrapper and replays the entrance. Only opacity and a 6px transform animate,
 * so the transition can never move layout around.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-enter w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}

export default PageTransition;
