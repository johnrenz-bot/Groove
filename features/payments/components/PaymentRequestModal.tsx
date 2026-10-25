'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  AlertCircle,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_BODY_CLASS,
  MODAL_CARD_CLASS,
  MODAL_FOOTER_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_ICON_TILE_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import {
  createPaymentRequest,
  fetchGCashProfile,
  isValidGCashNumber,
} from '../services/gcashService';
import type { PaymentTransaction, GCashProfile } from '../types';

interface PaymentRequestModalProps {
  open: boolean;
  onClose: () => void;
  senderId: string; // The payer (e.g. client)
  senderName: string;
  recipientId: string; // The requester / payee (e.g. coach or current user)
  recipientName: string;
  defaultAmount?: number;
  defaultDescription?: string;
  appointmentId?: number | null;
  agreementId?: number | null;
  onSuccess?: (transaction: PaymentTransaction) => void;
}

export function PaymentRequestModal({
  open,
  onClose,
  senderId,
  senderName,
  recipientId,
  recipientName,
  defaultAmount = 500,
  defaultDescription = 'Coaching Session Fee',
  appointmentId,
  agreementId,
  onSuccess,
}: PaymentRequestModalProps) {
  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [description, setDescription] = useState(defaultDescription);
  const [instructions, setInstructions] = useState('');
  const [payeeProfile, setPayeeProfile] = useState<GCashProfile | null>(null);

  // Fallback inputs if payee hasn't set up GCash yet
  const [payeeName, setPayeeName] = useState(recipientName);
  const [payeeNumber, setPayeeNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!recipientId || !open) return;
      try {
        setLoading(true);
        const p = await fetchGCashProfile(recipientId);
        if (!cancelled && p) {
          setPayeeProfile(p);
          setPayeeName(p.account_name);
          setPayeeNumber(p.account_number);
          if (p.notes) {
            setInstructions(p.notes);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (open) {
      setAmount(String(defaultAmount));
      setDescription(defaultDescription);
      setErrorMsg(null);
      loadProfile();
    }
    return () => {
      cancelled = true;
    };
  }, [open, recipientId, recipientName, defaultAmount, defaultDescription]);

  const { backdropProps } = useModalDismiss({
    open,
    onClose,
    disabled: submitting,
    dismissOnBackdrop: false,
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₱0.');
      return;
    }

    const cleanNumber = payeeNumber.trim().replace(/[\s-]/g, '');
    if (!isValidGCashNumber(cleanNumber)) {
      setErrorMsg('Please provide a valid 11-digit Philippine GCash mobile number (09XXXXXXXXX).');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please provide a short description for this payment request.');
      return;
    }

    setSubmitting(true);
    try {
      const tx = await createPaymentRequest({
        sender_id: senderId,
        recipient_id: recipientId,
        amount: parsedAmount,
        description: description.trim(),
        appointment_id: appointmentId,
        agreement_id: agreementId,
        payee_account_name: payeeName.trim(),
        payee_account_number: cleanNumber,
        payee_qr_url: payeeProfile?.qr_code_url || null,
        instructions: instructions.trim() || undefined,
      });

      onSuccess?.(tx);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-request-title"
      {...backdropProps}
    >
      <div className={cn(MODAL_PANEL_CLASS, 'max-w-lg animate-in fade-in zoom-in-95 duration-300 sm:select-text')}>
        {/* Header */}
        <div className={cn(MODAL_HEADER_CLASS, 'items-center')}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(MODAL_ICON_TILE_CLASS, 'h-10 w-10 rounded-2xl')}>
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id="payment-request-title" className="text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
                Request GCash Payment
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Send payment details and instructions to <strong className="text-foreground">{senderName}</strong>
              </p>
            </div>
          </div>
          <ModalCloseButton onClose={onClose} label="Close payment request" />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn(MODAL_BODY_CLASS, 'space-y-4')}>
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount & Description */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="payment-amount"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Amount (PHP ₱) <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-accent-text">
                  ₱
                </span>
                <input
                  id="payment-amount"
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500.00"
                  className="g-input w-full pl-8 font-mono text-base font-bold text-foreground"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="payment-desc"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Payment For <span className="text-danger">*</span>
              </label>
              <input
                id="payment-desc"
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 1-on-1 Hip-Hop Coaching"
                className="g-input mt-1.5 w-full text-sm"
              />
            </div>
          </div>

          {/* Payee Info Box */}
          <div className={cn(MODAL_CARD_CLASS, 'space-y-3')}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-accent-text" />
                Payee GCash Receiving Details
              </span>
              {payeeProfile?.qr_code_url && (
                <span className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-text">
                  Smart QR Ready
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  GCash Account Name
                </label>
                <input
                  type="text"
                  required
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="Receiver GCash Name"
                  className="g-input mt-1 w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  GCash Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={payeeNumber}
                  onChange={(e) => setPayeeNumber(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  className="g-input mt-1 w-full font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label
              htmlFor="payment-instructions"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Additional Payment Instructions (Optional)
            </label>
            <textarea
              id="payment-instructions"
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Send full amount before Friday. Please include session date in the note."
              className="g-input mt-1.5 w-full text-xs"
            />
          </div>

          {/* Disclaimer warning */}
          <p className="text-[11px] leading-relaxed text-muted-foreground bg-muted/30 rounded-xl p-3 border border-border">
            <strong>Security Reminder:</strong> Once requested, the payer can scan your Smart QR or send to your mobile number. When they submit proof, you will be notified to verify funds in your GCash app before marking as confirmed.
          </p>

          </div>

          {/* Footer buttons */}
          <div className={MODAL_FOOTER_CLASS}>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              icon={<Send className="h-3.5 w-3.5" />}
            >
              Send Payment Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
