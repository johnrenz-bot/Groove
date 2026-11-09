import { RouteSkeleton } from '@/components/loading/LoadingState';

/** Admin console loading boundary — instant skeleton on slow segments. */
export default function Loading() {
  return <RouteSkeleton variant="list" />;
}
