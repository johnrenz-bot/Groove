'use client';

import React, { useState } from 'react';
import { Ruler } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { TEE_FIT_COPY, TEE_SIZE_CHART, TEE_SIZES } from '../../constants';
import type { TeeDesign } from '../../types';
import { ControlGroup } from './Fields';

export function SizePanel({
  design,
  onPatch,
}: {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
}) {
  const [chartOpen, setChartOpen] = useState(false);

  return (
    <div className="space-y-6">
      <ControlGroup
        label="Size"
        hint="The chart is a reference only; this page does not place an order."
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="group" aria-label="T-shirt size">
          {TEE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={design.size === size}
              onClick={() => onPatch({ size })}
              className={cn(
                'cursor-pointer rounded-[10px] border px-1 py-2.5 text-xs font-bold transition-colors',
                design.size === size
                  ? 'border-accent-border bg-accent-soft text-accent-text'
                  : 'border-border bg-card/60 text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground'
              )}
            >
              {size}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          icon={<Ruler className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setChartOpen(true)}
        >
          Open size chart
        </Button>
      </ControlGroup>

      <ControlGroup label="Current fit">
        <div className="rounded-[12px] border border-border bg-card/60 px-3.5 py-3">
          <p className="text-sm font-semibold text-foreground">
            {TEE_FIT_COPY[design.fit]?.label ?? design.fit} · Size {design.size}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {TEE_FIT_COPY[design.fit]?.description}
          </p>
        </div>
      </ControlGroup>

      <div className="rounded-[14px] border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Measurement note</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Sizes shown are body measurements for the boxy concept-kit cut. Final garment
          measurements can vary slightly by production run.
        </p>
      </div>

      <Modal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        title="Size chart"
        description="Body measurements in inches. For reference only."
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setChartOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <caption className="sr-only">T-shirt size chart</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-subtle-foreground">
                <th scope="col" className="px-2 py-2.5">Size</th>
                <th scope="col" className="px-2 py-2.5">Chest</th>
                <th scope="col" className="px-2 py-2.5">Length</th>
                <th scope="col" className="px-2 py-2.5">Sleeve</th>
              </tr>
            </thead>
            <tbody>
              {TEE_SIZE_CHART.map((row) => (
                <tr
                  key={row.size}
                  className={cn(
                    'border-b border-border/60 last:border-0',
                    row.size === design.size && 'bg-accent-soft/60'
                  )}
                >
                  <th scope="row" className="px-2 py-2.5 text-left font-bold text-foreground">
                    {row.size}
                  </th>
                  <td className="px-2 py-2.5 text-muted-foreground">{row.chest}</td>
                  <td className="px-2 py-2.5 text-muted-foreground">{row.length}</td>
                  <td className="px-2 py-2.5 text-muted-foreground">{row.sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

export default SizePanel;
