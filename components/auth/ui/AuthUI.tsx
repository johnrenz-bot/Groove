'use client';

import React, { forwardRef, useId, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ==========================================================================
   AUTH DESIGN SYSTEM — v2
   --------------------------------------------------------------------------
   Small, presentational building blocks shared by /login, /forgot-password,
   /register/client and /register/coach. They carry no auth logic: every
   control is a plain input/button that the pages wire to their existing
   state and handlers.

   The visual tokens live in `app/globals.css` under `.tsp-auth` (`--av-*`).
   Keeping geometry in CSS rather than scattered `h-*` utilities means the
   44px control height, 10px field radius and 16px card radius stay exact at
   the 14px root this project uses.
   ========================================================================== */

/* ─── Surfaces ──────────────────────────────────────────────────────────── */

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn('av-card', className)}>{children}</section>;
}

export function IconTile({
  children,
  className,
  size = 'sm',
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'lg';
}) {
  return (
    <span className={cn('av-icon-tile', size === 'lg' && 'av-icon-tile--lg', className)} aria-hidden="true">
      {children}
    </span>
  );
}

/* ─── Headings & dividers ───────────────────────────────────────────────── */

export function SectionHeading({
  children,
  description,
  action,
  id,
  as: Tag = 'h3',
  className,
  divided = true,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
  divided?: boolean;
}) {
  return (
    <div className={cn('av-section', !divided && 'av-section--plain', className)}>
      <div className="av-section-row">
        <Tag id={id} className="av-section-title">
          {children}
        </Tag>
        {action}
      </div>
      {description ? <p className="av-section-desc">{description}</p> : null}
    </div>
  );
}

export function Divider({
  label,
  variant = 'dashed',
  className,
}: {
  label?: React.ReactNode;
  variant?: 'dashed' | 'dotted' | 'solid';
  className?: string;
}) {
  return (
    <div
      className={cn('av-divider', `av-divider--${variant}`, className)}
      role="separator"
      aria-label={typeof label === 'string' ? label : undefined}
    >
      {label ? <span className="av-divider-label">{label}</span> : null}
    </div>
  );
}

/* ─── Buttons ───────────────────────────────────────────────────────────── */

