'use client';

import React from 'react';
import { BadgeCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import type { VerificationStatus } from '@/lib/verification';

/**
 * The one verified badge, used everywhere a profile or card renders.
 *
 * Before this existed, four places drew their own "Verified" pill with three
 * different looks, and the coach directory card showed a hardcoded check on
 * every coach whether or not the account had ever been verified. One component
 * fixes both the drift and the false claim: it renders nothing at all unless
 * the account is genuinely verified.
 *
 * Motion: a single slow opacity/ring breathe on the icon, ~2.4s, and it is
 * disabled under `prefers-reduced-motion` in globals.css (`.g-verified-icon`).
 * The badge itself never moves — this is a trust signal, not an animation.
 */

export type VerifiedBadgeSize = 'sm' | 'md' | 'lg';

const SIZE_STYLES: Record<VerifiedBadgeSize, { wrap: string; icon: string }> = {
  sm: { wrap: 'px-2 py-0.5 text-[10px]', icon: 'h-3 w-3' },
  md: { wrap: 'px-2.5 py-0.5 text-[11px]', icon: 'h-3.5 w-3.5' },
  lg: { wrap: 'px-3 py-1 text-xs', icon: 'h-4 w-4' },
};

/** The affirmative badge. Renders nothing when `verified` is false. */
export function VerifiedBadge({
  verified,
  size = 'md',
  label = 'Verified',
  className = '',
}: {
  verified: boolean | null | undefined;
  size?: VerifiedBadgeSize;
  label?: string;
  className?: string;
}) {
  if (!verified) return null;
  const s = SIZE_STYLES[size];

  return (
    <span
      className={cn(
        'inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-success/30 bg-success-soft font-semibold uppercase tracking-[0.08em] text-success',
        s.wrap,
        className
      )}
    >
      <BadgeCheck className={cn('g-verified-icon shrink-0', s.icon)} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * The same badge as a bare icon, for avatar corners and tight rows where a pill
 * would crowd the layout. Still hidden when unverified.
 */
export function VerifiedIcon({
  verified,
  className = '',
}: {
  verified: boolean | null | undefined;
  className?: string;
}) {
  if (!verified) return null;
  return (
    <BadgeCheck
      className={cn('g-verified-icon shrink-0 text-success', className)}
      aria-label="Verified"
      role="img"
    />
  );
}

const STATUS_STYLES: Record<
  VerificationStatus,
  { wrap: string; icon: React.ElementType; label: string }
> = {
  verified: {
    wrap: 'border-success/30 bg-success-soft text-success',
    icon: CheckCircle2,
    label: 'Verified',
  },
  pending: {
    wrap: 'border-warning/30 bg-warning-soft text-warning',
    icon: Clock,
    label: 'Pending review',
  },
  rejected: {
    wrap: 'border-danger/30 bg-danger-soft text-danger',
    icon: XCircle,
    label: 'Rejected',
  },
};

/**
 * Three-state status pill for review surfaces (admin queue, profile status).
 *
 * Distinct from `VerifiedBadge` on purpose: this one always renders, because an
 * admin looking at a queue needs to see "rejected" as loudly as "verified", and a
 * user needs to know they are not approved.
 */
export function VerificationStatusBadge({
  status,
  size = 'md',
  className = '',
}: {
  status: VerificationStatus;
  size?: VerifiedBadgeSize;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;
  const s = SIZE_STYLES[size];

  return (
    <span
      className={cn(
        'inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold',
        style.wrap,
        s.wrap,
        className
      )}
    >
      <Icon
        className={cn('shrink-0', s.icon, status === 'verified' && 'g-verified-icon')}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
}

export default VerifiedBadge;