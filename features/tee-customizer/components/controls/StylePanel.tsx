'use client';

import React from 'react';
import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { TEE_FITS, TEE_FIT_COPY } from '../../constants';
import type { TeeDesign } from '../../types';
import { ControlGroup } from './Fields';

export function StylePanel({
  design,
  onPatch,
  onRandomize,
}: {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
  onRandomize: () => void;
}) {
  return (
    <div className="space-y-6">
      <ControlGroup label="Fit" hint={TEE_FIT_COPY[design.fit]?.description}>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Shirt fit">
          {TEE_FITS.map((fit) => (
            <button
              key={fit}
              type="button"
              aria-pressed={design.fit === fit}
              onClick={() => onPatch({ fit })}
              className={cn(
                'cursor-pointer rounded-[12px] border px-2 py-3 text-center text-sm font-semibold transition-colors',
                design.fit === fit
                  ? 'border-accent-border bg-accent-soft text-accent-text'
                  : 'border-border bg-card/60 text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground'
              )}
            >
              {TEE_FIT_COPY[fit]?.label ?? fit}
            </button>
          ))}
        </div>
      </ControlGroup>

      <div className="rounded-[14px] border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Need a starting point?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Randomize shuffles the colorway, pattern, typography and panel gradients without
          touching your imported artwork.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          icon={<Shuffle className="h-4 w-4" aria-hidden="true" />}
          onClick={onRandomize}
        >
          Randomize design
        </Button>
      </div>
    </div>
  );
}

export default StylePanel;
