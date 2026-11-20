'use client';

import React, { useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColorPickerPopover } from './ColorPickerPopover';

export function ControlGroup({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-[13px] font-semibold text-muted-foreground">
        {label}
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-card/60 px-3 py-2.5 transition-colors hover:border-border-strong">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm font-medium text-foreground">
        {label}
      </label>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`${label} color, ${value.toUpperCase()}`}
        className="group flex shrink-0 cursor-pointer items-center gap-2 rounded-[10px] py-0.5 pl-0.5 pr-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="h-8 w-9 rounded-[9px] border border-white/20 shadow-inner"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-[11px] uppercase leading-none text-muted-foreground group-hover:text-foreground">
          {value}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-3.5 w-3.5 text-subtle-foreground transition-transform duration-150', open && 'rotate-180')}
        />
      </button>
      <ColorPickerPopover
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={onChange}
        anchorRef={anchorRef}
        label={label}
      />
    </div>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-xs text-muted-foreground">
          {formatValue ? formatValue(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </div>
  );
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-[12px] border border-border bg-card/60 px-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200',
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
    </div>
  );
}
