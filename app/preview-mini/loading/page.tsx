'use client';

import React, { useState } from 'react';
import { GrooveSpinner, EqualizerBars } from '@/components/loading/GrooveSpinner';
import { LoadingState, RouteSkeleton } from '@/components/loading/LoadingState';
import { LoadingModal } from '@/components/loading/LoadingModal';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import { DashboardSkeleton, SkeletonCard, SkeletonGrid } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

/**
 * Developer preview: every Groove loading state in one place.
 * Visit /preview-mini/loading to verify without waiting for real fetches.
 */
export default function LoadingPreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProgress, setModalProgress] = useState(0);
  const [btnLoading, setBtnLoading] = useState(false);
  const [screenKey, setScreenKey] = useState(0);
  const [showScreen, setShowScreen] = useState(false);

  const openModal = () => {
    setModalOpen(true);
    setModalProgress(0);
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min(100, Math.round(((Date.now() - t0) / 2200) * 100));
      setModalProgress(p);
      if (p < 100) window.setTimeout(tick, 80);
      else window.setTimeout(() => setModalOpen(false), 500);
    };
    window.setTimeout(tick, 120);
  };

  const toggleButton = () => {
    setBtnLoading(true);
    window.setTimeout(() => setBtnLoading(false), 2200);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-5 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-text">
          Groove Loading System
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
          Cinematic loading, everywhere
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          One spinner, one visualizer, one modal and one splash — shared by auth, dashboards,
          data, uploads and route transitions. All motion is transform/opacity and respects
          reduced-motion.
        </p>
      </header>

      <section className="g-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-foreground">Spinner variants</h2>
        <div className="flex flex-wrap items-center gap-8">
          {(['orbit', 'play', 'bars', 'pulse', 'morph', 'dots'] as const).map((v) => (
            <div key={v} className="flex flex-col items-center gap-2">
              <GrooveSpinner variant={v} size="lg" label={v} />
              <span className="text-xs text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
        <EqualizerBars bars={24} height={30} className="pt-3" />
      </section>

      <section className="g-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-foreground">States</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={openModal}>Open loading modal</Button>
          <Button variant="secondary" onClick={toggleButton} loading={btnLoading}>
            Button loading
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setScreenKey((k) => k + 1);
              setShowScreen(true);
              window.setTimeout(() => setShowScreen(false), 2600);
            }}
          >
            Preview splash (2.6s)
          </Button>
        </div>
      </section>

      <section className="g-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Inline + skeletons</h2>
        <LoadingState label="Gathering the ensemble…" hint="This is the inline pattern for lists and tables." />
        <div className="mt-6">
          <RouteSkeleton variant="dashboard" />
        </div>
        <div className="mt-6">
          <SkeletonGrid count={3} />
        </div>
        <div className="mt-6">
          <DashboardSkeleton />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>

      {showScreen && (
        <div className="fixed inset-0 z-[1600]">
          <LoadingScreen key={screenKey} fullScreen minDuration={2200} />
        </div>
      )}

      <LoadingModal
        open={modalOpen}
        title="Preparing your space…"
        description="This is the floating glass pattern for auth, uploads and processing."
        message={modalProgress >= 100 ? 'Almost ready…' : 'Setting the rhythm…'}
        progress={modalProgress}
      />
    </main>
  );
}
