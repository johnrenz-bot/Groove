'use client';

/**
 * <SignoffStepper> — seven semantic steps across the booking lifecycle.
 *
 * Rendered exclusively from deriveStepperSteps() (pure, tested) — this
 * component never re-derives machine state.
 *
 *   done          check chip on green, solid connector
 *   current       orange ring pulse (safe-area motion respected), aria-current="step"
 *   upcoming      muted dashed circle
 *   skipped       dimmed, "Skipped" chip
 *   terminal      the ONLY red step; the line stops there
 *   notApplicable muted dashed, "Not applicable" (never red)
 *
 * Layout: horizontal snap-scroll on wide surfaces; vertical in the case panel
 * and mobile. Timestamps render in Asia/Manila (the product's locale).
 */
import React from 'react';
import { Check, Clock3, Minus, X } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { StepperStep } from '../services/stepper';

const STATE_LABEL: Record<StepperStep['state'], string> = {
  done: 'Done',
  current: 'In progress',
  upcoming: 'Not started',
  skipped: 'Skipped',
  terminal: 'Stopped',
  notApplicable: 'Not applicable',
};

function formatManila(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function nodeClasses(state: StepperStep['state']): string {
  switch (state) {
    case 'done':
      return 'border-success bg-success-soft text-success';
    case 'current':
      return 'border-accent bg-accent-soft text-accent-text';
    case 'upcoming':
      return 'border-dashed border-divider bg-muted text-muted-foreground';
    case 'skipped':
      return 'border-dashed border-divider bg-muted text-subtle-foreground opacity-80';
    case 'terminal':
      return 'border-danger bg-danger text-danger-foreground';
    case 'notApplicable':
      return 'border-dashed border-divider bg-transparent text-subtle-foreground opacity-70';
  }
}

function chipClasses(state: StepperStep['state']): string {
  switch (state) {
    case 'done':
      return 'bg-success text-success-foreground';
    case 'current':
      return 'bg-accent text-accent-foreground';
    case 'upcoming':
      return 'bg-card text-muted-foreground';
    case 'terminal':
      return 'bg-danger text-danger-foreground';
    default:
      return 'bg-muted text-subtle-foreground';
  }
}

function Node({ step, avatarUrl }: { step: StepperStep; avatarUrl?: string | null }) {
  const atLabel = formatManila(step.at);
  const Icon = step.state === 'done' ? Check
    : step.state === 'current' ? Clock3
    : step.state === 'terminal' ? X
    : Minus;
  const aria = `${step.label}, ${STATE_LABEL[step.state]}${atLabel ? `, ${atLabel} PHT` : ''}, ${step.actorName}`;

  return (
    <span
      role="img"
      aria-label={aria}
      aria-current={step.state === 'current' ? 'step' : undefined}
      className={cn(
        'relative flex h-12 w-12 shrink-0 items-center justify-center overflow-visible rounded-full border',
        nodeClasses(step.state)
      )}
    >
      {step.state === 'current' && (
        <span
          aria-hidden="true"
          className="absolute inset-[3px] rounded-full border border-accent motion-safe:animate-ping motion-safe:opacity-40"
        />
      )}
      {step.state !== 'terminal' && avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold" aria-hidden="true">
          {step.state === 'terminal' ? <X className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> : initialsOf(step.actorName)}
        </span>
      )}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-background',
          chipClasses(step.state)
        )}
      >
        <Icon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      </span>
    </span>
  );
}

function StepMeta({ step, align }: { step: StepperStep; align: 'start' | 'center' }) {
  const atLabel = formatManila(step.at);
  return (
    <div className={cn('flex min-w-0 flex-col', align === 'center' && 'items-center text-center')}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <p
          className={cn(
            'text-[11px] font-bold leading-tight',
            step.state === 'done' && 'text-foreground',
            step.state === 'current' && 'text-accent-text',
            step.state === 'upcoming' && 'text-muted-foreground',
            step.state === 'skipped' && 'text-subtle-foreground',
            step.state === 'terminal' && 'text-danger',
            step.state === 'notApplicable' && 'text-subtle-foreground'
          )}
        >
          {step.label}
        </p>
        {step.state === 'skipped' && (
          <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-subtle-foreground">
            Skipped
          </span>
        )}
      </div>
      <p className="mt-0.5 max-w-[10rem] truncate text-[9px] text-muted-foreground">
        {step.actorName}
      </p>
      <p className="mt-0.5 tabular-nums text-[9px] font-semibold text-subtle-foreground">
        {atLabel ? (
          <>
            {atLabel} <span className="uppercase">PHT</span>
          </>
        ) : (
          STATE_LABEL[step.state]
        )}
      </p>
      {step.hint && (
        <p className="mt-0.5 max-w-[12rem] text-[9px] font-semibold leading-snug text-danger">
          {step.hint}
        </p>
      )}
    </div>
  );
}

export function SignoffStepper({
  steps,
  layout = 'vertical',
  avatars,
}: {
  steps: StepperStep[];
  layout?: 'vertical' | 'horizontal';
  /** Photo per role — system steps fall back to the Groove tone. */
  avatars?: { client?: string | null; coach?: string | null };
}) {
  const photoFor = (step: StepperStep): string | null | undefined => {
    if (step.avatarRole === 'client') return avatars?.client ?? null;
    if (step.avatarRole === 'coach') return avatars?.coach ?? null;
    return null;
  };

  if (layout === 'horizontal') {
    return (
      <ol
        aria-label="Sign-offs"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-1"
      >
        {steps.map((step, index) => {
          const prev = steps[index - 1];
          const connectorDone = prev?.state === 'done';
          return (
            <li
              key={step.id}
              className="relative flex w-28 shrink-0 snap-start flex-col items-center pt-1 sm:w-32"
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-6 h-0 w-6 -translate-x-full',
                    connectorDone ? 'border-t-2 border-solid border-success/70' : 'border-t-2 border-dashed border-divider'
                  )}
                />
              )}
              <Node step={step} avatarUrl={photoFor(step)} />
              <div className="mt-2">
                <StepMeta step={step} align="center" />
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol aria-label="Sign-offs" className="flex flex-col">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const connectorDone = step.state === 'done';
        return (
          <li
            key={step.id}
            className={cn('relative flex items-start gap-3 pb-5 last:pb-0', step.state === 'terminal' && 'rounded-xl bg-danger-soft/50 p-2')}
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-6 top-12 h-[calc(100%-2.25rem)] w-0 border-l-2',
                  connectorDone ? 'border-solid border-success/70' : 'border-dashed border-divider'
                )}
              />
            )}
            <Node step={step} avatarUrl={photoFor(step)} />
            <div className="min-w-0 flex-1 pt-0.5">
              <StepMeta step={step} align="start" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

