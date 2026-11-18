import React from 'react';
import { RouteSkeleton } from '@/components/loading/LoadingState';

/**
 * Community (performing arts) loading boundary — instant editorial/hero
 * skeleton while the discipline page streams. The shell around the content
 * (public header or dashboard chrome) stays mounted.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-8">
      <RouteSkeleton variant="hero" />
    </div>
  );
}

