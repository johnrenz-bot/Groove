'use client';

import React from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/**
 * Card-style single-choice selector used for role pickers, talent picks, and
 * plan/option choices. Implements the radio pattern with a real hidden input so
 * native form submission and validation still work.
 */
export interface SelectCardOption {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function SelectCard({
  name,
  options,
  value,
  onChange,
  columns = 2,
  className = '',
  'aria-label': ariaLabel,
}: {
  name: string;
  options: SelectCardOption[];
  value?: string;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
  'aria-label'?: string;
  className?: string;
}) {
  const grid = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[columns];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid gap-3', grid, className)}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              'relative flex cursor-pointer items-start gap-3.5 rounded-2xl border bg-card p-4 transition-all duration-200',
              'hover:border-border-strong hover:shadow-[var(--shadow-md)]',
              selected
                ? 'border-accent bg-accent-soft shadow-[var(--shadow-sm)]'
                : 'border-border',
              opt.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.icon && (
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                  selected
                    ? 'border-accent-border bg-accent-soft text-accent-text'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {opt.icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-sm font-semibold',
                  selected ? 'text-foreground' : 'text-foreground'
                )}
              >
                {opt.title}
              </span>
              {opt.description && (
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {opt.description}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border-strong'
              )}
            >
              {selected && <Check className="h-3 w-3" />}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Multi-select variant — used for talent/genre tag pickers. */
export function SelectCardMulti({
  name,
  options,
  values = [],
  onChange,
  className = '',
  'aria-label': ariaLabel,
}: {
  name: string;
  options: SelectCardOption[];
  values?: string[];
  onChange: (values: string[]) => void;
  className?: string;
  'aria-label'?: string;
}) {
  const toggle = (val: string) => {
    onChange(values.includes(val) ? values.filter((v) => v !== val) : [...values, val]);
  };

  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <label
            key={opt.value}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200',
              selected
                ? 'border-accent bg-accent-soft text-accent-text'
                : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => toggle(opt.value)}
              className="sr-only"
            />
            {opt.icon}
            {opt.title}
          </label>
        );
      })}
    </div>
  );
}

/** Read-only role chip used on profile pages. */
export function RoleChip({ icon: Icon, label }: { icon?: LucideIcon; label: string }) {
  return (
    <span className="g-pill-accent inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}

export default SelectCard;
