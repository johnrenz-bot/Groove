import { RouteSkeleton } from '@/components/loading/LoadingState';

/**
 * Coach portal loading boundary — streamed instantly on slow navigation.
 * The sidebar and header are mounted by the layout and stay fully
 * interactive; only the page content area shows skeletons.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <RouteSkeleton variant="widgets" />
    </div>
  );
}

