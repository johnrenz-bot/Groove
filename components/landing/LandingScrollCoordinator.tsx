'use client';

import React, { useEffect, useRef } from 'react';
import { useSmoothScroll } from './useSmoothScroll';

/**
 * LandingScrollCoordinator - Manages scroll behavior for the landing page.
 *
 * Initializes smooth scrolling (via Lenis) and coordinates section transitions.
 * This is a client component that wraps the entire landing page content.
 */
export function LandingScrollCoordinator({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  useSmoothScroll();

  return (
    <main ref={mainRef} id="main" className="flex-1 relative z-10">
      {children}
    </main>
  );
}

export default LandingScrollCoordinator;
