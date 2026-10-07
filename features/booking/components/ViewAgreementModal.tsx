'use client';

import React from 'react';
import {
  FileSignature,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import {
  AgreementPaper,
  SessionAgreementDocument,
} from './SessionAgreementDocument';
import { Button } from '@/components/ui/Button';
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
  if (!open) return null;

  const ref = agreementReference(agreement);
  const bothSigned = Boolean(agreement.client_signed_at && agreement.coach_signed_at);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md transition-opacity duration-200 sm:p-5 animate-in fade-in select-none sm:select-text"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="View Full Session Agreement"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:rounded-3xl">
        {/* Fixed Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-divider bg-card/95 px-5 py-4 backdrop-blur-sm sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
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

          <div className="flex items-center gap-3">
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

            <button
              type="button"
              onClick={onClose}
              aria-label="Close agreement dialog"
              className="cursor-pointer rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-5 w-5" />
            </button>
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
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-divider bg-muted/40 px-5 py-4 backdrop-blur-sm sm:px-7">
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
