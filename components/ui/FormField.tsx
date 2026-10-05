'use client';

import React, { forwardRef } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

function Label({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="g-label flex items-center justify-between gap-2">
      <span>
        {children}
        {required && (
          <span className="ml-0.5 text-accent-text" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {optional && <span className="text-[11px] font-normal text-subtle-foreground">Optional</span>}
    </label>
  );
}

/**
 * Generic labelled field wrapper. Render `children` as the control — it gets
 * the generated id, invalid state, and described-by wiring automatically.
 *
 *   <FormField label="Email" error={errors.email}>
 *     <input name="email" type="email" ... />
 *   </FormField>
 */
export function FormField({
  label,
  error,
  hint,
  required,
  optional,
  id,
  className = '',
  children,
}: {
  label?: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  /** Explicit id; one is generated when omitted */
  id?: string;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid': 'true' | undefined;
    'aria-describedby': string | undefined;
    className: string;
  }) => React.ReactNode;
}) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fieldId} required={required} optional={optional}>
          {label}
        </Label>
      )}
      {children({
        id: fieldId,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        className: cn('g-input', error && 'border-danger'),
      })}
      {error ? (
        <p id={`${fieldId}-error`} className="g-field-error" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="g-field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Password strength + requirements                                    */
/* ------------------------------------------------------------------ */

export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'lowercase', label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'uppercase', label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'number', label: 'One number', test: (v: string) => /\d/.test(v) },
] as const;

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

/** 0–4 score: length bonus plus one point per satisfied requirement. */
export function scorePassword(value: string): StrengthLevel {
  if (!value) return 0;
  let score = 0;
  for (const req of PASSWORD_REQUIREMENTS) if (req.test(value)) score += 1;
  // One extra point for a long passphrase.
  if (value.length >= 14 && score >= 3) score += 1;
  return Math.min(score, 4) as StrengthLevel;
}

export const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  0: 'Enter a password',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

const STRENGTH_TONE: Record<StrengthLevel, string> = {
  0: 'bg-muted',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-accent',
  4: 'bg-success',
};

const STRENGTH_TEXT: Record<StrengthLevel, string> = {
  0: 'text-muted-foreground',
  1: 'text-danger',
  2: 'text-warning',
  3: 'text-accent-text',
  4: 'text-success',
};

/** Four-segment meter + label, driven purely by token colors. */
export function PasswordStrength({ value, className = '' }: { value: string; className?: string }) {
  const score = scorePassword(value);
  if (!value) return null;

  return (
    <div className={cn('mt-3 space-y-2', className)}>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((seg) => (
            <span
              key={seg}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-200',
                score >= seg ? STRENGTH_TONE[score] : 'bg-muted'
              )}
            />
          ))}
        </div>
        <span className={cn('text-[11px] font-semibold', STRENGTH_TEXT[score])}>
          {STRENGTH_LABELS[score]}
        </span>
      </div>
      <span className="sr-only" aria-live="polite">
        Password strength: {STRENGTH_LABELS[score]}
      </span>
    </div>
  );
}

/** Live pass/fail checklist. Unmet items show only once typing has begun. */
export function PasswordRequirements({
  value,
  className = '',
}: {
  value: string;
  className?: string;
}) {
  if (!value) return null;
  return (
    <ul className={cn('mt-3 grid gap-1.5 sm:grid-cols-2', className)}>
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.test(value);
        return (
          <li
            key={req.id}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors duration-150',
              met ? 'text-success' : 'text-muted-foreground'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                met ? 'bg-success-soft text-success' : 'bg-muted text-subtle-foreground'
              )}
            >
              {met ? <Check className="h-2.5 w-2.5" /> : <span className="block h-1 w-1 rounded-full bg-current" />}
            </span>
            <span>{req.label}</span>
            <span className="sr-only">{met ? ' — met' : ' — not met yet'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
  /** Show the strength meter and requirements checklist */
  showStrength?: boolean;
  /** Show the "Passwords do not match" error once `confirm` is true */
  confirm?: boolean;
}

/**
 * Password field with show/hide toggle, optional strength meter and
 * requirements checklist. `autoComplete` and `name` are passed straight
 * through so form contracts are unchanged.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      label,
      error,
      hint,
      showStrength = false,
      confirm = false,
      id,
      className = '',
      value,
      ...props
    },
    ref
  ) {
    const [revealed, setRevealed] = React.useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const current = typeof value === 'string' ? value : '';
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={revealed ? 'text' : 'password'}
            value={value}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={cn('g-input pr-11', error && 'border-danger', className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {showStrength && <PasswordStrength value={current} />}
        {showStrength && <PasswordRequirements value={current} />}

        {error ? (
          <p id={`${inputId}-error`} className="g-field-error" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="g-field-hint">
            {hint}
          </p>
        ) : null}

        {confirm && current && !error && (
          <p className="sr-only" aria-live="polite">
            Password confirmation captured.
          </p>
        )}
      </div>
    );
  }
);

export default FormField;
