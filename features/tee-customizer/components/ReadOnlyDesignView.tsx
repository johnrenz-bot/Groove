'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { TEE_FIT_COPY, TEE_PATTERNS } from '../constants';
import type { TeeDesign, TeeView } from '../types';
import { PreviewStage } from './PreviewStage';

/** Read-only view shown at /builder/share/[shareId]. */
export function ReadOnlyDesignView({ design }: { design: TeeDesign }) {
  const [view, setView] = useState<TeeView>(design.view);
  const router = useRouter();
  const previewDesign = useMemo(() => ({ ...design, view }), [design, view]);
  const pattern = TEE_PATTERNS.find((entry) => entry.id === design.pattern);
  const chestText = design.texts[0];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/builder"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Open the customizer
        </Link>
        <Badge variant="accent" className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          View only
        </Badge>
      </div>

      <header className="mb-5 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--crew-accent-gold)]">
          Shared design
        </p>
        <h1 className="g-title mt-2">{design.name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          A Groove PH concept-kit tee shared with you. The owner can keep editing; this
          page is a read-only preview.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <PreviewStage design={previewDesign} onViewChange={setView} />

        <aside className="space-y-4">
          <section className="g-card p-5">
            <h2 className="text-sm font-bold text-foreground">Design details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-semibold text-foreground">Groove concept tee</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground">Fit</dt>
                <dd className="font-semibold text-foreground">
                  {TEE_FIT_COPY[design.fit]?.label ?? design.fit}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-semibold text-foreground">{design.size}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground">Pattern</dt>
                <dd className="font-semibold text-foreground">{pattern?.label ?? design.pattern}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground">Chest text</dt>
                <dd className="max-w-[55%] truncate text-right font-semibold text-foreground">
                  {chestText?.text || '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground">Back print</dt>
                <dd className="font-semibold text-foreground">
                  {design.back.visible
                    ? [design.back.name, design.back.number].filter(Boolean).join(' · ') || '—'
                    : 'Hidden'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-semibold text-foreground">{formatDate(design.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="g-card p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
              Make it yours
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Start from a blank canvas and build your own colorway, pattern and back print.
              No cart or checkout.
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => router.push('/builder')}
            >
              Open the customizer
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default ReadOnlyDesignView;
