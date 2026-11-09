'use client';

import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/** Shared message row under a control — error first, then hint. */
function FieldMessage({ id, error, hint }: { id: string; error?: string | null; hint?: string }) {
  if (error) {
    return (
      <p id={id} className="g-field-error" role="alert">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="g-field-hint">
        {hint}
      </p>
    );
  }
  return null;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Suffix affordance (units, icons) rendered inside the control */
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, suffix, id, className = '', containerClassName = '', ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="g-label">
          {label}
          {props.required && (
            <span className="ml-0.5 text-accent-text" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn('rounded-[12px] w-full bg-card border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground outline-none transition-colors hover:border-border-strong focus:border-accent focus:shadow-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50', suffix && 'pr-12', className)}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-subtle-foreground">
            {suffix}
          </span>
        )}
      </div>
      <FieldMessage id={`${inputId}-error`} error={error} hint={hint} />
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** A node, not just text: callers need to style the required marker inside it. */
  label?: React.ReactNode;
  error?: string | null;
  hint?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = '', containerClassName = '', ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="g-label">
          {label}
          {props.required && (
            <span className="ml-0.5 text-accent-text" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={cn('rounded-[12px] w-full bg-card border border-input px-3 py-3 resize-none text-sm text-foreground placeholder:text-subtle-foreground outline-none transition-colors hover:border-border-strong focus:border-accent focus:shadow-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50', className)}
        {...props}
      />
      <FieldMessage id={`${inputId}-error`} error={error} hint={hint} />
    </div>
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** A node, not just text: callers need to style the required marker inside it. */
  label?: React.ReactNode;
  error?: string | null;
  hint?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = '', containerClassName = '', children, ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="g-label">
          {label}
          {props.required && (
            <span className="ml-0.5 text-accent-text" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={cn('rounded-[12px] w-full appearance-none bg-card border border-input [background-image:var(--select-chevron)] [background-repeat:no-repeat] [background-position:right_0.75rem_center] pr-9 cursor-pointer text-sm text-foreground outline-none transition-colors hover:border-border-strong focus:border-accent focus:shadow-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50', className)}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={`${inputId}-error`} error={error} hint={hint} />
    </div>
  );
});

export default Input;