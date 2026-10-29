'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const { scrollTo } = useSmoothScroll();
  const pathname = usePathname();

  // Check if we are on a dashboard route where Groovey floating assistant might be active
  const isDashboardRoute =
    pathname?.startsWith('/client') ||
    pathname?.startsWith('/coach');

  useEffect(() => {
    let ticking = false;
    let frame = 0;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY || document.documentElement.scrollTop;
        const nextVisible = currentScrollY > 350;
        // setState on every scroll frame would re-render the button even when
        // its visibility has not changed.
        if (nextVisible !== visibleRef.current) {
          visibleRef.current = nextVisible;
          setVisible(nextVisible);
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleScrollTop = () => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scrollTo(0, { duration: reduceMotion ? 0 : 1.15 });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      aria-label="Back to top"
      title="Back to top"
      className={`group fixed z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/85 text-foreground shadow-[var(--shadow-md)] backdrop-blur-md transition-all duration-300 hover:border-accent hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--shadow-accent)] hover:-translate-y-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent animate-in fade-in zoom-in-90 ${
        isDashboardRoute
          ? 'bottom-20 right-5 sm:bottom-24 sm:right-6'
          : 'bottom-5 right-5 sm:bottom-6 sm:right-6'
      }`}
    >
      <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
      <span className="sr-only">Back to top</span>
    </button>
  );
}

export default BackToTopButton;
