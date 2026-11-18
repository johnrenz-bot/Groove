import React from 'react';
import { RouteSkeleton } from '@/components/loading/LoadingState';

/**
 * /about-project loading boundary — hero + article skeleton while the
 * capstone write-up streams. The surrounding shell stays mounted.
 */
export default function Loading() {
  return (
    <div className="w-full">
      <RouteSkeleton variant="hero" />
    </div>
  );
}

