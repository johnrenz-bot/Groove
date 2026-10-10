'use client';

import React, { useEffect, useState } from 'react';
import { Award, Sparkles, X, CheckCircle2, Circle, Share2, Download, Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AchievementTask {
  title: string;
  description: string;
  completed: boolean;
  progress: number; // 0-100
  completedAt?: string;
  icon: string;
  actionUrl?: string; // URL to navigate when task is clicked
  /** Per-requirement checklist derived from live profile data. */
  requirements?: { label: string; met: boolean }[];
}

interface AchievementsModalProps {
  open: boolean;
  onClose: () => void;
  badgeType: 'Groove Coach' | 'Groove Active';
  badgeDescription: string | null;
  tasks: AchievementTask[];
  isUnlocked: boolean;
  unlockedAt: string | null;
  onRefresh?: () => Promise<void>;
  onShare?: () => void;
  onDownload?: () => void;
  onTaskClick?: (url: string) => void;
}

/**
 * Performer/Coach Achievements modal - shows all tasks with real-time status.
 * Opens from achievement button on profile page.
 */
export function AchievementsModal({
  open,
  onClose,
  badgeType,
  badgeDescription,
  tasks,
  isUnlocked,
  unlockedAt,
  onRefresh,
  onShare,
  onDownload,
  onTaskClick,
}: AchievementsModalProps) {
  const [animate, setAnimate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isCoach = badgeType === 'Groove Coach';

  const badgeGradient = isCoach
    ? 'from-amber-500 via-yellow-400 to-amber-600'
    : 'from-emerald-500 via-teal-400 to-emerald-600';

  const badgeGlow = isCoach
    ? 'rgba(232, 169, 59, 0.5)'
    : 'rgba(47, 185, 138, 0.5)';

  // Trigger animation on open
  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => {
        setAnimate(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setAnimate(false);
      requestAnimationFrame(() => {
        setAnimate(true);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      showClose={false}
      className="overflow-visible"
    >
      <div className="relative z-10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between p-4 border-b border-divider bg-card/50 backdrop-blur-sm sticky top-0 z-10',
          animate ? 'animate-in fade-in slide-down duration-300' : 'opacity-0'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              isUnlocked
                ? `bg-gradient-to-br ${badgeGradient} shadow-lg`
                : 'bg-muted border border-border'
            )}>
              <Award className={cn(
                isUnlocked ? 'text-white' : 'text-muted-foreground',
                'h-6 w-6'
              )} aria-hidden="true" />
              {isUnlocked && (
                <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 text-success drop-shadow" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{badgeType}</h2>
              <p className="text-xs text-muted-foreground">
                {isUnlocked ? 'Badge Earned!' : `${completedCount}/${totalCount} Tasks Complete`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              icon={<Sparkles className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
              className="gap-1.5"
            >
              Refresh
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Badge Display */}
          <div className={cn('text-center', animate ? 'animate-in fade-in zoom-in-95 duration-500' : 'opacity-0 scale-95')}>
            <div className={cn(
              'relative mx-auto mb-4 flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl',
              isUnlocked
                ? `bg-gradient-to-br ${badgeGradient} shadow-2xl`
                : 'bg-muted border-2 border-dashed border-border'
            )}
            style={isUnlocked ? { boxShadow: `0 0 40px ${badgeGlow}, 0 12px 30px -8px ${badgeGlow}` } : undefined}>
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm">
                  <Lock className="h-10 w-10 text-white/80" aria-hidden="true" />
                </div>
              )}
              <Award className={cn(
                isUnlocked ? 'text-white drop-shadow-xl' : 'text-muted-foreground/50',
                'relative z-10 h-14 w-14'
              )} aria-hidden="true" />
              {isUnlocked && (
                <CheckCircle2 className="absolute -bottom-2 -right-2 h-7 w-7 text-success drop-shadow-lg" aria-hidden="true" />
              )}
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{badgeType}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              {badgeDescription || `Complete all ${totalCount} tasks to earn the ${badgeType} badge.`}
            </p>
            {isUnlocked && unlockedAt && (
              <p className="mt-2 text-xs text-success font-medium">
                Unlocked {new Date(unlockedAt).toLocaleDateString('en-PH', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
            {!isUnlocked && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500 ease-out"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-accent-text shrink-0">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}
          </div>

          {/* Task List */}
          <div className={cn('space-y-3', animate ? 'animate-in fade-in slide-up duration-400 delay-200' : 'opacity-0 translate-y-4')}>
            {tasks.map((task, index) => (
              <article
                key={index}
                className={cn(
                  'relative group flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer',
                  task.completed
                    ? 'border-success/30 bg-success-soft'
                    : 'border-border bg-card hover:border-accent-border hover:bg-accent-soft/30'
                )}
                onClick={() => task.actionUrl && onTaskClick?.(task.actionUrl)}
                role="button"
                tabIndex={task.actionUrl ? 0 : undefined}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && task.actionUrl) {
                    e.preventDefault();
                    onTaskClick?.(task.actionUrl);
                  }
                }}
              >
                {/* Step number / status */}
                <div className="relative flex shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      task.completed
                        ? 'border-success bg-success text-success-foreground'
                        : task.progress > 0
                        ? 'border-warning bg-warning/10 text-warning'
                        : 'border-border bg-card text-muted-foreground'
                    )}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : task.progress > 0 ? (
                      <AlertCircle className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                  {index < tasks.length - 1 && (
                    <div
                      className={cn(
                        'mt-2 h-full w-0.5',
                        task.completed ? 'bg-success' : 'bg-divider'
                      )}
                    />
                  )}
                </div>

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={cn('font-semibold text-foreground', task.completed && 'line-through text-muted-foreground')}>
                        {task.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>

                      {/* Requirement checklist — completed/missing breakdown */}
                      {task.requirements && task.requirements.length > 0 && (
                        <ul className="mt-2 space-y-1" aria-label="Task requirements">
                          {task.requirements.map((req) => (
                            <li key={req.label} className="flex items-center gap-1.5 text-xs">
                              {req.met ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                              )}
                              <span className={cn(req.met ? 'text-muted-foreground' : 'text-foreground')}>
                                {req.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Status indicator */}
                    <div className="flex shrink-0 items-center gap-2">
                      {task.completed && (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0" aria-hidden="true" />
                          <Badge variant="approved" className="hidden sm:inline-flex shrink-0">
                            Completed
                          </Badge>
                        </>
                      )}
                      {!task.completed && task.progress > 0 && (
                        <>
                          <AlertCircle className="h-5 w-5 text-warning shrink-0" aria-hidden="true" />
                          <Badge variant="pending" className="hidden sm:inline-flex shrink-0">
                            In Progress
                          </Badge>
                        </>
                      )}
                      {!task.completed && task.progress === 0 && (
                        <>
                          <Circle className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                          <Badge variant="neutral" className="hidden sm:inline-flex shrink-0">
                            Not Started
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for partial progress */}
                  {task.progress > 0 && task.progress < 100 && (
                    <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Completion timestamp */}
                  {task.completed && task.completedAt && (
                    <p className="mt-2 text-[11px] text-subtle-foreground">
                      Completed {new Date(task.completedAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Unlock status footer */}
          {isUnlocked && unlockedAt && (
            <div className={cn('mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent-soft p-4 border border-accent-border', animate && 'animate-in fade-in slide-up duration-400 delay-400')}>
              <span className="text-lg shrink-0" role="img" aria-label="Celebration">🎉</span>
              <div className="min-w-0">
                <p className="font-semibold text-accent-text">Badge Unlocked!</p>
                <p className="text-sm text-muted-foreground">
                  You earned the <strong>{badgeType}</strong> badge on{' '}
                  {new Date(unlockedAt).toLocaleDateString('en-PH', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {!isUnlocked && (
            <div className={cn('mt-4 text-center', animate && 'animate-in fade-in duration-400 delay-400')}>
              <p className="text-sm text-muted-foreground">
                Complete all {totalCount} tasks to unlock the <strong className="text-foreground">{badgeType}</strong> badge
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={cn(
          'flex flex-col sm:flex-row items-center justify-center gap-3 p-4 border-t border-divider bg-card/50 backdrop-blur-sm sticky bottom-0 z-10',
          animate && 'animate-in fade-in slide-up duration-300 delay-600'
        )}>
          <Button
            variant="secondary"
            size="lg"
            icon={<Share2 className="h-4 w-4" />}
            onClick={onShare}
            className="w-full sm:w-auto"
          >
            Share
          </Button>
          <Button
            variant="outline"
            size="lg"
            icon={<Download className="h-4 w-4" />}
            onClick={onDownload}
            className="w-full sm:w-auto"
          >
            Save Badge
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
            <X className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Custom styles for this modal only */}
      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Modal>
  );
}

export default AchievementsModal;