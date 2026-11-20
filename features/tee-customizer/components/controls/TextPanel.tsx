'use client';

import React from 'react';
import { AlignCenter, AlignLeft, AlignRight, MousePointer2, Shield, Type } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/utils';
import { MAX_BADGE_TEXT_LENGTH, MAX_DESIGN_TEXT_LENGTH, TEE_FONTS } from '../../constants';
import { sanitizeTextMultiline } from '../../serialization';
import type { TeeDesign, TeeText, TeeTextAlign, TeeView } from '../../types';
import { ColorField, ControlGroup, ToggleField } from './Fields';
import { SliderNumberField } from './SliderNumberField';

const WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;

interface TextPreset {
  id: string;
  label: string;
  surface: TeeView;
  x: number;
  y: number;
}

const TEXT_PRESETS: TextPreset[] = [
  { id: 'center-chest', label: 'Center chest', surface: 'front', x: 50, y: 40 },
  { id: 'left-chest', label: 'Left chest', surface: 'front', x: 63, y: 30 },
  { id: 'right-chest', label: 'Right chest', surface: 'front', x: 37, y: 30 },
  { id: 'upper-back', label: 'Upper back', surface: 'back', x: 50, y: 27 },
  { id: 'center-back', label: 'Center back', surface: 'back', x: 50, y: 46 },
  { id: 'lower-back', label: 'Lower back', surface: 'back', x: 50, y: 71 },
];

const ALIGN_OPTIONS: Array<{ value: TeeTextAlign; label: string; icon: typeof AlignLeft }> = [
  { value: 'left', label: 'Align text left', icon: AlignLeft },
  { value: 'center', label: 'Align text center', icon: AlignCenter },
  { value: 'right', label: 'Align text right', icon: AlignRight },
];

