'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Modal, ModalIconTile } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/**
 * CONFIRMATION AND ALERT DIALOGS, ON TOP OF THE EXISTING `<Modal>`.
 *
 * Refactored to use the Welcome Modal design standard.
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
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
      setPending(false);
      onClose();
    } catch {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title={title}
      size="sm"
      showClose={!pending}
      className="groove-confirm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
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
      <div className="flex items-start gap-4">
        <ModalIconTile icon={Icon} className={TONE_STYLES[tone]} />
        <div className="min-w-0 flex-1 space-y-3">
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
          {children}
        </div>
      </div>
    </Modal>
  );
}

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
      title={title}
      size="sm"
      className="groove-confirm"
      footer={
        <Button variant="primary" onClick={onConfirm ?? onClose}>
          {confirmLabel}
        </Button>
      }
    >
      <div className="flex items-start gap-4">
        <ModalIconTile icon={Icon} className={TONE_STYLES[tone]} />
        {description && (
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </Modal>
  );
}

export default GrooveConfirmDialog;
