'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/**
 * Server-error banner. Rendered above a form's submit button with
 * role="alert" so screen readers announce it the moment it appears.
 */
export function FormError({
  message,
  onDismiss,
  className = '',
}: {
  message?: string | null;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3.5',
        className
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      <p className="flex-1 text-sm leading-relaxed text-danger">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 cursor-pointer text-xs font-semibold text-danger underline underline-offset-2"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

/** Neutral informational banner (hints, tips, next steps). */
export function FormNotice({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-info/25 bg-info-soft px-4 py-3.5',
        className
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
      <div className="flex-1 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

/** Inline success confirmation used after a successful step or submit. */
export function FormSuccess({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft px-4 py-3.5',
        className
      )}
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      <div className="flex-1 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

export default FormError;
