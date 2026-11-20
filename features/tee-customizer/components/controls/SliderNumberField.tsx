'use client';

import React, { useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SliderNumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Shown in the output chip, e.g. '%' or '°'. */
  unit?: string;
  /** Rendered under the row when provided; explains what the axis means. */
  hint?: string;
  /** Value restored by the reset button. Omit to hide the button. */
  defaultValue?: number;
  /** Coalesce key is the caller's responsibility (wrap onChange). */
  className?: string;
  disabled?: boolean;
  formatValue?: (value: number) => string;
}

function roundToStep(input: number, step: number): number {
  const decimals = step < 1 ? Math.max(0, Math.ceil(Math.abs(Math.log10(step)))) : 0;
  const factor = 10 ** decimals;
  return Math.round(input * factor) / factor;
}

/**
 * Slider synchronized with a direct numeric input. The pair never drifts:
 * dragging updates the field, typing updates the slider, and out-of-range or
 * malformed input falls back to the clamped value on blur.
 */
export function SliderNumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  hint,
  defaultValue,
  className,
  disabled = false,
  formatValue,
}: SliderNumberFieldProps) {
  const id = useId();
  const roundTo = (input: number) => roundToStep(input, step);
  const [draft, setDraft] = useState(() => String(roundTo(value)));
  const [editing, setEditing] = useState(false);

  // Keep the text field in sync with outside changes (canvas drags, presets,
  // undo) unless the user is mid-edit — React's sanctioned derive-during-render
  // pattern, not an effect.
  const [lastValue, setLastValue] = useState(value);
  if (!editing && lastValue !== value) {
    setLastValue(value);
    setDraft(String(roundTo(value)));
  }

  const clampValue = (input: number) => Math.min(max, Math.max(min, input));
  const display = formatValue ? formatValue(value) : `${roundTo(value)}${unit}`;

  const commitDraft = () => {
    setEditing(false);
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(roundTo(value)));
      return;
    }
    const clamped = clampValue(parsed);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const sliderId = `${id}-slider`;

  return (
    <div className={cn('space-y-1.5', disabled && 'pointer-events-none opacity-45', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={sliderId} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={editing ? draft : String(roundTo(value))}
            disabled={disabled}
            aria-label={`${label} value`}
            onFocus={() => {
              setEditing(true);
              setDraft(String(roundTo(value)));
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              const parsed = Number(event.target.value);
              if (event.target.value.trim() !== '' && Number.isFinite(parsed)) {
                onChange(clampValue(parsed));
              }
            }}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                const delta = event.key === 'ArrowUp' ? step : -step;
                onChange(clampValue(value + delta));
              }
            }}
            className="h-7 w-[64px] rounded-[8px] border border-border bg-card/70 px-1.5 text-right font-mono text-[11px] tabular-nums text-foreground outline-none transition-colors focus:border-accent-border focus:ring-1 focus:ring-[var(--crew-accent-gold)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {unit && <span className="w-4 text-[10px] font-semibold text-subtle-foreground">{unit}</span>}
          {defaultValue !== undefined && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(defaultValue)}
              title={`Reset ${label} to ${formatValue ? formatValue(defaultValue) : `${defaultValue}${unit}`}`}
              aria-label={`Reset ${label}`}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[8px] border border-transparent text-subtle-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {hint && <p className="text-[10px] leading-snug text-subtle-foreground">{hint}</p>}
    </div>
  );
}

export default SliderNumberField;
