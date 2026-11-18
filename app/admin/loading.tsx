import React from 'react';
import { RouteSkeleton } from '@/components/loading/LoadingState';

/**
 * Admin console loading boundary — instant skeleton on slow segments.
 * The admin layout and its sidebar stay mounted; only the content area
 * shows the skeleton.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <RouteSkeleton variant="list" />
    </div>
  );
}