export function TextPanel({
  design,
  onPatch,
  onViewChange,
}: {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
  onViewChange?: (view: TeeView) => void;
}) {
  const text = design.texts[0] as TeeText | undefined;

  const updateText = (patch: Partial<TeeText>, coalesceKey?: string) => {
    if (!text) return;
    onPatch({ texts: [{ ...text, ...patch }, ...design.texts.slice(1)] }, coalesceKey);
  };

  const applyPreset = (preset: TextPreset) => {
    updateText({ surface: preset.surface, x: preset.x, y: preset.y });
    if (design.view !== preset.surface) onViewChange?.(preset.surface);
  };

  return (
    <div className="space-y-5">
      <ControlGroup
        label={
          <span className="inline-flex items-center gap-2">
            <Type className="h-4 w-4" aria-hidden="true" />
            Chest wordmark
          </span>
        }
        hint="Drag the text directly on the shirt to reposition it."
      >
        {text ? (
          <div className="space-y-4">
            {/* Surface + quick presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                  Surface
                </span>
                <SegmentedControl
                  options={[
                    { value: 'front' as const, label: 'Front' },
                    { value: 'back' as const, label: 'Back' },
                  ]}
                  value={text.surface}
                  onChange={(surface) => {
                    updateText({ surface });
                    if (design.view !== surface) onViewChange?.(surface);
                  }}
                  ariaLabel="Text surface"
                  size="sm"
                />
              </div>
              <div className="flex flex-wrap gap-1.5" aria-label="Placement presets">
                {TEXT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      'cursor-pointer rounded-full border border-border bg-card/60 px-2.5 py-1.5 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      text.surface === preset.surface &&
                        Math.round(text.x) === preset.x &&
                        Math.round(text.y) === preset.y &&
                        'border-accent-border bg-accent-soft text-accent-text'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Text</span>
              <textarea
                value={text.text}
                maxLength={MAX_DESIGN_TEXT_LENGTH}
                rows={2}
                placeholder="GROOVE PH"
                onChange={(event) => updateText({ text: event.target.value })}
                onBlur={() => updateText({ text: sanitizeTextMultiline(text.text, MAX_DESIGN_TEXT_LENGTH) })}
                className="w-full resize-y rounded-[12px] border border-border bg-card/70 px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-accent-border focus:ring-1 focus:ring-[var(--crew-accent-gold)]"
              />
              <span className="block text-right text-[10px] text-subtle-foreground">
                {text.text.length}/{MAX_DESIGN_TEXT_LENGTH} · new lines allowed
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Font"
                value={text.font}
                onChange={(event) => updateText({ font: event.target.value })}
              >
                {TEE_FONTS.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Weight"
                value={String(text.weight)}
                onChange={(event) => updateText({ weight: Number(event.target.value) })}
              >
                {WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </Select>
            </div>

            <ColorField
              label="Text color"
              value={text.color}
              onChange={(color) => updateText({ color }, 'text-color')}
            />

            <SliderNumberField
              label="Size"
              value={text.size}
              min={10}
              max={110}
              step={1}
              unit="px"
              onChange={(size) => updateText({ size }, 'text-size')}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <SliderNumberField
                label="Letter spacing"
                value={text.letterSpacing}
                min={-4}
                max={14}
                step={0.5}
                defaultValue={1}
                onChange={(letterSpacing) => updateText({ letterSpacing }, 'text-tracking')}
              />
              <SliderNumberField
                label="Line height"
                value={text.lineHeight}
                min={0.8}
                max={2}
                step={0.05}
                defaultValue={1.15}
                formatValue={(value) => value.toFixed(2)}
                onChange={(lineHeight) => updateText({ lineHeight }, 'text-line-height')}
              />
            </div>

            <SliderNumberField
              label="Horizontal Position (X)"
              value={Math.round(text.x)}
              min={0}
              max={100}
              step={1}
              unit="%"
              defaultValue={50}
              hint="Anchor point as a percentage of the printable garment width."
              onChange={(x) => updateText({ x }, 'text-x')}
            />
            <SliderNumberField
              label="Vertical Position (Y)"
              value={Math.round(text.y)}
              min={0}
              max={100}
              step={1}
              unit="%"
              defaultValue={39}
              hint="Anchor point as a percentage of the printable garment height."
              onChange={(y) => updateText({ y }, 'text-y')}
            />
            <SliderNumberField
              label="Rotation"
              value={text.rotation}
              min={-180}
              max={180}
              step={1}
              unit="°"
              defaultValue={0}
              onChange={(rotation) => updateText({ rotation }, 'text-rotation')}
            />
            <SliderNumberField
              label="Opacity"
              value={Math.round(text.opacity * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              defaultValue={100}
              onChange={(value) => updateText({ opacity: value / 100 }, 'text-opacity')}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-[10px] border border-border bg-card/60 p-1" role="group" aria-label="Text alignment">
                {ALIGN_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = text.align === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      aria-label={option.label}
                      title={option.label}
                      onClick={() => updateText({ align: option.value })}
                      className={cn(
                        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-accent-soft text-accent-text' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
                <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
                Drag on canvas
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ToggleField label="Italic" checked={text.italic} onChange={(italic) => updateText({ italic })} />
              <ToggleField label="Visible" checked={text.visible} onChange={(visible) => updateText({ visible })} />
              <ToggleField
                label="Locked"
                checked={text.locked}
                onChange={(locked) => updateText({ locked })}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No text layer found.</p>
        )}
      </ControlGroup>

      <ControlGroup
        label={
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Chest crest
          </span>
        }
        hint="A small woven badge, like a club crest on a concept kit."
      >
        <div className="space-y-4">
          <ToggleField
            label="Show crest"
            checked={design.badge.enabled}
            onChange={(enabled) => onPatch({ badge: { ...design.badge, enabled } })}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
              Placement
            </span>
            <SegmentedControl
              options={[
                { value: 'chest-left' as const, label: 'Chest left' },
                { value: 'chest-center' as const, label: 'Center' },
              ]}
              value={design.badge.placement}
              onChange={(placement) => onPatch({ badge: { ...design.badge, placement } })}
              ariaLabel="Crest placement"
              size="sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Monogram"
              value={design.badge.text}
              maxLength={MAX_BADGE_TEXT_LENGTH}
              placeholder="GP"
              onChange={(event) =>
                onPatch({
                  badge: {
                    ...design.badge,
                    text: event.target.value.toUpperCase().slice(0, MAX_BADGE_TEXT_LENGTH),
                  },
                })
              }
            />
            <ColorField
              label="Crest color"
              value={design.badge.color}
              onChange={(color) => onPatch({ badge: { ...design.badge, color } }, 'badge-color')}
            />
          </div>
        </div>
      </ControlGroup>
    </div>
  );
}

export default TextPanel;
