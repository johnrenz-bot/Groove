'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/shared/cn';

export interface RegistrationProgressItem {
  /** One-based position. Rendered inside the step circle. */
  id: number;
  label: string;
  detail?: string;
  disabled?: boolean;
}

export interface RegistrationProgressProps {
  /** Context label on the left, e.g. "Coach application". */
  label: string;
  /** Position label on the right, e.g. "Step 1 of 3". */
  status: string;
  /** Percentage filled on the progress track. */
  percent: number;
  items: RegistrationProgressItem[];
  /** Id of the current item. Earlier items render as complete. */
  activeId: number;
  onSelect?: (id: number) => void;
  /** Accessible name for the step list / progress bar. */
  ariaLabel: string;
  className?: string;
}

/**
 * Shared registration stepper used by both the coach and performer flows.
 *
 * It is deliberately presentational: the coach page drives it with its current
 * form step, while the client page maps it to the visible form section. Keeping
 * the anatomy here means the numbering, circles, progress bar and completed
 * state can never drift apart between the two registration pages.
 */
export function RegistrationProgress({
  label,
  status,
  percent,
  items,
  activeId,
  onSelect,
  ariaLabel,
  className,
}: RegistrationProgressProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className={cn('reg-progress', className)}>
      <div className="reg-progress-meta">
        <span>{label}</span>
        <span>
          {status}
          <span className="reg-progress-percent"> · {value}%</span>
        </span>
      </div>

      <div
        className="reg-progress-track"
        role="progressbar"
        aria-label={`${ariaLabel} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span style={{ width: `${value}%` }} />
      </div>

      <ol
        className="reg-step-list"
        aria-label={ariaLabel}
        style={{ '--reg-step-count': items.length } as React.CSSProperties}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          const isComplete = item.id < activeId;
          const isDisabled = Boolean(item.disabled);

          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (!isDisabled) onSelect?.(item.id);
                }}
                disabled={isDisabled}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'reg-step',
                  isActive && 'reg-step--active',
                  isComplete && 'reg-step--complete',
                  isDisabled && 'reg-step--disabled'
                )}
              >
                <span className="reg-step-circle" aria-hidden="true">
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : item.id}
                </span>
                <span className="min-w-0 text-center">
                  <span className="reg-step-label">{item.label}</span>
                  {item.detail && <span className="reg-step-detail">{item.detail}</span>}
                </span>
                {isComplete && <span className="sr-only">Completed</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default RegistrationProgress;
