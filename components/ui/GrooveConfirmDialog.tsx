'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';

/**
 * CONFIRMATION AND ALERT DIALOGS, ON TOP OF THE EXISTING `<Modal>`.
 *
 * There are now twelve modals in this app and every one of them hand-rolls its
 * own confirm row: the button order, the "are you sure" copy, whether the
 * dangerous action is on the left or the right, and whether the dialog closes
 * while the request is still in flight. This is the shared version, and it does
 * NOT replace `<Modal>` — it composes it, so the twelve existing dialogs keep
 * every behaviour they already have (Escape, focus trap, focus restore, body
 * lock, scrollable body) without being touched.
 *
 * USE IT FOR ACTIONS THAT ALREADY EXIST
 *   Deleting a post, cancelling a booking, discarding an unsaved form, signing
 *   out, withdrawing an application. If a flow does not already have a
 *   confirmation, this does not add one — an extra "are you sure" in front of
 *   every action is how confirmation fatigue starts.
 *
 * THE TWO THINGS THIS ENCODES
 *
 *   1. The dangerous action is styled as dangerous. `<Button variant="danger">`
 *      exists for exactly this and was previously used by almost nothing. A
 *      confirm dialog whose destructive button looks identical to its cancel
 *      button is not asking the question.
 *   2. `onConfirm` may be async. The dialog closes only when the promise
 *      resolves, and stays open — with the button in a loading state and
 *      repeated clicks ignored — while it is in flight. It also does NOT close
 *      when the promise REJECTS: a failed delete must not report success by
 *      closing the only dialog the user was looking at.
 */

export type GrooveDialogTone = 'danger' | 'warning' | 'success' | 'info';

const TONE_ICON: Record<GrooveDialogTone, React.ElementType> = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const TONE_STYLES: Record<GrooveDialogTone, string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  info: 'bg-accent-soft text-accent-text',
};

export interface GrooveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One or two sentences saying what happens, not just "Are you sure?". */
  description?: React.ReactNode;
  /** The action being confirmed. Keep it a verb phrase: "Delete post". */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: GrooveDialogTone;
  /**
   * Reject to keep the dialog open — use this for a failed operation so the
   * user can retry without losing context.
   */
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function GrooveConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  children,
}: GrooveConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const Icon = TONE_ICON[tone];

  const handleConfirm = async () => {
    // Guard first: without this a double-tap fires two DELETEs.
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
      setPending(false);
      onClose();
    } catch {
      // Deliberately does not close. The caller renders its own error; closing
      // here would tell the user the operation succeeded by dismissing the only
      // surface that told them what was about to happen.
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      size="sm"
      showClose={!pending}
      /* Modal only derives an accessible name from a STRING `title`. These dialogs
         render their heading in the body beside the icon, so without this the
         dialog is announced as just "dialog". */
      aria-label={title}
      className="groove-confirm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' || tone === 'warning' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            TONE_STYLES[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          {/* The title is rendered here rather than through `Modal`'s `title`
              so the icon can sit beside it in one row. `Modal` labels the
              dialog from this heading via `aria-labelledby`. */}
          <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">{title}</h2>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
          {children}
        </div>
      </div>
    </Modal>
  );
}

/**
 * A single-button acknowledgement — "saved", "sent", "link copied".
 *
 * Deliberately NOT a toast: toasts need a host, a queue and a dismissal policy,
 * and none of that exists in this app yet. A one-line acknowledgement that the
 * user asked for is honest without inventing infrastructure; when a real toast
 * system exists this is the thing it should render.
 */
export function GrooveAlertDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'OK',
  tone = 'info',
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: GrooveDialogTone;
  onConfirm?: () => void;
}) {
  const Icon = TONE_ICON[tone];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      aria-label={title}
      className="groove-confirm"
      footer={
        <Button onClick={onConfirm ?? onClose}>
          {confirmLabel}
        </Button>
      }
    >
      <div className="flex gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            TONE_STYLES[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">{title}</h2>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default GrooveConfirmDialog;
