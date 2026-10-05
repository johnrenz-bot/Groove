'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';

/**
 * The three non-happy states every admin list can land in, in one place.
 *
 * Admin pages all previously hand-rolled these with inline hex colors and a
 * bare spinner. Standardizing here means an empty bookings table and an empty
 * tickets table look identical, which is what makes a console feel like one
 * product instead of six pages.
 */

/** Data failed to load. Always offers a retry, because most failures are transient. */
export function AdminErrorState({
  title = 'Could not load this data',
  message,
  onRetry,
  className = '',
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-[20px] border border-danger/30 bg-danger-soft px-6 py-14 text-center',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-danger/30 bg-danger-soft text-danger"
      >
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h3>
      {message && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={onRetry}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Nothing matched. Distinguishes "there is genuinely nothing yet" from "your
 * filters excluded everything", because those need different words — the second
 * one should not read as an invitation to start creating records.
 */
export function AdminEmptyState({
  title = 'Nothing here yet',
  description,
  action,
  filtered = false,
  onClearFilters,
  icon,
  className = '',
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  /** True when a search or filter is active — swaps the wording and offers a reset */
  filtered?: boolean;
  onClearFilters?: () => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border-strong bg-card px-6 py-16 text-center',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
      >
        {icon ?? (filtered ? <Inbox className="h-5 w-5" /> : <Inbox className="h-5 w-5" />)}
      </span>
      <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">
        {filtered ? 'No matching records' : title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description ??
          (filtered
            ? 'No records match the current search and filters. Try widening them.'
            : 'Records will appear here as soon as they exist.')}
      </p>
      {filtered && onClearFilters && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
      {!filtered && action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * Inline confirmation for destructive actions. The old admin pages called
 * `window.confirm`, which cannot express what exactly is about to be deleted.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-[24px] border border-border bg-card p-6 shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
              destructive
                ? 'border-danger/30 bg-danger-soft text-danger'
                : 'border-accent-border bg-accent-soft text-accent-text'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h2>
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{message}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Transient success/failure toast. Auto-dismisses; never used for errors that need action. */
export function AdminToast({
  tone = 'success',
  message,
  onDismiss,
}: {
  tone?: 'success' | 'danger';
  message: string | null;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-4 py-2.5 text-xs font-semibold shadow-[var(--shadow-lg)]',
        tone === 'success'
          ? 'border-success/30 bg-success-soft text-success'
          : 'border-danger/30 bg-danger-soft text-danger'
      )}
    >
      {message}
    </div>
  );
}