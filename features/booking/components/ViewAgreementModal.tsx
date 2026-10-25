'use client';

import React from 'react';
import {
  FileSignature,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AgreementPaper,
  SessionAgreementDocument,
} from './SessionAgreementDocument';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_FOOTER_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { agreementReference, type BookingAgreement } from '../services/bookingAgreement';

interface ViewAgreementModalProps {
  open: boolean;
  onClose: () => void;
  agreement: BookingAgreement;
  clientSignatureUrl: string | null;
  coachSignatureUrl: string | null;
  sessionTime?: string | null;
  sessionGoal?: string | null;
  onOpenSign?: () => void;
  canSign?: boolean;
  isSigned?: boolean;
  bookingConfirmed?: boolean;
}

/**
 * Dedicated professional modal for viewing the full session agreement.
 * Features:
 * - Fixed header with document details and live status pills
 * - Scrollable legal agreement content inside modal only
 * - Sticky bottom action buttons (Print/PDF, Review & Sign, Close)
 * - Responsive layout with smooth entrance animation
 */
export function ViewAgreementModal({
  open,
  onClose,
  agreement,
  clientSignatureUrl,
  coachSignatureUrl,
  sessionTime,
  sessionGoal,
  onOpenSign,
  canSign = false,
  isSigned = false,
  bookingConfirmed = false,
}: ViewAgreementModalProps) {
  const { backdropProps } = useModalDismiss({ open, onClose });

  if (!open) return null;

  const ref = agreementReference(agreement);
  const bothSigned = Boolean(agreement.client_signed_at && agreement.coach_signed_at);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
      role="dialog"
      aria-modal="true"
      aria-label="View Full Session Agreement"
      {...backdropProps}
    >
      <div className={cn(MODAL_PANEL_CLASS, 'max-w-4xl max-h-[92vh] animate-in fade-in zoom-in-95 duration-300 sm:select-text')}>
        {/* Fixed Header */}
        <header className={cn(MODAL_HEADER_CLASS, 'flex-wrap items-center gap-3 px-5 py-4 sm:px-7 sm:py-5')}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text shadow-sm"
              aria-hidden="true"
            >
              <FileSignature className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Session Agreement
                </h2>
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                  {ref}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Groove System Legally Binding Digital Performing Arts Contract
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pill */}
            <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-semibold sm:flex">
              {bookingConfirmed || bothSigned ? (
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Fully Executed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-warning">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Signatures In Progress
                </span>
              )}
            </div>

            <ModalCloseButton onClose={onClose} label="Close agreement dialog" />
          </div>
        </header>

        {/* Scrollable Content Inside Modal Only */}
        <div className="g-scroll flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
          <AgreementPaper className="shadow-sm">
            <SessionAgreementDocument
              agreement={agreement}
              clientSignatureUrl={clientSignatureUrl}
              coachSignatureUrl={coachSignatureUrl}
              sessionTime={sessionTime}
              sessionGoal={sessionGoal}
            />
          </AgreementPaper>
        </div>

        {/* Sticky Action Buttons Footer */}
        <footer className={cn(MODAL_FOOTER_CLASS, 'flex-wrap items-center justify-between px-5 py-4 sm:px-7')}>
          <div className="flex items-center gap-2 text-xs">
            {isSigned ? (
              <span className="flex items-center gap-1.5 font-medium text-success">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Signed by you
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-warning">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Awaiting your signature
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Print / Save PDF
            </Button>

            {canSign && onOpenSign && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenSign();
                }}
                icon={<FileSignature className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Review &amp; Sign
              </Button>
            )}

            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ViewAgreementModal;
