'use client';

import React from 'react';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { FeatureProgress } from '@/components/notifications/FeatureProgress';

interface BadgeCardBadge {
  badgeType: string;
  badgeDescription: string | null;
  isUnlocked: boolean;
  unlockedAt: string | null;
  badgeImageUrl: string;
  tasksCompleted: number;
  tasksTotal: number;
}

interface BadgeCardProps {
  badge: BadgeCardBadge;
  onClick: () => void;
  comingSoon?: boolean;
}

/**
 * Compact horizontal badge tile (~112px min-height).
 * Uses only semantic CSS tokens — no hardcoded colours.
 */
export function BadgeCard({ badge, onClick, comingSoon = false }: BadgeCardProps) {
  const {
    badgeType,
    badgeDescription,
    isUnlocked,
    unlockedAt,
    badgeImageUrl,
    tasksCompleted,
    tasksTotal,
  } = badge;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (comingSoon) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const earnedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  if (comingSoon) {
    return (
      <div
        className="g-card flex min-h-[112px] items-center gap-3 p-3 opacity-60 cursor-default"
        aria-label="Coming Soon badge"
      >
        {/* Left — lock icon */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        {/* Right */}
        <div className="flex flex-1 min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
          <p className="text-xs text-muted-foreground">New badge in development</p>
        </div>
      </div>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={
        isUnlocked
          ? `${badgeType} badge — Earned`
          : `${badgeType} badge — ${tasksCompleted} of ${tasksTotal} tasks completed`
      }
      className={cn(
        'g-card flex min-h-[112px] cursor-pointer items-center gap-3 p-3 transition-all',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-accent-border',
        isUnlocked && 'shadow-[0_0_14px_hsl(var(--success)/0.22)]'
      )}
    >
      {/* Left — badge image */}
      <div
        className={cn(
          'relative h-14 w-14 shrink-0 overflow-hidden rounded-xl',
          !isUnlocked && 'opacity-40 grayscale'
        )}
      >
        <Image
          src={badgeImageUrl}
          alt={isUnlocked ? `${badgeType} badge` : `${badgeType} badge (locked)`}
          fill
          className="object-contain"
          sizes="64px"
        />
      </div>

      {/* Right */}
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        {/* Name */}
        <p className="truncate text-sm font-medium text-foreground">{badgeType}</p>

        {/* Status row */}
        {isUnlocked ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-success/20 bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
              Earned
            </span>
            {earnedDate && (
              <span className="text-xs text-muted-foreground">{earnedDate}</span>
            )}
          </div>
        ) : (
          /* This badge's own task progress — never a shared app counter. */
          <FeatureProgress
            completed={tasksCompleted}
            total={tasksTotal}
            label="Badge tasks"
            size="sm"
            showLabel={false}
            className="space-y-0.5"
          />
        )}

        {/* Description — 1 line */}
        {badgeDescription && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{badgeDescription}</p>
        )}
      </div>
    </article>
  );
}

export default BadgeCard;
