'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Check,
  Copy,
  QrCode,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Loader2,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SmartQrViewerModal } from './SmartQrViewerModal';
import { submitPaymentProof, formatPHP } from '../services/gcashService';
import type { PaymentTransaction } from '../types';

interface PaymentProofModalProps {
  open: boolean;
  onClose: () => void;
  transaction: PaymentTransaction;
  senderId: string;
  onSuccess?: (updated: PaymentTransaction) => void;
}

export function PaymentProofModal({
  open,
  onClose,
  transaction,
  senderId,
  onSuccess,
}: PaymentProofModalProps) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    transaction.proof_image_url || null
  );
  const [refNumber, setRefNumber] = useState<string>(
    transaction.gcash_ref_number || ''
  );
  const [notes, setNotes] = useState<string>(transaction.proof_notes || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [qrViewerOpen, setQrViewerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const isConfirmed = transaction.payment_status === 'confirmed';
  const isAlreadySubmitted = transaction.payment_status === 'submitted';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid receipt image (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Receipt image must be smaller than 5 MB.');
      return;
    }

    setErrorMsg(null);
    setProofFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(
        transaction.payee_account_number.replace(/[\s-]/g, '')
      );
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isConfirmed) {
      setErrorMsg('This payment has already been verified and confirmed.');
      return;
    }

    if (!refNumber.trim()) {
      setErrorMsg('Please enter the GCash Reference Number from your receipt.');
      return;
    }

    if (!proofFile && !previewUrl) {
      setErrorMsg('Please upload a screenshot or photo of your GCash payment receipt.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await submitPaymentProof({
        transaction_id: transaction.id,
        proof_file: proofFile,
        proof_data_url: previewUrl,
        gcash_ref_number: refNumber.trim(),
        proof_notes: notes.trim(),
        sender_id: senderId,
      });

      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit payment proof.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-proof-title"
      >
        <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-divider bg-muted/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <FileCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 id="payment-proof-title" className="text-base font-bold text-foreground">
                  Upload GCash Payment Proof
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

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 max-h-[80vh]">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isConfirmed && (
              <div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success-soft p-3 text-xs text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>This transaction has been confirmed by the payee.</span>
              </div>
            )}

            {isAlreadySubmitted && !isConfirmed && (
              <div className="flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Payment proof is currently submitted and awaiting review. You can update your receipt details below if needed.
                </span>
              </div>
            )}

            {/* Transaction Payee Details Card */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-divider pb-2.5">
                <span className="text-xs text-muted-foreground">Amount Due</span>
                <span className="font-mono text-base font-bold text-accent-text">
                  {formatPHP(transaction.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Recipient Name: </span>
                  <span className="font-semibold text-foreground">
                    {transaction.payee_account_name}
                  </span>
                </div>
                {transaction.payee_qr_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQrViewerOpen(true)}
                    icon={<QrCode className="h-3.5 w-3.5 text-blue-500" />}
                  >
                    View QR
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground">GCash Number: </span>
                  <span className="font-mono font-bold text-foreground">
                    {transaction.payee_account_number}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyNumber}
                  icon={
                    copiedNumber ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )
                  }
                >
                  {copiedNumber ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Receipt Image Upload */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                GCash Transaction Receipt / Screenshot <span className="text-danger">*</span>
              </label>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                {previewUrl ? (
                  <div className="relative max-h-48 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-black/40 p-2 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="GCash Payment Receipt"
                      className="mx-auto max-h-44 w-auto rounded object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-36 w-full flex-col items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground text-center p-4">
                    <Upload className="h-8 w-8 opacity-40 mb-1" />
                    <p className="text-xs font-medium text-foreground">
                      Upload screenshot from GCash app
                    </p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG or WEBP (Max 5 MB)</p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<Upload className="h-3.5 w-3.5" />}
                  disabled={isConfirmed}
                >
                  {previewUrl ? 'Change Receipt Photo' : 'Choose Receipt Photo'}
                </Button>
              </div>
            </div>

            {/* GCash Reference Number */}
            <div>
              <label
                htmlFor="gcash-ref-number"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                GCash Reference Number <span className="text-danger">*</span>
              </label>
              <input
                id="gcash-ref-number"
                type="text"
                required
                disabled={isConfirmed}
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="e.g. 1002 9481 0293 4"
                className="g-input mt-1.5 w-full font-mono text-sm tracking-wider"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Found on your GCash SMS or receipt confirmation screen (usually 13 digits).
              </p>
            </div>

            {/* Optional Notes */}
            <div>
              <label
                htmlFor="proof-notes"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Notes or Remarks for the Payee (Optional)
              </label>
              <textarea
                id="proof-notes"
                rows={2}
                disabled={isConfirmed}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid in full via Express Send. Looking forward to our session!"
                className="g-input mt-1.5 w-full text-xs"
              />
            </div>

            {/* Important Disclaimer Notice */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
              <div className="space-y-1">
                <p className="font-bold text-foreground">Important GroovePH Notice:</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  GroovePH facilitates peer-to-peer payment coordination. Uploading a screenshot is a submission of payment proof and does <strong>NOT</strong> automatically deduct or verify bank/GCash funds. The payee must verify funds in their personal GCash wallet before marking this transaction as Confirmed.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-divider pt-4">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              {!isConfirmed && (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  icon={<FileCheck className="h-3.5 w-3.5" />}
                >
                  {isAlreadySubmitted ? 'Update Payment Proof' : 'Submit Proof'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Smart QR Viewer for Payee */}
      <SmartQrViewerModal
        open={qrViewerOpen}
        onClose={() => setQrViewerOpen(false)}
        qrUrl={transaction.payee_qr_url}
        accountName={transaction.payee_account_name}
        accountNumber={transaction.payee_account_number}
      />
    </>
  );
}
