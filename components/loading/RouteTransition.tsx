'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/shared/cn';
import { EqualizerBars } from './GrooveSpinner';

/**
 * RouteLoadingIndicator — the navigation hairline + slow-route overlay.
 *
 * Fast navigations get only the 2px gold hairline (no full-screen block,
 * no layout shift). If a navigation is still pending after 400ms the
 * soft overlay appears so the user is never staring at a blank previous
 * page. Browser back/forward works because the overlay is driven by
 * `pathname` changes, not by link clicks alone.
 *
 * Implementation notes:
 * - Link clicks prime the indicator; the pathname change completes it.
 *   This covers both directions without intercepting Next's router.
 * - All timers are cleaned up; a missed completion can never stick
 *   because `pathname` is the source of truth.
 * - Duplicate instances are safe: only one timer per mounted instance
 *   and the component is mounted once in the root layout.
 */
export function RouteLoadingIndicator({ className }: { className?: string }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const pendingSince = useRef<number | null>(null);
  const overlayTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (overlayTimer.current !== null) window.clearTimeout(overlayTimer.current);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    overlayTimer.current = null;
    hideTimer.current = null;
  }, []);

  const start = useCallback(() => {
    pendingSince.current = Date.now();
    setActive(true);
    setShowOverlay(false);
    if (overlayTimer.current !== null) window.clearTimeout(overlayTimer.current);
    if (reduce) return;
    overlayTimer.current = window.setTimeout(() => {
      setShowOverlay(true);
    }, 450);
  }, [reduce]);

  const complete = useCallback(() => {
    pendingSince.current = null;
    if (overlayTimer.current !== null) window.clearTimeout(overlayTimer.current);
    overlayTimer.current = null;
    setShowOverlay(false);
    // Let the hairline finish its sweep before it fades.
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setActive(false), reduce ? 0 : 320);
  }, [reduce]);

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
  // router.push/replace, and prefetched navigations).
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    complete();
  }, [pathname, complete]);

  // Safety net: never stuck even if a navigation is aborted.
  useEffect(() => {
    if (!active) return;
    const safety = window.setTimeout(() => complete(), 10000);
    return () => window.clearTimeout(safety);
  }, [active, complete]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <>
      {/* Hairline progress */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="route-bar"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              scaleX: { duration: reduce ? 0 : 1.4, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: reduce ? 0 : 0.2 },
            }}
            aria-hidden="true"
            className={cn('fixed inset-x-0 top-0 z-[1500] h-[2px] origin-left', className)}
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(245,196,81,0.9) 30%, #FFD36B 60%, rgba(245,196,81,0.9))',
              boxShadow: '0 0 12px rgba(245,196,81,0.45)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Slow-route overlay — only when navigation is genuinely pending */}
      <AnimatePresence>
        {showOverlay && !reduce && (
          <motion.div
            key="route-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            aria-label="Navigating"
            className="pointer-events-none fixed inset-0 z-[1350] flex items-center justify-center bg-black/45 backdrop-blur-[6px]"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3 rounded-[24px] border border-[rgba(245,196,81,0.18)] bg-card/95 px-8 py-6 backdrop-blur-[20px]"
              style={{
                boxShadow:
                  '0 24px 64px -16px rgba(0,0,0,0.45), 0 0 40px -12px rgba(245,196,81,0.18)',
              }}
            >
              <EqualizerBars bars={14} height={22} />
              <p className="text-[13px] font-medium tracking-[0.02em] text-muted-foreground">
                Setting the rhythm…
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default RouteLoadingIndicator;
