import { RouteSkeleton } from '@/components/loading/LoadingState';

/**
 * Native App Router loading boundary for the client portal.
 * Streams a geometry-true skeleton instantly on navigation instead
 * of leaving the previous page frozen or flashing blank.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px]" aria-label="Loading">
      <RouteSkeleton variant="dashboard" />
    </div>
  );
}
