'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import {
  maskField,
  maskUsername,
  maskEmail,
  maskPhone,
  maskAddress,
  type MaskType,
} from '@/lib/masking';

interface MaskedTextProps {
  value: string | null | undefined;
  type: MaskType;
  /**
   * Whether the current viewer is authorized to reveal this information.
   * If false, the unmasked data is NEVER rendered in the DOM or any attribute.
   */
  canReveal?: boolean;
  /**
   * Default revealed state. Default is false (MASKED WITH ASTERISKS BY DEFAULT).
   */
  defaultRevealed?: boolean;
  prefix?: string;
  className?: string;
  placeholder?: string;
  label?: string;
}

/**
 * Presentation component that renders sensitive personal data masked with asterisks (*) by default.
 * If `canReveal` is true (e.g. the account owner or admin), provides a secure toggle button
 * allowing the authorized user to reveal and re-mask their information.
 */
export function MaskedText({
  value,
  type,
  canReveal = false,
  defaultRevealed = false,
  prefix = '',
  className,
  placeholder,
  label,
}: MaskedTextProps) {
  const [revealed, setRevealed] = useState(defaultRevealed);

  if (!value || value.trim() === '') {
    return <span className={cn('text-subtle-foreground', className)}>{placeholder ?? 'Not provided'}</span>;
  }

  // If unauthorized to reveal, unmasked value is never rendered or kept in attributes
  if (!canReveal) {
    const masked = maskField(value, type);
    return (
      <span className={cn('font-mono font-medium tracking-tight', className)}>
        {prefix}
        {masked}
      </span>
    );
  }

  const maskedValue = maskField(value, type);
  const displayValue = revealed ? value : maskedValue;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('font-medium', !revealed && 'font-mono tracking-tight')}>
        {prefix}
        {displayValue}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((prev) => !prev)}
        aria-label={
          label
            ? revealed
              ? `Mask ${label}`
              : `Reveal ${label}`
            : revealed
              ? 'Hide personal information'
              : 'Reveal personal information'
        }
        title={revealed ? 'Hide' : 'Reveal'}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {revealed ? (
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </span>
  );
}

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  maskType: 'username' | 'email' | 'phone' | 'generic';
  onValueChange: (val: string) => void;
  label?: string;
  error?: string;
  canReveal?: boolean;
}

/**
 * Secure input field that displays data masked with asterisks (*) by default,
 * with an interactive toggle allowing authorized users to reveal, view, and edit securely.
 */
export function MaskedInput({
  id,
  value,
  maskType,
  onValueChange,
  label,
  error,
  canReveal = true,
  className,
  required,
  ...props
}: MaskedInputProps) {
  const [revealed, setRevealed] = useState(false);

  // Compute masked representation
  const maskedDisplay = React.useMemo(() => {
    if (!value) return '';
    switch (maskType) {
      case 'username':
        return maskUsername(value);
      case 'email':
        return maskEmail(value);
      case 'phone':
        return maskPhone(value);
      case 'generic':
      default:
        return maskField(value, 'generic');
    }
  }, [value, maskType]);

  const handleToggle = () => {
    setRevealed((prev) => !prev);
  };

  return (
    <div>
      {label && (
        <label className="g-label" htmlFor={id}>
          {label} {required && <span className="text-accent-text">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={revealed ? (maskType === 'email' ? 'email' : 'text') : 'text'}
          value={revealed ? value : maskedDisplay}
          onChange={(e) => {
            // When editing in revealed state, pass value through
            if (revealed) {
              onValueChange(e.target.value);
            }
          }}
          onFocus={() => {
            // Unmask on focus so editing feels completely natural and non-blocking
            if (!revealed && canReveal) {
              setRevealed(true);
            }
          }}
          readOnly={!revealed}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'g-input pr-11',
            !revealed && 'font-mono tracking-tight text-foreground/90',
            error && 'border-danger',
            className
          )}
          {...props}
        />
        {canReveal && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={revealed ? `Hide ${label || 'information'}` : `Reveal ${label || 'information'}`}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="g-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
