'use client';

import React from 'react';
import { cn } from '@/components/shared/cn';

export type FeatureProgressTone = 'gold' | 'success' | 'neutral';

export interface FeatureProgressProps {
  /** Human name of the workflow this progress belongs to. */
  label?: string;
  /** Real completed count for this workflow — never a shared app-wide counter. */
  completed: number;
  /** Real total for this workflow. */
  total: number;
  /** Optional supporting sentence (e.g. what is still missing). */
  description?: string;
  tone?: FeatureProgressTone;
  variant?: 'bar' | 'ring';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showValue?: boolean;
  /** Overrides the default “N of M” readout. */
  valueText?: string;
  /** Use on a permanently dark surface (the success toast). */
  onDark?: boolean;
  className?: string;
  /** Accessible name; defaults to the label + counts. */
  ariaLabel?: string;
}

const RING_PX: Record<NonNullable<FeatureProgressProps['size']>, number> = {
  sm: 40,
  md: 56,
  lg: 72,
};

const BAR_HEIGHT: Record<NonNullable<FeatureProgressProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
};

function clampCount(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), Math.max(max, 0));
}

/**
 * Reusable progress readout for any feature with a genuine, measurable goal.
 *
 * The caller supplies the counts. This component never derives a total from a
 * different workflow and never displays a shared “app progress” number, so a
 * badge checklist (e.g. 1 of 3 tasks) and profile completion (e.g. 3 of 7
 * requirements) stay independent.
 */
export function FeatureProgress({
  label,
  completed,
  total,
  description,
  tone = 'gold',
  variant = 'bar',
  size = 'md',
  showLabel = true,
  showValue = true,
  valueText,
  onDark = false,
  className,
  ariaLabel,
}: FeatureProgressProps) {
  const safeTotal = Math.max(0, Math.round(Number.isFinite(total) ? total : 0));
  const safeCompleted = clampCount(completed, safeTotal);
  const percent = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  const value = valueText ?? `${safeCompleted} of ${safeTotal}`;
  const accessibleName =
    ariaLabel ??
    `${label ? `${label}: ` : ''}${safeCompleted} of ${safeTotal} complete (${percent}%)`;

  const fillClass =
    tone === 'success'
      ? 'bg-success'
      : tone === 'neutral'
        ? onDark
          ? 'bg-[#f7f0e1]'
          : 'bg-foreground'
        : 'bg-[var(--brand-sunburst)]';

  const ringClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'neutral'
        ? onDark
          ? 'text-[#f7f0e1]'
          : 'text-foreground'
        : 'text-[var(--brand-sunburst)]';

  if (variant === 'ring') {
    const px = RING_PX[size];
    const stroke = size === 'sm' ? 4 : size === 'lg' ? 6 : 5;
    const radius = (px - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percent / 100);

    return (
      <div
        className={cn('flex items-center gap-3', className)}
        role="progressbar"
        aria-label={accessibleName}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={value}
      >
        <div className="relative shrink-0" style={{ width: px, height: px }}>
          <svg
            width={px}
            height={px}
            viewBox={`0 0 ${px} ${px}`}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className={onDark ? 'text-white/12' : 'text-muted'}
            />
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(ringClass, 'transition-[stroke-dashoffset] duration-500 ease-out')}
            />
          </svg>
          <span
            className={cn(
              'absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums',
              onDark ? 'text-[#f7f0e1]' : 'text-foreground'
            )}
            aria-hidden="true"
          >
            {percent}%
          </span>
        </div>

        {(label || showValue || description) && (
          <div className="min-w-0">
            {(label || showValue) && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {label && showLabel && (
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      onDark ? 'text-[#f7f0e1]' : 'text-foreground'
                    )}
                  >
                    {label}
                  </p>
                )}
                {showValue && (
                  <p
                    className={cn(
                      'text-xs font-medium tabular-nums',
                      onDark ? 'text-[#c9c1b2]' : 'text-muted-foreground'
                    )}
                  >
                    {value}
                  </p>
                )}
              </div>
            )}
            {description && (
              <p
                className={cn(
                  'mt-0.5 text-xs leading-relaxed',
                  onDark ? 'text-[#c9c1b2]' : 'text-muted-foreground'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-1.5', className)}
      role="progressbar"
      aria-label={accessibleName}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={value}
    >
      {(label || showValue) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          {label && showLabel && (
            <p
              className={cn(
                'text-xs font-semibold',
                onDark ? 'text-[#f7f0e1]' : 'text-foreground'
              )}
            >
              {label}
            </p>
          )}
          {showValue && (
            <p
              className={cn(
                'ml-auto text-[11px] font-medium tabular-nums',
                onDark ? 'text-[#c9c1b2]' : 'text-muted-foreground'
              )}
            >
              {value}
            </p>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full',
          BAR_HEIGHT[size],
          onDark ? 'bg-white/12' : 'bg-muted'
        )}
        aria-hidden="true"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fillClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {description && (
        <p
          className={cn(
            'text-xs leading-relaxed',
            onDark ? 'text-[#c9c1b2]' : 'text-muted-foreground'
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default FeatureProgress;
