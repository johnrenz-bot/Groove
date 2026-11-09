'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '@/components/loading/LoadingScreen';

/**
 * AppLoadingSplash renders on initial browser load to mask initial
 * hydration and asset settling. It fades out as soon as the client has
 * mounted, with two safety nets (max 3.5s) so it can never trap the
 * user behind a stuck overlay.
 */
export function AppLoadingSplash() {
  const [fading, setFading] = useState(false);
  const [destroyed, setDestroyed] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const dismiss = () => {
      if (done.current) return;
      done.current = true;
      setFading(true);
      window.setTimeout(() => setDestroyed(true), 450);
    };
    const t = window.setTimeout(dismiss, 180);
    const safety = window.setTimeout(dismiss, 3500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(safety);
    };
  }, []);

  if (destroyed) return null;

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[1400] transition-opacity duration-500 ease-out ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <LoadingScreen fullScreen message="Preparing your creative space…" />
    </div>
  );
}

export default AppLoadingSplash;
