'use client';

import React from 'react';
import { ArrowRight, Pipette } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/utils';
import { TEE_COLORWAYS } from '../../constants';
import type { TeeDesign, TeeGradient, TeeZone } from '../../types';
import { ColorField, ControlGroup, RangeField, ToggleField } from './Fields';

const ZONE_LABELS: Record<TeeZone, string> = {
  body: 'Body',
  sleeves: 'Sleeves',
  collar: 'Collar & cuffs',
  panels: 'Pattern print',
  accents: 'Pattern accents',
};

function GradientEditor({
  title,
  description,
  gradient,
  onChange,
}: {
  title: string;
  description: string;
  gradient: TeeGradient;
  onChange: (gradient: TeeGradient) => void;
}) {
  return (
    <div className="space-y-3 rounded-[14px] border border-border bg-card/50 p-3.5">
      <ToggleField
        label={`${title} gradient`}
        description={description}
        checked={gradient.enabled}
        onChange={(enabled) => onChange({ ...gradient, enabled })}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
          Type
        </span>
        <SegmentedControl
          options={[
            { value: 'linear' as const, label: 'Linear' },
            { value: 'radial' as const, label: 'Radial' },
          ]}
          value={gradient.type}
          onChange={(type) => onChange({ ...gradient, type })}
          ariaLabel={`${title} gradient type`}
          size="sm"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ColorField
          label="From"
          value={gradient.from}
          onChange={(from) => onChange({ ...gradient, from })}
        />
        <ColorField
          label="To"
          value={gradient.to}
          onChange={(to) => onChange({ ...gradient, to })}
        />
      </div>

      {gradient.type === 'linear' && (
        <RangeField
          label="Angle"
          value={gradient.angle}
          min={0}
          max={360}
          step={5}
          onChange={(angle) => onChange({ ...gradient, angle })}
          formatValue={(value) => `${value}°`}
        />
      )}

      <div
        aria-hidden="true"
        className="h-8 rounded-[8px] border border-border"
        style={{
          background:
            gradient.type === 'radial'
              ? `radial-gradient(circle at 50% 40%, ${gradient.from}, ${gradient.to})`
              : `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`,
        }}
      />
    </div>
  );
}

export function ColorsPanel({
  design,
  onPatch,
}: {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
}) {
  const updateZone = (zone: TeeZone, value: string) => {
    onPatch({ zones: { ...design.zones, [zone]: value } }, `zone-${zone}`);
  };

  const applyColorway = (colorwayId: string) => {
    const colorway = TEE_COLORWAYS.find((entry) => entry.id === colorwayId);
    if (!colorway) return;
    onPatch({
      zones: { ...colorway.zones },
      gradients: {
        body: { ...colorway.gradient },
        sleeves: {
          ...design.gradients.sleeves,
          from: colorway.zones.sleeves,
          to: colorway.zones.sleeves,
        },
        collar: {
          ...design.gradients.collar,
          from: colorway.zones.collar,
          to: colorway.zones.collar,
        },
        accents: {
          ...design.gradients.accents,
          from: colorway.zones.accents,
          to: colorway.zones.accents,
        },
        panels: {
          ...design.gradients.panels,
          from: colorway.zones.panels,
          to: colorway.zones.body,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <ControlGroup label="Colorways" hint="Start from a ready-made kit, then fine-tune each zone.">
        <div className="grid grid-cols-2 gap-2">
          {TEE_COLORWAYS.map((colorway) => {
            const active = (Object.keys(colorway.zones) as TeeZone[]).every(
              (zone) => colorway.zones[zone].toLowerCase() === design.zones[zone].toLowerCase()
            );
            return (
              <button
                key={colorway.id}
                type="button"
                aria-pressed={active}
                onClick={() => applyColorway(colorway.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-[12px] border px-2.5 py-2.5 text-left transition-colors',
                  active
                    ? 'border-accent-border bg-accent-soft'
                    : 'border-border bg-card/60 hover:border-border-strong hover:bg-muted'
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border"
                >
                  <span className="h-full w-1/2" style={{ backgroundColor: colorway.zones.body }} />
                  <span className="flex h-full w-1/2 flex-col">
                    <span className="h-1/2" style={{ backgroundColor: colorway.zones.panels }} />
                    <span className="h-1/2" style={{ backgroundColor: colorway.zones.accents }} />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {colorway.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {colorway.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </ControlGroup>

      <ControlGroup label="Zone colors" hint="Body, sleeves and collar recolor the garment photograph. Print colors feed the panel pattern and accents.">
        <div className="space-y-2">
          {(Object.keys(ZONE_LABELS) as TeeZone[]).map((zone) => (
            <ColorField
              key={zone}
              label={ZONE_LABELS[zone]}
              value={design.zones[zone]}
              onChange={(value) => updateZone(zone, value)}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup label="Body gradient">
        <GradientEditor
          title="Body"
          description="Blend two colors across the torso."
          gradient={design.gradients.body}
          onChange={(body) => onPatch({ gradients: { ...design.gradients, body } }, 'gradient-body')}
        />
      </ControlGroup>

      <ControlGroup label="Sleeve gradient">
        <GradientEditor
          title="Sleeve"
          description="Applied to both sleeve panels."
          gradient={design.gradients.sleeves}
          onChange={(sleeves) => onPatch({ gradients: { ...design.gradients, sleeves } }, 'gradient-sleeves')}
        />
      </ControlGroup>

      <ControlGroup label="Collar & cuffs gradient">
        <GradientEditor
          title="Collar"
          description="Ribbed neckband, cuffs and wrist hems."
          gradient={design.gradients.collar}
          onChange={(collar) => onPatch({ gradients: { ...design.gradients, collar } }, 'gradient-collar')}
        />
      </ControlGroup>

      <ControlGroup label="Print gradient">
        <GradientEditor
          title="Print"
          description="Blend two colors used by the printed panels and the Gradient Fade preset."
          gradient={design.gradients.panels}
          onChange={(panels) => onPatch({ gradients: { ...design.gradients, panels } }, 'gradient-panels')}
        />
      </ControlGroup>

      <ControlGroup label="Accent gradient">
        <GradientEditor
          title="Accent"
          description="Blend two colors used by the pattern's accent strokes and tongues."
          gradient={design.gradients.accents}
          onChange={(accents) => onPatch({ gradients: { ...design.gradients, accents } }, 'gradient-accents')}
        />
      </ControlGroup>

      <button
        type="button"
        onClick={() =>
          onPatch({
            gradients: {
              ...design.gradients,
              panels: { ...design.gradients.body },
            },
          })
        }
        className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-card/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Pipette className="h-3.5 w-3.5" aria-hidden="true" />
        Copy body gradient to panels
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default ColorsPanel;
