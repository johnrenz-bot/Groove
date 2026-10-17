'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  ZoomIn,
  ShieldCheck,
  Calendar,
  DollarSign,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { reviewPaymentProof, formatPHP } from '../services/gcashService';
import type { PaymentTransaction } from '../types';

interface PaymentReviewModalProps {
  open: boolean;
  onClose: () => void;
  transaction: PaymentTransaction;
  reviewerId: string;
  onSuccess?: (updated: PaymentTransaction) => void;
}

export function PaymentReviewModal({
  open,
  onClose,
  transaction,
  reviewerId,
  onSuccess,
}: PaymentReviewModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [fullReceiptOpen, setFullReceiptOpen] = useState(false);

  if (!open) return null;

  const handleCopyRef = async () => {
    if (!transaction.gcash_ref_number) return;
    try {
      await navigator.clipboard.writeText(transaction.gcash_ref_number.replace(/[\s-]/g, ''));
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleReview = async (status: 'confirmed' | 'rejected') => {
    setErrorMsg(null);

    if (status === 'rejected' && !reviewNotes.trim()) {
      setErrorMsg('Please specify a brief reason for declining the proof so the payer can correct it.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await reviewPaymentProof({
        transaction_id: transaction.id,
        payment_status: status,
        reviewer_id: reviewerId,
        review_notes: reviewNotes.trim() || undefined,
      });

      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update payment status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-review-title"
      >
        <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-divider bg-muted/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 id="payment-review-title" className="text-base font-bold text-foreground">
                  Review Payment Proof
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Ref: {transaction.transaction_reference}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 space-y-4 max-h-[80vh]">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Summary Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount Transferred
                </span>
                <p className="mt-1 font-mono text-base font-bold text-accent-text">
                  {formatPHP(transaction.amount)}
                </p>
                <p className="text-[11px] text-muted-foreground">{transaction.description}</p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  GCash Reference No.
                </span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold text-foreground">
                    {transaction.gcash_ref_number || 'None provided'}
                  </p>
                  {transaction.gcash_ref_number && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyRef}
                      icon={
                        copiedRef ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )
                      }
                    >
                      {copiedRef ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="rounded-2xl border border-border bg-black/40 p-3 text-center">
              <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Uploaded Receipt Screenshot</span>
                {transaction.proof_image_url && (
                  <button
                    type="button"
                    onClick={() => setFullReceiptOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-accent-text hover:underline cursor-pointer"
                  >
                    <Maximize2 className="h-3 w-3" /> Full View
                  </button>
                )}
              </div>

              {transaction.proof_image_url ? (
                <div
                  onClick={() => setFullReceiptOpen(true)}
                  className="group relative max-h-56 overflow-hidden rounded-xl bg-black cursor-pointer"
                  title="Click to view full receipt"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={transaction.proof_image_url}
                    alt="Receipt Proof"
                    className="mx-auto max-h-56 w-auto object-contain transition duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm flex items-center gap-1.5">
                      <ZoomIn className="h-3.5 w-3.5" /> Tap to zoom
                    </span>
                  </div>
                </div>
              ) : (
                <p className="py-6 text-xs text-muted-foreground">No receipt image attached.</p>
              )}
            </div>

            {/* Payer's submitted note */}
            {transaction.proof_notes && (
              <div className="rounded-2xl border border-border bg-muted/20 p-3 text-xs">
                <span className="font-semibold text-foreground">Payer&apos;s Note: </span>
                <span className="text-muted-foreground">{transaction.proof_notes}</span>
              </div>
            )}

            {/* Verification Warning */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning-soft p-3 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <p className="text-[11px] leading-relaxed">
                <strong>Safety Check:</strong> Check your official GCash mobile app transaction history to confirm that <strong>{formatPHP(transaction.amount)}</strong> has actually arrived before confirming this session.
              </p>
            </div>

            {/* Review Feedback Note */}
            <div>
              <label
                htmlFor="review-notes"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Feedback / Remarks to Payer (Optional or Required for Decline)
              </label>
              <textarea
                id="review-notes"
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Payment verified, thank you! See you at our session."
                className="g-input mt-1.5 w-full text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-4">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReview('rejected')}
                  loading={submitting}
                  className="text-danger hover:bg-danger-soft"
                  icon={<XCircle className="h-3.5 w-3.5" />}
                >
                  Decline Proof
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleReview('confirmed')}
                  loading={submitting}
                  className="bg-success text-white hover:bg-success/90"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Receipt Modal */}
      {fullReceiptOpen && transaction.proof_image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setFullReceiptOpen(false)}
        >
          <button
            type="button"
            onClick={() => setFullReceiptOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={transaction.proof_image_url}
            alt="Full Receipt"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
