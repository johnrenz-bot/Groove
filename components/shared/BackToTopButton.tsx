'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const { scrollTo } = useSmoothScroll();
  const pathname = usePathname();

  // Check if we are on a dashboard route where Groovey floating assistant might be active
  const isDashboardRoute =
    pathname?.startsWith('/client') ||
    pathname?.startsWith('/coach');

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop;
          setVisible(currentScrollY > 350);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial check
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleScrollTop = () => {
    scrollTo(0, { duration: 1.15 });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/85 text-foreground shadow-[var(--shadow-md)] backdrop-blur-md transition-all duration-300 hover:border-accent hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--shadow-accent)] hover:-translate-y-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent animate-in fade-in zoom-in-90 ${
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
