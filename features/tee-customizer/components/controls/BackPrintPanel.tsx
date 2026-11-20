'use client';

import React from 'react';
import { Hash, UserRound } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import { MAX_BACK_NAME_LENGTH, MAX_BACK_NUMBER_LENGTH, TEE_FONTS } from '../../constants';
import { sanitizeNumberText, sanitizeText } from '../../serialization';
import type { TeeDesign } from '../../types';
import { ColorField, ControlGroup, RangeField, ToggleField } from './Fields';

export function BackPrintPanel({
  design,
  onPatch,
}: {
  design: TeeDesign;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
}) {
  const updateBack = (patch: Partial<TeeDesign['back']>, coalesceKey?: string) => {
    onPatch({ back: { ...design.back, ...patch } }, coalesceKey);
  };

  return (
    <div className="space-y-6">
      <ControlGroup
        label={
          <span className="inline-flex items-center gap-2">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Back print
          </span>
        }
        hint="Classic jersey treatment: a name across the shoulders and a large number below."
      >
        <div className="space-y-4">
          <ToggleField
            label="Show back print"
            description="Rendered on the back view only."
            checked={design.back.visible}
            onChange={(visible) => updateBack({ visible })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              value={design.back.name}
              maxLength={MAX_BACK_NAME_LENGTH}
              placeholder="GROOVE"
              onChange={(event) => updateBack({ name: event.target.value })}
              onBlur={() => updateBack({ name: sanitizeText(design.back.name, MAX_BACK_NAME_LENGTH) })}
              hint={`${design.back.name.length}/${MAX_BACK_NAME_LENGTH}`}
            />
            <Input
              label="Number"
              value={design.back.number}
              inputMode="numeric"
              maxLength={MAX_BACK_NUMBER_LENGTH}
              placeholder="01"
              onChange={(event) =>
                updateBack({ number: sanitizeNumberText(event.target.value, MAX_BACK_NUMBER_LENGTH) })
              }
              hint="Up to two digits"
              suffix={<Hash className="h-4 w-4" aria-hidden="true" />}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Font"
              value={design.back.font}
              onChange={(event) => updateBack({ font: event.target.value })}
            >
              {TEE_FONTS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.label}
                </option>
              ))}
            </Select>
            <ColorField
              label="Print color"
              value={design.back.color}
              onChange={(color) => updateBack({ color }, 'back-color')}
            />
          </div>

          <RangeField
            label="Number scale"
            value={design.back.size}
            min={40}
            max={220}
            step={2}
            onChange={(size) => updateBack({ size }, 'back-size')}
            formatValue={(value) => `${value}`}
          />
        </div>
      </ControlGroup>
    </div>
  );
}

export default BackPrintPanel;
