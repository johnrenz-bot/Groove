'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

/**
 * Smooth scroll coordinator using Lenis.
 *
 * Provides smooth scrolling without hijacking the native scroll behavior.
 * Integrates with Framer Motion's scroll animations and respects
 * prefers-reduced-motion.
 *
 * This hook is designed to be called only once at the root level to
 * avoid duplicate scroll listeners.
 */
let lenisInstance: Lenis | null = null;
let isInitialized = false;

export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) {
      lenisRef.current = lenisInstance;
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      isInitialized = true;
      return;
    }

    // Initialize Lenis with smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisInstance = lenis;
    lenisRef.current = lenis;
    isInitialized = true;

    // Integrate with Framer Motion's scroll progress
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenis.destroy();
      lenisInstance = null;
      isInitialized = false;
    };
  }, []);

  return lenisRef;
}
