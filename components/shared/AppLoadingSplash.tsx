'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '@/components/loading/LoadingScreen';

/**
 * AppLoadingSplash — the branded GroovePH logo splash, and ONLY for the
 * first load of a browser session.
 *
 * - Shown exclusively when no `groove-splash-seen` flag exists in
 *   sessionStorage (i.e. the first load of the session).
 * - Visible for at most ~800ms; fades out and unmounts.
 * - Never shown on route changes or in-session navigation — those are
 *   covered by <TopProgressBar /> and the route-level loading boundaries.
 * - Honours prefers-reduced-motion (no motion beyond the fade).
 * - sessionStorage can be blocked (private mode) — in that case nothing
 *   renders, which is the safer default for a fast load.
 */
export function AppLoadingSplash() {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);
  const [destroyed, setDestroyed] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem('groove-splash-seen') === '1';
    } catch {
      seen = true; // blocked storage: skip the splash rather than risk a stuck overlay
    }
    if (seen) {
      setDestroyed(true);
      return;
    }

    setShow(true);
    try {
      window.sessionStorage.setItem('groove-splash-seen', '1');
    } catch {
      /* storage blocked — splash still fades out after the max */
    }

    const dismiss = () => {
      if (done.current) return;
      done.current = true;
      setFading(true);
      window.setTimeout(() => setDestroyed(true), 350);
    };
    const timer = window.setTimeout(dismiss, 800);
    const safety = window.setTimeout(dismiss, 1500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safety);
    };
  }, []);

  if (!show || destroyed) return null;

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[1400] transition-opacity duration-300 ease-out ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <LoadingScreen fullScreen message="Preparing your creative space…" />
    </div>
  );
}

export default AppLoadingSplash;

