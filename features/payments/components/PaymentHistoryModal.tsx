'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  Filter,
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-history-title"
    >
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-divider bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <History className="h-5 w-5" />
            </span>
            <div>
              <h2 id="payment-history-title" className="text-base font-bold text-foreground">
                GCash Transaction History
              </h2>
              <p className="text-xs text-muted-foreground">
                Real-time tracking of coaching session payments, requests, and verified proofs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTransactions}
              disabled={loading}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
              title="Refresh Transactions"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 border-b border-divider bg-muted/20 p-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" /> Total Received
            </span>
            <p className="mt-1 font-mono text-sm font-bold text-foreground">
              {formatPHP(stats.totalReceived)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-blue-500" /> Total Paid
            </span>
            <p className="mt-1 font-mono text-sm font-bold text-foreground">
              {formatPHP(stats.totalPaid)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> Confirmed
            </span>
            <p className="mt-1 font-mono text-sm font-bold text-success">
              {stats.confirmedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 shadow-xs">
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
        <div className="flex items-center justify-between border-t border-divider bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {transactions.length} transactions</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
