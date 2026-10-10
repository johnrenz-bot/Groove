'use client';

import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Badge } from '@/components/ui/Badge';
import { AchievementWithProgress } from '@/lib/achievements/types';

interface AchievementTaskListProps {
  tasks: AchievementWithProgress[];
  badgeName: string;
  badgeDescription: string | null;
  isUnlocked: boolean;
  unlockedAt: string | null;
  onTaskClick?: (task: AchievementWithProgress) => void;
  className?: string;
}

/**
 * Displays the 3 role-specific tasks with progress.
 * Shows locked/unlocked state and completion status.
 * Uses existing Groove PH design tokens and components.
 * Fixed: proper flex layout with min-w-0 for text wrapping, shrink-0 for status indicators.
 */
export function AchievementTaskList({
  tasks,
  badgeName,
  badgeDescription,
  isUnlocked,
  unlockedAt,
  onTaskClick,
  className,
}: AchievementTaskListProps) {
  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;

  return (
    <section className={cn('g-card p-6', className)}>
      {/* Header with badge preview */}
      <header className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="g-eyebrow shrink-0">Achievement</span>
            {isUnlocked && (
              <Badge variant="accent" className="shrink-0">
                Unlocked
              </Badge>
            )}
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-[-0.02em] text-foreground">
            {badgeName}
          </h2>
          {badgeDescription && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{badgeDescription}</p>
          )}
        </div>

        {/* Progress ring / summary */}
        <div className="flex flex-col items-end lg:items-center gap-1 shrink-0 lg:shrink-0">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-accent-border bg-accent-soft">
            <span className="text-lg font-bold tabular-nums text-accent-text">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-2 w-full max-w-[160px] lg:w-32 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Task list */}
      <div className="space-y-3" role="list" aria-label={`${badgeName} tasks`}>
        {tasks.map((task, index) => (
          <article
            key={task.id}
            className={cn(
              'relative group flex items-start gap-4 rounded-xl border p-4 transition-all duration-200',
              task.is_completed
                ? 'border-success/30 bg-success-soft'
                : 'border-border bg-card hover:border-accent-border hover:bg-accent-soft/30',
              onTaskClick && 'cursor-pointer'
            )}
            role="listitem"
            onClick={() => onTaskClick?.(task)}
          >
            {/* Step number / connector */}
            <div className="relative flex shrink-0 flex-col items-center">
              <div
                className={cn(
                  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  task.is_completed
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-border bg-card text-muted-foreground'
                )}
              >
                {task.is_completed ? (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              {/* Connector line to next task */}
              {index < tasks.length - 1 && (
                <div
                  className={cn(
                    'mt-2 h-full w-0.5',
                    task.is_completed ? 'bg-success' : 'bg-divider'
                  )}
                />
              )}
            </div>

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className={cn('font-semibold text-foreground', task.is_completed && 'line-through text-muted-foreground')}>
                    {task.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>
                </div>

                {/* Status indicator - shrink-0 prevents overlap */}
                <div className="flex shrink-0 items-center gap-2">
                  {task.is_completed && (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" aria-hidden="true" />
                      <Badge variant="approved" className="hidden sm:inline-flex shrink-0">
                        Completed
                      </Badge>
                    </>
                  )}
                  {!task.is_completed && (
                    <>
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                      <Badge variant="pending" className="hidden sm:inline-flex shrink-0">
                        Pending
                      </Badge>
                    </>
                  )}
                  {onTaskClick && !task.is_completed && (
                    <ArrowRight className="h-4 w-4 text-subtle-foreground group-hover:text-accent-text transition-colors shrink-0" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* Progress bar for partial progress (if needed) */}
              {task.progress > 0 && task.progress < 100 && (
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}

              {/* Completion timestamp */}
              {task.is_completed && task.completed_at && (
                <p className="mt-2 text-[11px] text-subtle-foreground">
                  Completed {new Date(task.completed_at).toLocaleDateString('en-PH', {
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
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent-soft p-4 border border-accent-border">
          <span className="text-lg shrink-0" role="img" aria-label="Celebration">🎉</span>
          <div className="min-w-0">
            <p className="font-semibold text-accent-text">Badge Unlocked!</p>
            <p className="text-sm text-muted-foreground">
              You earned the <strong>{badgeName}</strong> badge on{' '}
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
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Complete all {totalCount} tasks to unlock the <strong className="text-foreground">{badgeName}</strong> badge
          </p>
        </div>
      )}
    </section>
  );
}

export default AchievementTaskList;