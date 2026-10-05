'use client';

import React, { useEffect, useState } from 'react';
import { LoadingScreen } from './LoadingScreen';

/**
 * AppLoadingSplash renders on initial browser load to mask initial hydration
 * and asset settling, eliminating layout jumping and flashes of unstyled content.
 * It cleanly fades out immediately after the application has mounted.
 */
export function AppLoadingSplash() {
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);
  const [destroyed, setDestroyed] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Begin fade-out as soon as client execution starts
    const fadeTimer = setTimeout(() => {
      setFading(true);
      const destroyTimer = setTimeout(() => {
        setDestroyed(true);
      }, 350);
      return () => clearTimeout(destroyTimer);
    }, 180);

    return () => clearTimeout(fadeTimer);
  }, []);

  // Avoid SSR / client divergence: destroyed once completed
  if (destroyed) return null;

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[999] transition-opacity duration-300 ease-out pointer-events-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <LoadingScreen fullScreen />
    </div>
  );
}

export default AppLoadingSplash;
