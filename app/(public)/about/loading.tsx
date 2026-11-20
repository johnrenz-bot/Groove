import React from 'react';
import { RouteSkeleton } from '@/components/ui/LoadingState';

/**
 * /about loading boundary — hero + feature-grid skeleton while the shared
 * informational page streams. The surrounding shell (public layout or
 * dashboard chrome) is mounted by the page and stays fully interactive.
 */
export default function Loading() {
  return (
    <div className="w-full">
      <RouteSkeleton variant="hero" />
    </div>
  );
}

