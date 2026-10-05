'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export interface Step {
  id: string;
  label: string;
  description?: string;
}

/**
 * Horizontal progress indicator for multi-step forms.
 * Renders as an ordered list so the step order is conveyed to assistive tech,
 * with `aria-current="step"` on the active step.
 */
export function Stepper({
  steps,
  current,
  onStepClick,
  className = '',
}: {
  steps: Step[];
  /** Zero-based index of the active step */
  current: number;
  /** Optional: allow jumping back to a completed step */
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="flex items-center gap-2">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = Boolean(onStepClick) && done;

          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-center gap-2">
                  <button
                    type="button"
                    onClick={reachable ? () => onStepClick?.(i) : undefined}
                    disabled={!reachable}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-200',
                      done
                        ? 'border-accent bg-accent text-accent-foreground'
                        : active
                          ? 'border-accent bg-accent-soft text-accent-text'
                          : 'border-border bg-card text-subtle-foreground',
                      reachable && 'cursor-pointer hover:border-accent hover:shadow-[var(--shadow-sm)]',
                      !reachable && !active && 'cursor-default'
                    )}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                  </button>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-px flex-1 transition-colors duration-200',
                        done ? 'bg-accent' : 'bg-border'
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'truncate text-center text-[11px] font-semibold',
                    active ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-subtle-foreground'
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {done ? ' — completed' : active ? ' — current step' : ' — upcoming'}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Footer nav for multi-step forms: Back + Next/Submit with loading state. */
export function StepActions({
  onBack,
  onNext,
  nextLabel = 'Continue',
  submitLabel,
  submitting = false,
  backDisabled = false,
  nextDisabled = false,
  error,
  className = '',
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  submitLabel?: string;
  submitting?: boolean;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  error?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled || submitting}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Back
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={submitting || nextDisabled}
        aria-busy={submitting || undefined}
        className={cn(
          'inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-semibold text-accent-foreground',
          'shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-accent-hover hover:shadow-[var(--shadow-accent)]',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
          error && !submitting && 'ring-2 ring-danger ring-offset-2 ring-offset-background'
        )}
      >
        {submitting && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        )}
        {submitting ? 'Please wait…' : submitLabel || nextLabel}
      </button>
    </div>
  );
}

export default Stepper;
