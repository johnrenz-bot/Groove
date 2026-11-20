'use client';

import React from 'react';
import { Check, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BRAND_EMBLEM_SRC,
  BRAND_PATCH_SRC,
  BRAND_WORDMARK_SRC,
} from '../../constants';
import type { TeeBranding, TeeDesign } from '../../types';
import { ControlGroup, ToggleField } from './Fields';

interface BrandingPanelProps {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
}

type BooleanBrandingKey = {
  [K in keyof TeeBranding]: TeeBranding[K] extends boolean ? K : never;
}[keyof TeeBranding];

interface BrandRow {
  key: BooleanBrandingKey;
  label: string;
  description: string;
  src: string;
  aspect: number;
}

const FRONT_MARKS: BrandRow[] = [
  {
    key: 'emblem',
    label: 'Chest emblem',
    description: "Groove emblem on the wearer's left chest.",
    src: BRAND_EMBLEM_SRC,
    aspect: 1278 / 1230,
  },
  {
    key: 'wordmark',
    label: 'Tribal wordmark',
    description: 'Full-width GROOVE lettering across the chest.',
    src: BRAND_WORDMARK_SRC,
    aspect: 2172 / 724,
  },
  {
    key: 'patch',
    label: 'Hem patch',
    description: 'Woven STREETWEAR patch above the lower hem.',
    src: BRAND_PATCH_SRC,
    aspect: 1774 / 887,
  },
];

const BACK_MARKS: BrandRow[] = [
  {
    key: 'backGraphic',
    label: 'Back wordmark',
    description: 'Oversized GROOVE lettering across the upper back.',
    src: BRAND_WORDMARK_SRC,
    aspect: 2172 / 724,
  },
];

function MarkRow({
  row,
  checked,
  onToggle,
}: {
  row: BrandRow;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[14px] border p-2.5 transition-colors',
        checked ? 'border-accent-border bg-accent-soft/50' : 'border-border bg-card/60'
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${row.label} ${checked ? 'on' : 'off'}`}
        onClick={() => onToggle(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200',
          checked ? 'border-accent bg-accent' : 'border-border bg-muted'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 rounded-full bg-card shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
          )}
          style={{ height: '1.125rem', width: '1.125rem' }}
        />
      </button>
      <span
        className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border/70 p-1.5"
        style={{ backgroundColor: '#f4f4f5' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.src}
          alt={row.label}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">{row.label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
          {row.description}
        </span>
      </span>
      {checked && (
        <Check className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" strokeWidth={3} />
      )}
    </div>
  );
}

/**
 * Groove PH brand-mark placements. Every mark is optional and independent;
 * positions are brand-locked to garment-accurate placements (chest, hem,
 * collar) so the shirt always looks like a released Groove product.
 */
export function BrandingPanel({ design, onPatch }: BrandingPanelProps) {
  const { branding } = design;

  const patchBranding = (patch: Partial<TeeBranding>, coalesceKey?: string) =>
    onPatch({ branding: { ...branding, ...patch } }, coalesceKey);

  return (
    <div className="space-y-6">
      <ControlGroup
        label="Brand marks"
        hint="Official Groove PH marks, placed at garment-accurate positions. Toggle any of them."
      >
        <div className="space-y-2">
          {FRONT_MARKS.map((row) => (
            <MarkRow
              key={row.key}
              row={row}
              checked={branding[row.key]}
              onToggle={(value) => patchBranding({ [row.key]: value })}
            />
          ))}
          {BACK_MARKS.map((row) => (
            <MarkRow
              key={row.key}
              row={row}
              checked={branding[row.key]}
              onToggle={(value) => patchBranding({ [row.key]: value })}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup
        label="Neck & hang tag"
        hint="The inner-collar label prints inside the neckline. The hang tag is a physical product tag at the side neckline — not printed."
      >
        <div className="space-y-2">
          <ToggleField
            label="Inner neck label"
            description="Mini emblem with the brand wordmark inside the collar."
            checked={branding.neckLabel}
            onChange={(neckLabel) => patchBranding({ neckLabel })}
          />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Neck label text</span>
            <input
              value={branding.neckLabelText}
              maxLength={22}
              disabled={!branding.neckLabel}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => patchBranding({ neckLabelText: event.target.value }, 'neck-label-text')}
              placeholder="GROOVE PH"
              aria-label="Neck label text"
              className="h-10 w-full rounded-[10px] border border-border bg-card/70 px-3 text-xs font-bold uppercase tracking-[0.18em] text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-accent-border focus:ring-1 focus:ring-[var(--crew-accent-gold)] disabled:opacity-40"
            />
            <span className="block text-[10px] leading-snug text-subtle-foreground">
              Printed in the collar on the front view. Keep it short — 22 characters max.
            </span>
          </label>
          <ToggleField
            label="Show size on label"
            description="Adds 'BOXED TEE · SIZE …' beneath the brand line."
            checked={branding.neckLabelSize}
            onChange={(neckLabelSize) => patchBranding({ neckLabelSize })}
          />
          <ToggleField
            label="Hang tag"
            description="Cardboard tag with string at the side neckline. Toggle before sharing."
            checked={branding.hangTag}
            onChange={(hangTag) => patchBranding({ hangTag })}
          />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Hang tag text</span>
            <input
              value={branding.hangTagText}
              maxLength={14}
              disabled={!branding.hangTag}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => patchBranding({ hangTagText: event.target.value }, 'hang-tag-text')}
              placeholder="GROOVE"
              aria-label="Hang tag text"
              className="h-10 w-full rounded-[10px] border border-border bg-card/70 px-3 text-xs font-bold uppercase tracking-[0.18em] text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-accent-border focus:ring-1 focus:ring-[var(--crew-accent-gold)] disabled:opacity-40"
            />
            <span className="block text-[10px] leading-snug text-subtle-foreground">
              Woven into the cardboard tag artwork. The tag never enters print exports.
            </span>
          </label>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-subtle-foreground">
          <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          The neck label and hang tag are independent — the tag never exports with print artwork and
          the label prints inside the collar only.
        </p>
      </ControlGroup>
    </div>
  );
}

export default BrandingPanel;
