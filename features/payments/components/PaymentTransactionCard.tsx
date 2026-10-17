'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  FileCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SmartQrViewerModal } from './SmartQrViewerModal';
import { PaymentProofModal } from './PaymentProofModal';
import { PaymentReviewModal } from './PaymentReviewModal';
import { formatPHP } from '../services/gcashService';
import type { PaymentTransaction } from '../types';

interface PaymentTransactionCardProps {
  transaction: PaymentTransaction;
  currentUserId: string;
  onTransactionUpdated?: (updated: PaymentTransaction) => void;
}

export function PaymentTransactionCard({
  transaction,
  currentUserId,
  onTransactionUpdated,
}: PaymentTransactionCardProps) {
  const [qrViewerOpen, setQrViewerOpen] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const isPayer = currentUserId === transaction.sender_id;
  const isPayee = currentUserId === transaction.recipient_id;

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(transaction.transaction_reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // fallback
    }
  };

  const getStatusBadge = () => {
    switch (transaction.payment_status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmed
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <Clock className="h-3.5 w-3.5" />
            Proof Submitted
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">
            <XCircle className="h-3.5 w-3.5" />
            Proof Declined
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-bold text-warning">
            <Clock className="h-3.5 w-3.5" />
            Awaiting Proof
          </span>
        );
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-border-strong">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <CreditCard className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  {transaction.transaction_reference}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copy reference"
                >
                  {copiedRef ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date(transaction.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-accent-text">
              {formatPHP(transaction.amount)}
            </span>
            {getStatusBadge()}
          </div>
        </div>

        {/* Content Details */}
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-semibold text-foreground">Purpose: </span>
            <span>{transaction.description}</span>
          </div>

          <div>
            <span className="font-semibold text-foreground">Payee: </span>
            <span>
              {transaction.payee_account_name} ({transaction.payee_account_number})
            </span>
          </div>

          {transaction.gcash_ref_number && (
            <div>
              <span className="font-semibold text-foreground">GCash Ref: </span>
              <span className="font-mono font-bold text-foreground">
                {transaction.gcash_ref_number}
              </span>
            </div>
          )}

          {transaction.review_notes && (
            <div className="sm:col-span-2 rounded-xl bg-muted/40 p-2 text-[11px]">
              <span className="font-semibold text-foreground">Review Feedback: </span>
              <span>{transaction.review_notes}</span>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-3">
          {transaction.payee_qr_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQrViewerOpen(true)}
              icon={<QrCode className="h-3.5 w-3.5 text-blue-500" />}
            >
              Smart QR
            </Button>
          )}

          {/* If user is the payer */}
          {isPayer && (
            <Button
              type="button"
              variant={transaction.payment_status === 'pending' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setProofModalOpen(true)}
              icon={<FileCheck className="h-3.5 w-3.5" />}
            >
              {transaction.payment_status === 'pending'
                ? 'Upload Payment Proof'
                : transaction.payment_status === 'confirmed'
                ? 'View Submitted Receipt'
                : 'Update Proof'}
            </Button>
          )}

          {/* If user is the payee (receiver) */}
          {isPayee && transaction.payment_status === 'submitted' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setReviewModalOpen(true)}
              icon={<Eye className="h-3.5 w-3.5" />}
            >
              Review Proof
            </Button>
          )}

          {isPayee && transaction.payment_status === 'confirmed' && transaction.proof_image_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewModalOpen(true)}
              icon={<Eye className="h-3.5 w-3.5" />}
            >
              View Verified Receipt
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      <SmartQrViewerModal
        open={qrViewerOpen}
        onClose={() => setQrViewerOpen(false)}
        qrUrl={transaction.payee_qr_url}
        accountName={transaction.payee_account_name}
        accountNumber={transaction.payee_account_number}
      />

      <PaymentProofModal
        open={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        transaction={transaction}
        senderId={currentUserId}
        onSuccess={onTransactionUpdated}
      />

      <PaymentReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        transaction={transaction}
        reviewerId={currentUserId}
        onSuccess={onTransactionUpdated}
      />
    </>
  );
}
