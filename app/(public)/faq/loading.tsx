import React from 'react';
import { RouteSkeleton } from '@/components/loading/LoadingState';

/**
 * /faq loading boundary — instant directory skeleton while the shared help
 * center streams. The surrounding shell stays mounted and interactive.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-8">
      <RouteSkeleton variant="list" />
    </div>
  );
}

