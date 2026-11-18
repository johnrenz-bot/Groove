'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';

/**
 * Floating "back to top" control.
 *
 * Two scroll containers exist in this app: the window (marketing, auth and
 * public pages) and the dashboard shell's own `.dash-content` scroller. This
 * button tracks both and returns the active one to the top.
 */
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

    const readScroll = () => {
      const dash = document.querySelector<HTMLElement>('.dash-content');
      return dash ? dash.scrollTop : window.scrollY || document.documentElement.scrollTop;
    };

    const update = () => {
      const currentScrollY = readScroll();
      const nextVisible = currentScrollY > 350;
      // setState on every scroll frame would re-render the button even when
      // its visibility has not changed.
      if (nextVisible !== visibleRef.current) {
        visibleRef.current = nextVisible;
        setVisible(nextVisible);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // The dashboard scroller is a plain element, not the window — listen on
    // it too. Attaching the same listener twice to the same node is a no-op.
    const dash = document.querySelector<HTMLElement>('.dash-content');
    if (dash) dash.addEventListener('scroll', onScroll, { passive: true });

    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (dash) dash.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const handleScrollTop = () => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dash = document.querySelector<HTMLElement>('.dash-content');
    if (dash) {
      dash.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    scrollTo(0, { duration: reduceMotion ? 0 : 1.15 });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      aria-label="Back to top"
      title="Back to top"
      className={`group fixed z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/85 text-foreground shadow-[var(--shadow-md)] backdrop-blur-md transition-all duration-300 hover:border-accent-border hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--shadow-accent)] hover:-translate-y-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background animate-in fade-in zoom-in-90 ${
        isDashboardRoute
          ? 'bottom-[92px] right-4 sm:bottom-24 sm:right-6'
          : 'bottom-5 right-5 sm:bottom-6 sm:right-6'
      }`}
    >
      <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
      <span className="sr-only">Back to top</span>
    </button>
  );
}

export default BackToTopButton;

