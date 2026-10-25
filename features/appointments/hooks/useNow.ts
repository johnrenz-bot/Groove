'use client';

import { useEffect, useState } from 'react';

/**
 * A clock that re-renders the caller on an interval.
 *
 * All relative labels ("5m ago", "Starts in 3h") are computed from this value
 * rather than from Date.now() inside render. That keeps the output stable for a
 * whole tree, and means one interval per page instead of one per card.
 *
 * 30 seconds is deliberate: countdowns are shown to the minute, so a faster
 * tick would spend renders to change nothing.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export default useNow;
