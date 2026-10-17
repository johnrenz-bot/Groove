'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';

export interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollTo: (
    target: number | string | HTMLElement,
    options?: {
      offset?: number;
      duration?: number;
      immediate?: boolean;
      lock?: boolean;
      onComplete?: () => void;
    }
  ) => void;
  isReady: boolean;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollTo: () => {},
  isReady: false,
});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Initialize Lenis with settings calibrated to match course.marwieang.com
    const instance = new Lenis({
      duration: prefersReducedMotion ? 0.01 : 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
      infinite: false,
      autoRaf: true,
      anchors: {
        offset: -84, // Account for sticky header height + clearance
        duration: prefersReducedMotion ? 0.01 : 1.1,
      },
      stopInertiaOnNavigate: true,
      respectReducedMotion: true,
      prevent: (node) => {
        // Prevent Lenis smooth wheel hijacking inside modals, dialogs, or designated containers
        if (!node) return false;
        return (
          node.hasAttribute('data-lenis-prevent') ||
          node.closest('[data-lenis-prevent]') !== null ||
          node.closest('[role="dialog"]') !== null ||
          node.closest('.g-scroll') !== null
        );
      },
    });

    lenisRef.current = instance;
    setLenis(instance);
    setIsReady(true);

    // Watch for modal body lock (document.body.style.overflow = 'hidden')
    const bodyObserver = new MutationObserver(() => {
      if (typeof document === 'undefined') return;
      const isLocked =
        document.body.style.overflow === 'hidden' ||
        document.documentElement.style.overflow === 'hidden' ||
        document.body.hasAttribute('data-modal-open');

      if (isLocked) {
        instance.stop();
      } else {
        instance.start();
      }
    });

    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-modal-open'],
    });

    // Global smooth anchor link listener for extra reliability across dynamic content
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;

      // Only handle in-page hash links (e.g., "#disciplines", "#how", "#faq")
      if (href.startsWith('#') && href.length > 1) {
        const targetElement = document.getElementById(href.slice(1));
        if (targetElement) {
          e.preventDefault();
          instance.scrollTo(targetElement, {
            offset: -84,
            duration: prefersReducedMotion ? 0.01 : 1.15,
          });
          // Update URL hash without jumping
          if (history.pushState) {
            history.pushState(null, '', href);
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, { passive: false });

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      bodyObserver.disconnect();
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
      setIsReady(false);
    };
  }, []);

  // On client-side pathname change, scroll to top smoothly (or instant if preferred)
  useEffect(() => {
    if (!lenisRef.current) return;
    // Don't scroll to top if URL has a hash intended for this page
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashTarget = document.getElementById(window.location.hash.slice(1));
      if (hashTarget) {
        lenisRef.current.scrollTo(hashTarget, { offset: -84, immediate: true });
        return;
      }
    }
    lenisRef.current.scrollTo(0, { immediate: true });
  }, [pathname]);

  const scrollTo = (
    target: number | string | HTMLElement,
    options?: {
      offset?: number;
      duration?: number;
      immediate?: boolean;
      lock?: boolean;
      onComplete?: () => void;
    }
  ) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, options);
    } else if (typeof window !== 'undefined') {
      if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: options?.immediate ? 'auto' : 'smooth' });
      } else if (typeof target === 'string') {
        const el = document.querySelector(target);
        el?.scrollIntoView({ behavior: options?.immediate ? 'auto' : 'smooth' });
      } else if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: options?.immediate ? 'auto' : 'smooth' });
      }
    }
  };

  return (
    <SmoothScrollContext.Provider value={{ lenis, scrollTo, isReady }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

export default SmoothScrollProvider;
