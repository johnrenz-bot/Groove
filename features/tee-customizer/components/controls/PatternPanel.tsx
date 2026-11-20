'use client';

import React from 'react';
import { Check, ImagePlus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEE_PATTERNS } from '../../constants';
import type { TeeDesign, TeePattern, TeePatternRegion } from '../../types';
import { ColorField, ControlGroup, ToggleField } from './Fields';
import { SliderNumberField } from './SliderNumberField';
import { PatternThumbnail } from './PatternThumbnail';

interface PatternPanelProps {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
  /** Jump to the Import tab — used by the Custom Artwork empty state. */
  onGoToImport?: () => void;
}

const REGION_OPTIONS: Array<{ value: TeePatternRegion; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'body', label: 'Body' },
  { value: 'sleeves', label: 'Sleeves' },
];

/**
 * Pattern picker — thumbnails render the real photographic front mockup with
 * the pattern printed on it. Below the grid, the selected pattern gets full
 * placement controls: colour, accent, scale, offset, opacity, rotation and the
 * garment region it is allowed to cover.
 */
export function PatternPanel({ design, onPatch, onGoToImport }: PatternPanelProps) {
  const pattern = TEE_PATTERNS.find((entry) => entry.id === design.pattern);
  const isCustom = design.pattern === 'custom';
  const hasCustomSource = design.images.some((image) => !image.hidden);

  const patchPattern = (patch: Partial<TeeDesign>, coalesceKey?: string) => onPatch(patch, coalesceKey);

  const resetPattern = () =>
    onPatch({
      patternScale: 1,
      patternOpacity: 1,
      patternRotation: 0,
      patternOffset: { x: 0, y: 0 },
      patternRegion: 'all',
    });

  return (
    <div className="space-y-5">
      <ControlGroup
        label="Garment pattern"
        hint={pattern ? `${pattern.label} — ${pattern.description}` : undefined}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {TEE_PATTERNS.map((entry) => {
            const active = design.pattern === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => onPatch({ pattern: entry.id as TeePattern })}
                className={cn(
                  'group cursor-pointer overflow-hidden rounded-[12px] border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-accent-border bg-accent-soft shadow-[var(--shadow-sm)]'
                    : 'border-border bg-card/60 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-sm)]'
                )}
              >
                <div className="relative aspect-[3/2] overflow-hidden bg-elevated p-1.5">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,var(--muted),transparent_70%)]"
                  />
                  <div className="relative mx-auto h-full w-[82%]">
                    <PatternThumbnail
                      pattern={entry.id}
                      zones={design.zones}
                      gradients={design.gradients}
                    />
                  </div>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground shadow">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="px-2.5 py-2" title={entry.area}>
                  <span
                    className={cn(
                      'block truncate text-[13px] font-semibold leading-tight',
                      active ? 'text-accent-text' : 'text-foreground'
                    )}
                  >
                    {entry.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {entry.area}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ControlGroup>

      {isCustom && !hasCustomSource && (
        <div className="rounded-[12px] border border-dashed border-accent-border bg-accent-soft px-3 py-2.5 text-xs leading-relaxed text-accent-text">
          <p className="font-semibold">Custom Artwork needs an image</p>
          <p className="mt-1 text-muted-foreground">
            Import a PNG, JPG or sanitized SVG and it will be tiled across the garment as a print.
          </p>
          {onGoToImport && (
            <button
              type="button"
              onClick={onGoToImport}
              className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-accent-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-accent-text transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              Open the Import panel
            </button>
          )}
        </div>
      )}

      <ControlGroup label="Pattern colors" hint="Print ink and accent strokes used by the garment pattern.">
        <div className="space-y-2">
          <ColorField
            label="Pattern color"
            value={design.zones.panels}
            onChange={(panels) =>
              onPatch({ zones: { ...design.zones, panels } }, 'zone-panels')
            }
          />
          <ColorField
            label="Accent color"
            value={design.zones.accents}
            onChange={(accents) =>
              onPatch({ zones: { ...design.zones, accents } }, 'zone-accents')
            }
          />
        </div>
      </ControlGroup>

      <ControlGroup label="Placement & scale" hint="Offsets are relative to the shirt canvas; negative values shift the artwork left / up.">
        <div className="space-y-3">
          <SliderNumberField
            label="Scale"
            value={design.patternScale}
            min={0.5}
            max={2}
            step={0.05}
            unit="×"
            defaultValue={1}
            onChange={(patternScale) => patchPattern({ patternScale }, 'pattern-scale')}
            formatValue={(value) => `${value.toFixed(2)}×`}
          />
          <SliderNumberField
            label="Horizontal offset"
            value={Math.round(design.patternOffset.x * 100)}
            min={-18}
            max={18}
            step={1}
            unit="%"
            defaultValue={0}
            hint="Shift the whole pattern left or right across the garment."
            onChange={(value) =>
              patchPattern({ patternOffset: { ...design.patternOffset, x: value / 100 } }, 'pattern-offset-x')
            }
          />
          <SliderNumberField
            label="Vertical offset"
            value={Math.round(design.patternOffset.y * 100)}
            min={-18}
            max={18}
            step={1}
            unit="%"
            defaultValue={0}
            hint="Shift the whole pattern up or down across the garment."
            onChange={(value) =>
              patchPattern({ patternOffset: { ...design.patternOffset, y: value / 100 } }, 'pattern-offset-y')
            }
          />
          <SliderNumberField
            label="Rotation"
            value={design.patternRotation}
            min={-180}
            max={180}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={(patternRotation) => patchPattern({ patternRotation }, 'pattern-rotation')}
          />
          <SliderNumberField
            label="Opacity"
            value={Math.round(design.patternOpacity * 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
            defaultValue={100}
            onChange={(value) => patchPattern({ patternOpacity: value / 100 }, 'pattern-opacity')}
          />
        </div>
      </ControlGroup>

      <ControlGroup label="Print region">
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-1" role="radiogroup" aria-label="Pattern region">
          {REGION_OPTIONS.map((option) => {
            const active = design.patternRegion === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patchPattern({ patternRegion: option.value })}
                className={cn(
                  'cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </ControlGroup>

      <div className="border-t border-border/60 pt-3">
        <ToggleField
          label="Pattern visible"
          description="Hide the print without losing its settings."
          checked={design.patternVisible}
          onChange={(patternVisible) => onPatch({ patternVisible })}
        />
        <button
          type="button"
          onClick={resetPattern}
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-border bg-card/60 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-accent-border hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset pattern settings
        </button>
      </div>
    </div>
  );
}

export default PatternPanel;
