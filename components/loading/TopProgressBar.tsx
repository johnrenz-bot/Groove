'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/shared/cn';

/**
 * The ONE route-transition loader.
 *
 * A 2px Groove-orange hairline pinned to the top of the viewport. It
 * appears ONLY when a navigation is still pending after ~200ms (fast loads
 * show nothing), and once shown it stays for at least ~300ms so it never
 * flickers. It never covers the sidebar, the header, or the content —
 * it is an indicator, not a blocker. No spinners, no modals, no text.
 *
 * Driven by <usePathname>, so browser back/forward, router.push/replace
 * and prefetched navigations are all covered. A missed completion can
 * never stick because pathname is the source of truth.
 */

type Phase = 'idle' | 'pending' | 'showing' | 'leaving';

export function TopProgressBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const showTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);

  const clear = useCallback((ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) window.clearTimeout(ref.current);
    ref.current = null;
  }, []);

  const start = useCallback(() => {
    clear(showTimer);
    clear(leaveTimer);
    shownAt.current = null;
    setPhase('pending');
    showTimer.current = window.setTimeout(() => {
      showTimer.current = null;
      shownAt.current = Date.now();
      setPhase('showing');
    }, 200);
  }, [clear]);

  const complete = useCallback(() => {
    clear(showTimer);
    setPhase((current) => {
      if (current === 'idle') return current;
      if (current === 'pending') return 'idle';
      // 'showing' (or already 'leaving'): hold for at least 300ms, then fade.
      const elapsed = shownAt.current ? Date.now() - shownAt.current : 0;
      const remaining = Math.max(0, 300 - elapsed);
      clear(leaveTimer);
      leaveTimer.current = window.setTimeout(() => {
        leaveTimer.current = null;
        setPhase('idle');
      }, remaining + 200);
      return 'leaving';
    });
  }, [clear]);

  // Prime on any same-document navigation attempt.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }
      start();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [start]);

  // Complete whenever the route actually settles (covers back/forward,
  // router.push/replace and prefetched navigations).
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle semantics
  }, [pathname]);

  // Safety net: never stuck even if a navigation is aborted.
  useEffect(() => {
    if (phase !== 'pending' && phase !== 'showing') return;
    const safety = window.setTimeout(() => complete(), 10000);
    return () => window.clearTimeout(safety);
  }, [phase, complete]);

  useEffect(
    () => () => {
      clear(showTimer);
      clear(leaveTimer);
    },
    [clear]
  );

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const visible = phase === 'showing' || phase === 'leaving';

  return (
    <div
      role="status"
      aria-label="Loading"
      aria-busy={visible}
      aria-live="polite"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[1500] h-[2px] overflow-hidden transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 block w-full origin-left',
          visible && !reduceMotion && 'animate-tpb-sweep',
          'bg-gradient-to-r from-transparent via-accent to-accent-hover'
        )}
        style={{ boxShadow: '0 0 8px 0 rgba(245,138,24,0.55)' }}
      />
    </div>
  );
}

export default TopProgressBar;

