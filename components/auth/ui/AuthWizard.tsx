'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthButton } from './AuthUI';

/* ==========================================================================
   REGISTRATION WIZARD KIT
   --------------------------------------------------------------------------
   Presentational chrome for the multi-step registration flow: the segmented
   progress bar, the step header, the vertical desktop rail and the sticky
   footer. None of these components own step state — the pages keep deciding
   which step is active and which steps may be revisited.
   ========================================================================== */

export interface WizardStep {
  id: number;
  label: string;
  detail?: string;
  disabled?: boolean;
}

/* ─── Segmented progress bar ────────────────────────────────────────────── */

export function ProgressSegments({
  steps,
  current,
  label = 'Registration progress',
  className,
}: {
  steps: WizardStep[];
  current: number;
  label?: string;
  className?: string;
}) {
  const total = steps.length;
  const active = steps[Math.min(Math.max(current, 1), total) - 1];

  return (
    <div className={cn('rw-progress', className)}>
      <div
        className="rw-progress-track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${total}: ${active?.label ?? ''}`}
        aria-label={label}
      >
        {steps.map((step) => {
          const state = step.id < current ? 'complete' : step.id === current ? 'active' : 'upcoming';
          return (
            <span key={step.id} className="rw-seg" data-state={state}>
              <motion.span
                className="rw-seg-fill"
                initial={false}
                animate={{ scaleX: state === 'upcoming' ? 0 : 1 }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                  delay: state === 'complete' ? 0 : step.id * 0.05,
                }}
              />
            </span>
          );
        })}
      </div>

      <p className="rw-progress-caption">
        <span className="rw-progress-step">
          Step {current} of {total}
        </span>
        <span className="rw-progress-dot" aria-hidden="true">
          ·
        </span>
        <span className="rw-progress-label">{active?.label}</span>
      </p>
    </div>
  );
}

/* ─── Per-step header ───────────────────────────────────────────────────── */

export function StepHeader({
  icon: Icon,
  title,
  description,
  meta,
  className,
}: {
  icon?: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('rw-step-head', className)}>
      {Icon ? (
        <span className="rw-step-icon" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div className="rw-step-head-copy">
        <h2 className="rw-step-title">{title}</h2>
        {description ? <p className="rw-step-desc">{description}</p> : null}
        {meta ? <div className="rw-step-meta">{meta}</div> : null}
      </div>
    </header>
  );
}

/* ─── Desktop vertical rail ─────────────────────────────────────────────── */

export function WizardRail({
  steps,
  current,
  onSelect,
  helper,
  ariaLabel,
}: {
  steps: WizardStep[];
  current: number;
  onSelect?: (id: number) => void;
  helper?: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <aside className="rw-rail" aria-label={ariaLabel}>
      <div className="rw-rail-inner">
        <ol className="rw-rail-list">
          {steps.map((step) => {
            const isActive = step.id === current;
            const isComplete = step.id < current;
            const state = isComplete ? 'complete' : isActive ? 'active' : 'upcoming';
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className="rw-rail-item"
                  data-state={state}
                  aria-current={isActive ? 'step' : undefined}
                  disabled={step.disabled}
                  onClick={() => {
                    if (!step.disabled) onSelect?.(step.id);
                  }}
                >
                  <span className="rw-rail-dot" aria-hidden="true">
                    {isComplete ? <Check className="h-3 w-3" strokeWidth={3} /> : step.id}
                  </span>
                  <span className="rw-rail-copy">
                    <span className="rw-rail-label">{step.label}</span>
                    {step.detail ? <span className="rw-rail-detail">{step.detail}</span> : null}
                  </span>
                  {isComplete ? <span className="sr-only">Completed</span> : null}
                </button>
              </li>
            );
          })}
        </ol>

        {helper ? (
          <p className="rw-rail-help">
            <Sparkles className="h-3.5 w-3.5 text-[var(--av-accent)]" aria-hidden="true" />
            <span>{helper}</span>
          </p>
        ) : null}
      </div>
    </aside>
  );
}

/* ─── Step transition ───────────────────────────────────────────────────── */

const stepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 30 : -30,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -30 : 30,
  }),
};

export function StepTransition({
  stepKey,
  direction,
  children,
  className,
}: {
  stepKey: React.Key;
  direction: number;
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={
          reduceMotion
            ? {
                enter: { opacity: 0 },
                center: { opacity: 1 },
                exit: { opacity: 0 },
              }
            : stepVariants
        }
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: reduceMotion ? 0.14 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn('rw-step-panel', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────── */

export function WizardFooter({
  onBack,
  backLabel = 'Back',
  backDisabled = false,
  skip,
  className,
  children,
}: {
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  skip?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
  /** The primary action (usually Continue / Submit). */
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rw-footer', className)}>
      <div className="rw-footer-side">
        {onBack ? (
          <AuthButton
            type="button"
            variant="ghost"
            className="rw-footer-back"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={onBack}
            disabled={backDisabled}
          >
            {backLabel}
          </AuthButton>
        ) : null}

        {skip ? (
          <button
            type="button"
            className="rw-footer-skip"
            onClick={skip.onClick}
            disabled={skip.disabled}
          >
            {skip.label}
          </button>
        ) : null}
      </div>

      <div className="rw-footer-side rw-footer-side--end">{children}</div>
    </div>
  );
}

/* ─── Animated success mark ─────────────────────────────────────────────── */

export function SuccessCheck({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className={cn('rw-check-ring', className)} aria-hidden="true">
      <svg viewBox="0 0 52 52" className="rw-check-svg" fill="none">
        <motion.circle
          cx="26"
          cy="26"
          r="23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
        <motion.path
          d="M15 27.2 22.4 34.5 37 19"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
        />
      </svg>
    </span>
  );
}

/* ─── Inline icon tile button ───────────────────────────────────────────── */

export function IconButton({
  label,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('rw-icon-btn', className)}
      {...props}
    >
      {children}
    </button>
  );
}

