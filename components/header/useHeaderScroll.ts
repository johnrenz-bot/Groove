'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll behaviour for the sticky header.
 *
 * Two booleans change rarely (past 8px, hidden after 120px downward) and are
 * React state because they drive attributes. The progress bar is written
 * directly through a ref on every animation frame instead: putting a 0–1 float
 * in state would re-render the whole header on every scroll event, which is the
 * one thing a sticky bar must not do.
 */
export function useHeaderScroll(progressRef: React.RefObject<HTMLSpanElement | null>) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const scrolledRef = useRef(false);
  const hiddenRef = useRef(false);
  const lastY = useRef(0);
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
      let nextHidden = hiddenRef.current;
      if (y <= 120) {
        nextHidden = false;
      } else if (y > lastY.current + 6) {
        nextHidden = true;
      } else if (y < lastY.current - 6) {
        nextHidden = false;
      }
      lastY.current = y;

      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
      if (nextHidden !== hiddenRef.current) {
        hiddenRef.current = nextHidden;
        setHidden(nextHidden);
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
  }, [progressRef]);

  return { scrolled, hidden };
}

export default useHeaderScroll;
