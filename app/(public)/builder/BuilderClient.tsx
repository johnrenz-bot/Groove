'use client';

import dynamic from 'next/dynamic';
import { GrooveSpinner } from '@/components/loading/GrooveSpinner';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * The editor is intentionally client-only and split out of the route's initial
 * bundle. The static shell below paints immediately; the SVG editor loads after
 * hydration so the public header and copy are never blocked by it.
 */
const TeeCustomizer = dynamic(
  () =>
    import('@/features/tee-customizer/components/TeeCustomizer').then(
      (module) => module.TeeCustomizer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <div className="g-card flex min-h-[520px] flex-col items-center justify-center gap-4 p-8">
            <GrooveSpinner variant="play" size="lg" label="Loading the tee customizer" />
            <p className="text-sm font-medium text-muted-foreground">
              Preparing the shirt canvas…
            </p>
          </div>
          <div className="g-card min-h-[520px] p-5">
            <Skeleton className="h-10 w-full" />
            <div className="mt-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

export function BuilderClient() {
  return <TeeCustomizer />;
}

export default BuilderClient;
