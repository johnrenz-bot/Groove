'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll behaviour for the sticky site header.
 *
 * The bar is ALWAYS visible — it never hides on scroll down. The one boolean
 * (`scrolled`, set past 8px) deepens its surface, hairline and shadow via
 * `[data-scrolled]`, so the transition to a separated bar reads as one smooth
 * movement. The progress bar is written directly through a ref on every
 * animation frame instead: putting a 0–1 float in state would re-render the
 * whole header on every scroll event, which is the one thing a sticky bar
 * must not do.
 *
 * `resetKey` (callers pass the pathname) re-runs the read on route changes:
 * cached layouts keep their header mounted across navigations, so without it
 * the bar could show the previous page's scrolled state until the next
 * scroll event fires.
 */
export function useHeaderScroll(
  progressRef: React.RefObject<HTMLSpanElement | null>,
  resetKey?: string
) {
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const frame = useRef(0);

  useEffect(() => {
    const read = () => {
      frame.current = 0;
      const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const doc = document.documentElement;
      const max = Math.max(0, doc.scrollHeight - window.innerHeight);
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }

      const nextScrolled = y > 8;

      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
    };

    const onScroll = () => {
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [progressRef, resetKey]);

  return { scrolled };
}

export default useHeaderScroll;