export type AuthButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AuthButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Kept for source compatibility with the older <Button>; the auth button is always a pill. */
  pill?: boolean;
  /** Kept for source compatibility; the auth control height is fixed at 44px. */
  size?: string;
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(function AuthButton(
  {
    variant = 'primary',
    loading = false,
    icon,
    trailingIcon,
    pill: _pill,
    size: _size,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  // Kept for source compatibility with the older <Button>; both are no-ops.
  void _pill;
  void _size;
  const resolved = variant === 'outline' ? 'secondary' : variant;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('av-btn', `av-btn--${resolved}`, className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="av-btn-spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="av-btn-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="av-btn-label">{children}</span>
      {trailingIcon && !loading ? (
        <span className="av-btn-icon" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
});

/* ─── Field wrapper ─────────────────────────────────────────────────────── */

export interface AuthFieldRenderProps {
  id: string;
  'aria-invalid': 'true' | undefined;
  'aria-describedby': string | undefined;
  className: string;
}

export function Field({
  id,
  label,
  required,
  optional,
  error,
  hint,
  action,
  className,
  children,
}: {
  id: string;
  label?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: (props: AuthFieldRenderProps) => React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('av-field', className)}>
      {label ? (
        <div className="av-label-row">
          <label htmlFor={id} className="av-label">
            <span>{label}</span>
            {required ? (
              <span className="av-required" aria-hidden="true">
                *
              </span>
            ) : null}
            {optional ? <span className="av-optional">Optional</span> : null}
          </label>
          {action ? <div className="av-label-action">{action}</div> : null}
        </div>
      ) : null}

      {children({
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        className: cn('av-input', error && 'av-input--invalid'),
      })}

      {error ? (
        <p id={errorId} className="av-error" role="alert">
          <AlertCircle className="av-error-icon" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="av-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ─── Text + textarea controls ──────────────────────────────────────────── */

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  action?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  fieldClassName?: string;
}

export function TextField({
  label,
  error,
  hint,
  required,
  optional,
  action,
  leadingIcon,
  fieldClassName,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generated = useId();
  const fieldId = id || generated;

  return (
    <Field
      id={fieldId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      action={action}
      className={fieldClassName}
    >
      {(fieldProps) => (
        <div className={cn('av-input-wrap', leadingIcon && 'av-input-wrap--icon')}>
          {leadingIcon ? (
            <span className="av-input-icon" aria-hidden="true">
              {leadingIcon}
            </span>
          ) : null}
          <input
            id={fieldProps.id}
            aria-invalid={fieldProps['aria-invalid']}
            aria-describedby={fieldProps['aria-describedby']}
            className={cn(fieldProps.className, leadingIcon && 'av-input--with-icon', className)}
            {...props}
          />
        </div>
      )}
    </Field>
  );
}

export interface PasswordFieldProps extends Omit<TextFieldProps, 'leadingIcon'> {
  leadingIcon?: React.ReactNode;
}

export function PasswordField({
  label,
  error,
  hint,
  required,
  optional,
  action,
  leadingIcon,
  fieldClassName,
  id,
  className,
  ...props
}: PasswordFieldProps) {
  const generated = useId();
  const fieldId = id || generated;
  const [revealed, setRevealed] = useState(false);

  return (
    <Field
      id={fieldId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      action={action}
      className={fieldClassName}
    >
      {(fieldProps) => (
        <div
          className={cn(
            'av-input-wrap',
            'av-input-wrap--password',
            leadingIcon && 'av-input-wrap--icon'
          )}
        >
          {leadingIcon ? (
            <span className="av-input-icon" aria-hidden="true">
              {leadingIcon}
            </span>
          ) : null}
          <input
            id={fieldProps.id}
            type={revealed ? 'text' : 'password'}
            aria-invalid={fieldProps['aria-invalid']}
            aria-describedby={fieldProps['aria-describedby']}
            className={cn(fieldProps.className, leadingIcon && 'av-input--with-icon', className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="av-eye"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      )}
    </Field>
  );
}

export function TextArea({
  label,
  error,
  hint,
  required,
  optional,
  action,
  fieldClassName,
  id,
  className,
  ...props
}: TextFieldProps & { children?: React.ReactNode }) {
  const generated = useId();
  const fieldId = id || generated;

  return (
    <Field
      id={fieldId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      action={action}
      className={fieldClassName}
    >
      {(fieldProps) => (
        <textarea
          id={fieldProps.id}
          aria-invalid={fieldProps['aria-invalid']}
          aria-describedby={fieldProps['aria-describedby']}
          className={cn(fieldProps.className, 'av-textarea', className)}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      )}
    </Field>
  );
}

/* ─── Checkbox ──────────────────────────────────────────────────────────── */

export function Checkbox({
  id,
  label,
  className,
  labelClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: React.ReactNode;
  labelClassName?: string;
}) {
  return (
    <label htmlFor={id} className={cn('av-check', className)}>
      <input id={id} type="checkbox" className="av-checkbox" {...props} />
      <span className={cn('av-check-label', labelClassName)}>{label}</span>
    </label>
  );
}

/* ─── Selectable cards ──────────────────────────────────────────────────── */

export function SelectableCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  meta,
  disabled,
  className,
  align = 'row',
}: {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  align?: 'row' | 'center';
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'av-choice',
        align === 'center' && 'av-choice--center',
        selected && 'is-selected',
        className
      )}
    >
      {icon ? <span className="av-choice-icon">{icon}</span> : null}
      <span className="av-choice-copy">
        <span className="av-choice-title">{title}</span>
        {description ? <span className="av-choice-desc">{description}</span> : null}
        {meta ? <span className="av-choice-meta">{meta}</span> : null}
      </span>
      <span className="av-choice-radio" aria-hidden="true" />
    </button>
  );
}

/* ─── Success mark (forgot password / completion states) ────────────────── */

export function SuccessTile({ children }: { children?: React.ReactNode }) {
  return (
    <span className="av-success-tile" aria-hidden="true">
      {children ?? <Check className="h-7 w-7" />}
    </span>
  );
}

/* Friendly aliases so pages can import the vocabulary from the brief. */
export { Field as FormField, TextField as TextInput, PasswordField as PasswordInput };
export { AuthButton as Button };

export default AuthCard;

