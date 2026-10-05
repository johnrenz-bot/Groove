'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import type { VerificationGate } from '@/lib/verification';

/**
 * The one thing shown when an unverified user reaches a booking action.
 *
 * Both booking entry points — the coach directory card and the public profile —
 * render this instead of opening the booking modal, so the rule and its wording
 * cannot differ between them.
 *
 * It replaces the button rather than disabling it. A dead button with no
 * explanation is the failure mode this exists to prevent: the user must be told
 * that verification is the blocker and where to go, or "Book" simply looks broken.
 */

export function VerificationRequiredNotice({
  gate,
  className = '',
  compact = false,
}: {
  gate: VerificationGate;
  className?: string;
  compact?: boolean;
}) {
  if (gate.allowed) return null;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-warning/30 bg-warning-soft',
        compact ? 'px-4 py-3' : 'px-5 py-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-warning/30 bg-card text-warning"
        >
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-warning">
            Verification required
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">{gate.reason}</p>
          {gate.ctaHref && (
            <Link href={gate.ctaHref} className="mt-3 inline-block">
              <Button size="sm" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                Complete verification
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A blocked Book control for cards and headers, where there is no room for the
 * full notice. Clicking it reveals the notice rather than doing nothing.
 */
export function VerificationRequiredButton({
  gate,
  onBlocked,
  className = '',
}: {
  gate: VerificationGate;
  onBlocked: () => void;
  className?: string;
}) {
  if (gate.allowed) return null;
  return (
    <button
      type="button"
      onClick={onBlocked}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft px-4 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      Verify to book
    </button>
  );
}

export default VerificationRequiredNotice;