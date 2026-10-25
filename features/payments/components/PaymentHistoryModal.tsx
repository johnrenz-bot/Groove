'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  History,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_CARD_CLASS,
  MODAL_CLOSE_BUTTON_CLASS,
  MODAL_FOOTER_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_ICON_TILE_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { PaymentTransactionCard } from './PaymentTransactionCard';
import { fetchUserTransactions, formatPHP } from '../services/gcashService';
import type { PaymentTransaction, PaymentStatus } from '../types';

interface PaymentHistoryModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const STATUS_FILTERS: { label: string; value: 'all' | PaymentStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Proof', value: 'pending' },
  { label: 'Under Review', value: 'submitted' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Declined', value: 'rejected' },
];

export function PaymentHistoryModal({
  open,
  onClose,
  userId,
}: PaymentHistoryModalProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | PaymentStatus>('all');

  const loadTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await fetchUserTransactions(userId);
      setTransactions(data);
    } catch (err) {
      console.warn('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open, loadTransactions]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalReceived = 0;
    let pendingCount = 0;
    let confirmedCount = 0;

    for (const tx of transactions) {
      if (tx.payment_status === 'confirmed') {
        confirmedCount++;
        if (tx.sender_id === userId) {
          totalPaid += Number(tx.amount);
        }
        if (tx.recipient_id === userId) {
          totalReceived += Number(tx.amount);
        }
      } else if (tx.payment_status === 'pending' || tx.payment_status === 'submitted') {
        pendingCount++;
      }
    }

    return { totalPaid, totalReceived, pendingCount, confirmedCount };
  }, [transactions, userId]);

  // Filtered list
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeFilter !== 'all' && tx.payment_status !== activeFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        tx.transaction_reference.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        tx.payee_account_name.toLowerCase().includes(q) ||
        (tx.gcash_ref_number && tx.gcash_ref_number.toLowerCase().includes(q))
      );
    });
  }, [transactions, activeFilter, search]);

  const handleTransactionUpdated = (updated: PaymentTransaction) => {
    setTransactions((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const { backdropProps } = useModalDismiss({ open, onClose });

  if (!open) return null;

  return (
    <div
      className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-history-title"
      {...backdropProps}
    >
      <div className={cn(MODAL_PANEL_CLASS, 'max-w-3xl max-h-[92vh] animate-in fade-in zoom-in-95 duration-300 sm:select-text')}>
        {/* Header */}
        <div className={cn(MODAL_HEADER_CLASS, 'items-center')}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(MODAL_ICON_TILE_CLASS, 'h-10 w-10 rounded-2xl')}>
              <History className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="payment-history-title" className="text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
                GCash Transaction History
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Real-time tracking of coaching session payments, requests, and verified proofs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadTransactions}
              disabled={loading}
              className={MODAL_CLOSE_BUTTON_CLASS}
              aria-label="Refresh transactions"
              title="Refresh Transactions"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
            </button>
            <ModalCloseButton onClose={onClose} label="Close transaction history" />
          </div>
        </div>

        {/* Summary Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 border-b border-divider bg-muted/20 p-4 sm:grid-cols-4">
          <div className={cn(MODAL_CARD_CLASS, 'p-3')}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" /> Total Received
            </span>
            <p className="mt-1 font-mono text-sm font-bold text-foreground">
              {formatPHP(stats.totalReceived)}
            </p>
          </div>

          <div className={cn(MODAL_CARD_CLASS, 'p-3')}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-accent-text" /> Total Paid
            </span>
            <p className="mt-1 font-mono text-sm font-bold text-foreground">
              {formatPHP(stats.totalPaid)}
            </p>
          </div>

          <div className={cn(MODAL_CARD_CLASS, 'p-3')}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> Confirmed
            </span>
            <p className="mt-1 font-mono text-sm font-bold text-success">
              {stats.confirmedCount}
            </p>
          </div>

          <div className={cn(MODAL_CARD_CLASS, 'p-3')}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-warning" /> In-Flight
            </span>
            <p className="mt-1 font-mono text-sm font-bold text-warning">
              {stats.pendingCount}
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 border-b border-divider p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 g-scroll">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFilter(f.value)}
                className={`cursor-pointer shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeFilter === f.value
                    ? 'bg-accent text-accent-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, payee, notes…"
              className="g-input w-full pl-8 py-1.5 text-xs"
            />
          </div>
        </div>

        {/* Transaction Cards List */}
        <div className="g-scroll flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-accent-text mb-2" />
              <p className="text-xs">Loading transaction history…</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((tx) => (
              <PaymentTransactionCard
                key={tx.id}
                transaction={tx}
                currentUserId={userId}
                onTransactionUpdated={handleTransactionUpdated}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40 mb-2" />
              <p className="text-sm font-bold text-foreground">No transactions found</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                {search || activeFilter !== 'all'
                  ? 'No payment records match your active search or filter criteria.'
                  : 'You have not initiated or received any GCash payments yet.'}
              </p>
              {(search || activeFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setActiveFilter('all');
                  }}
                  className="mt-3"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(MODAL_FOOTER_CLASS, 'flex-col py-3 sm:flex-row sm:justify-between')}>
          <span className="text-xs text-muted-foreground">Showing {filtered.length} of {transactions.length} transactions</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
