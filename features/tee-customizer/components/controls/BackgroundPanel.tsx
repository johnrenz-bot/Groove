'use client';

import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEE_BACKGROUNDS } from '../../constants';
import { stageSwatchStyle } from '../stageBackground';
import type { TeeBackgroundId, TeeDesign } from '../../types';
import { ColorField, ControlGroup, ToggleField } from './Fields';

interface BackgroundPanelProps {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
}

/**
 * Studio background & presentation. Presentation-only: none of this ever
 * enters the export — the stage is editor chrome, the export rasterizes the
 * SVG layers alone.
 */
export function BackgroundPanel({ design, onPatch }: BackgroundPanelProps) {
  const { presentation } = design;

  const patchPresentation = (patch: Partial<TeeDesign['presentation']>, coalesceKey?: string) =>
    onPatch({ presentation: { ...presentation, ...patch } }, coalesceKey);

  const patchEffects = (patch: Partial<TeeDesign['presentation']['effects']>) =>
    patchPresentation(
      { effects: { ...presentation.effects, ...patch } },
      'presentation-effects'
    );

  const patchBackground = (background: TeeBackgroundId) =>
    patchPresentation({ background });

  return (
    <div className="space-y-6">
      <ControlGroup
        label="Studio background"
        hint="Presentation only — exports and the transparent artwork file never include the backdrop."
      >
        <div className="grid grid-cols-2 gap-2">
          {TEE_BACKGROUNDS.map((background) => {
            const active = presentation.background === background.id;
            return (
              <button
                key={background.id}
                type="button"
                aria-pressed={active}
                onClick={() => patchBackground(background.id)}
                className={cn(
                  'group flex cursor-pointer flex-col overflow-hidden rounded-[14px] border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-accent-border bg-accent-soft shadow-[var(--shadow-sm)]'
                    : 'border-border bg-card/60 hover:border-border-strong'
                )}
              >
                <span
                  aria-hidden="true"
                  className="relative block h-14 w-full border-b border-border/60"
                  style={stageSwatchStyle(background.id, presentation.customBackground)}
                >
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[var(--accent-contrast,#0c0c0c)] shadow-sm">
                      <Check className="h-3 w-3" aria-hidden="true" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="flex flex-col gap-0.5 px-2.5 py-2">
                  <span
                    className={cn(
                      'text-[11px] font-semibold',
                      active ? 'text-accent-text' : 'text-foreground'
                    )}
                  >
                    {background.label}
                  </span>
                  <span className="text-[10px] leading-snug text-muted-foreground">
                    {background.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          <ColorField
            label="Custom backdrop color"
            value={presentation.customBackground}
            onChange={(customBackground) =>
              patchPresentation({ customBackground, background: 'custom' }, 'custom-background')
            }
          />
        </div>
      </ControlGroup>

      <ControlGroup
        label="Studio effects"
        hint="Subtle lighting for the live preview. Keep them understated — the garment is the hero."
      >
        <div className="space-y-2">
          <ToggleField
            label="Spotlight"
            description="Soft overhead beam pooling on the chest."
            checked={presentation.effects.spotlight}
            onChange={(spotlight) => patchEffects({ spotlight })}
          />
          <ToggleField
            label="Ambient glow"
            description="Warm Groove-gold radiance behind the fabric."
            checked={presentation.effects.glow}
            onChange={(glow) => patchEffects({ glow })}
          />
          <ToggleField
            label="Floor shadow"
            description="Soft contact shadow anchoring the hem."
            checked={presentation.effects.floorShadow}
            onChange={(floorShadow) => patchEffects({ floorShadow })}
          />
          <ToggleField
            label="Studio lighting"
            description="Gentle diagonal sheen across the frame."
            checked={presentation.effects.studioLight}
            onChange={(studioLight) => patchEffects({ studioLight })}
          />
          <ToggleField
            label="Vignette"
            description="Darkened frame edges, cinematic focus."
            checked={presentation.effects.vignette}
            onChange={(vignette) => patchEffects({ vignette })}
          />
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-subtle-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          These effects are stage chrome. PNG exports and the transparent artwork-only
          file contain the garment and its prints — never the backdrop or lighting.
        </p>
      </ControlGroup>
    </div>
  );
}

export default BackgroundPanel;
