import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Route-level loading state for the performing arts hub.
 * Mirrors the page rhythm (hero, grid rows, list) so layout does not shift
 * when the content resolves.
 */
export default function Loading() {
  return (
    <div
      className="dark-only-page flex min-h-screen flex-col bg-background font-sans text-foreground"
      role="status"
      aria-live="polite"
      aria-label="Loading performing arts hub"
    >
      <span className="sr-only">Loading Filipino Performing Arts Philippines…</span>

      {/* Hero */}
      <div className="border-b border-border">
        <div className="g-container py-16 sm:py-24">
          <Skeleton className="h-6 w-52 rounded-full" />
          <Skeleton className="mt-5 h-12 w-full max-w-2xl" />
          <Skeleton className="mt-3 h-12 w-full max-w-xl" />
          <Skeleton className="mt-6 h-6 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-6 w-full max-w-xl" />
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-11 w-40 rounded-full" />
            <Skeleton className="h-11 w-52 rounded-full" />
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="g-container py-16">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-9 w-full max-w-lg" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="g-card">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>

      {/* List rows */}
      <div className="g-container pb-20">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 border-t border-divider py-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}