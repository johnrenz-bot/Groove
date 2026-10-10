'use client';

import React from 'react';
import { Award, Lock, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Badge } from '@/components/ui/Badge';

interface AchievementBadgeProps {
  /** Badge type determines the design */
  type: 'Groove Coach' | 'Groove Active';
  /** Whether the badge is unlocked */
  unlocked: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show the badge name label */
  showLabel?: boolean;
  /** Click handler for unlock animation/modal */
  onClick?: () => void;
  /** Unlock date for display */
  unlockedAt?: string | null;
  /** Custom className */
  className?: string;
}

/**
 * Polished achievement badge component.
 * Uses the Groove PH logo/branding colors and the existing design system.
 * Custom styling ONLY within this component - does not affect global styles.
 */
export function AchievementBadge({
  type,
  unlocked,
  size = 'md',
  showLabel = true,
  onClick,
  unlockedAt,
  className,
}: AchievementBadgeProps) {
  const isCoach = type === 'Groove Coach';

  const sizeClasses = {
    sm: 'h-16 w-16 text-2xl',
    md: 'h-24 w-24 text-3xl',
    lg: 'h-32 w-32 text-4xl',
    xl: 'h-40 w-40 text-5xl',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  const badgeColor = isCoach
    ? 'from-amber-500 via-yellow-400 to-amber-600'
    : 'from-emerald-500 via-teal-400 to-emerald-600';

  const badgeGlow = isCoach
    ? 'rgba(232, 169, 59, 0.5)'
    : 'rgba(47, 185, 138, 0.5)';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={!unlocked && !onClick}
        className={cn(
          'relative flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          sizeClasses[size],
          unlocked
            ? 'cursor-pointer bg-gradient-to-br ' + badgeColor + ' shadow-lg'
            : 'cursor-not-allowed bg-muted border-2 border-dashed border-border',
          onClick && unlocked && 'hover:scale-105 active:scale-95'
        )}
        aria-label={unlocked ? `${type} badge unlocked` : `${type} badge locked`}
        style={{
          boxShadow: unlocked ? `0 0 30px ${badgeGlow}, 0 8px 24px -8px ${badgeGlow}` : undefined,
        }}
      >
        {/* Badge background with logo/icon */}
        <div className="relative flex h-full w-full items-center justify-center">
          {/* Lock overlay for locked state */}
          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
              <Lock className={cn('text-white/80', size === 'sm' && 'h-6 w-6', size === 'md' && 'h-8 w-8', size === 'lg' && 'h-10 w-10', size === 'xl' && 'h-12 w-12')} />
            </div>
          )}

          {/* Badge icon - using Groove PH logo for unlocked, placeholder for locked */}
          {unlocked ? (
            <div className="relative flex h-full w-full items-center justify-center">
              {/* Glow ring animation */}
              <div className="absolute inset-0 rounded-2xl animate-pulse" style={{
                background: `radial-gradient(circle at center, ${badgeGlow} 0%, transparent 70%)`,
              }} />
              {/* Main badge icon - Award for both, different styling */}
              <Award className={cn('text-white drop-shadow-lg', size === 'sm' && 'h-8 w-8', size === 'md' && 'h-10 w-10', size === 'lg' && 'h-14 w-14', size === 'xl' && 'h-18 w-18')} />
              {/* Sparkles for extra polish */}
              <Sparkles className={cn('absolute -top-1 -right-1 text-white/90 animate-bounce', size === 'sm' && 'h-4 w-4', size === 'md' && 'h-5 w-5', size === 'lg' && 'h-6 w-6', size === 'xl' && 'h-7 w-7')} />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
              <Award className={cn(size === 'sm' && 'h-8 w-8', size === 'md' && 'h-10 w-10', size === 'lg' && 'h-14 w-14', size === 'xl' && 'h-18 w-18')} />
            </div>
          )}

          {/* Check mark for completed */}
          {unlocked && (
            <CheckCircle2 className={cn('absolute -bottom-1 -right-1 text-success drop-shadow', size === 'sm' && 'h-5 w-5', size === 'md' && 'h-6 w-6', size === 'lg' && 'h-7 w-7', size === 'xl' && 'h-8 w-8')} />
          )}
        </div>
      </button>

      {showLabel && (
        <div className="text-center">
          <p className={cn('font-bold tracking-tight', labelSizeClasses[size], unlocked ? 'text-foreground' : 'text-muted-foreground')}>
            {type}
          </p>
          {unlocked && unlockedAt && (
            <p className={cn('mt-0.5 text-[10px] text-subtle-foreground', labelSizeClasses[size])}>
              Unlocked {new Date(unlockedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {!unlocked && (
            <Badge variant="neutral" className="mt-1.5 text-[10px]">
              Locked
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default AchievementBadge;