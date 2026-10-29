'use client';

import React from 'react';
import Image from 'next/image';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FeatureProgress } from '@/components/notifications/FeatureProgress';

interface BadgeModalTask {
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  requirements?: { label: string; met: boolean }[];
}

interface BadgeModalBadge {
  badgeType: string;
  badgeDescription: string | null;
  isUnlocked: boolean;
  unlockedAt: string | null;
  badgeImageUrl: string;
  tasksCompleted: number;
  tasksTotal: number;
}

interface BadgeModalProps {
  badge: BadgeModalBadge;
  tasks: BadgeModalTask[];
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
  onDownload: () => void;
}

/**
 * Badge detail modal — no overlapping elements, only the task list scrolls.
 * Uses the existing Modal component for ESC, focus-trap, backdrop-click, and
 * fade+scale animation. All colours are semantic tokens only.
 */
export function BadgeModal({
  badge,
  tasks,
  isOpen,
  onClose,
  onShare,
  onDownload,
}: BadgeModalProps) {
  const {
    badgeType,
    badgeDescription,
    isUnlocked,
    unlockedAt,
    badgeImageUrl,
    tasksCompleted,
    tasksTotal,
  } = badge;

  const earnedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const footerContent = (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={onShare}
        className="w-full sm:w-auto"
      >
        Share Achievement
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        className="w-full sm:w-auto"
      >
        Save Badge
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="w-full sm:w-auto"
      >
        Close
      </Button>
    </>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={badgeType}
      size="md"
      footer={footerContent}
    >
      {/*
        The Modal component already renders a header with the title and
        role="dialog" aria-modal="true". We use its `title` prop for the
        accessible label. Below we render only the body content; the sticky
        footer is passed via the Modal's `footer` prop so it remains visible
        without scrolling when the task list is long.
      */}

      {/* ── "Badge Earned" pill (the shared Modal header owns the close control) ── */}
      <div className="-mt-1 mb-4 flex items-center justify-between gap-3">
        <div>
          {isUnlocked && (
            <span className="inline-flex items-center rounded-full border border-success/20 bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
              Badge Earned
            </span>
          )}
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="flex flex-col items-center gap-2 pb-5 border-b border-divider">
        {/* Glow + image container */}
        <div className="relative mx-auto h-36 w-36 shrink-0">
          {/* Radial glow behind image */}
          <div
            className={cn(
              'absolute inset-0 rounded-full',
              'bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.18)_0%,transparent_70%)]'
            )}
            aria-hidden="true"
          />
          {isUnlocked && (
            <div
              className="absolute inset-0 rounded-full shadow-[0_0_32px_hsl(var(--success)/0.2)]"
              aria-hidden="true"
            />
          )}
          {/* Badge image — fill within inset-2 so glow ring is visible */}
          <div className="absolute inset-2">
            <Image
              src={badgeImageUrl}
              alt={isUnlocked ? `${badgeType} badge` : `${badgeType} badge (locked)`}
              fill
              className="object-contain"
              sizes="140px"
            />
          </div>
        </div>

        {/* Description */}
        {badgeDescription && (
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            {badgeDescription}
          </p>
        )}

        {/* Unlocked date OR progress bar */}
        {isUnlocked && earnedDate ? (
          <p className="text-center text-xs text-muted-foreground">
            Unlocked on {earnedDate}
          </p>
        ) : (
          <FeatureProgress
            completed={tasksCompleted}
            total={tasksTotal}
            label="Badge tasks"
            size="sm"
            className="mx-auto mt-2 w-56 max-w-full"
          />
        )}
      </div>

      {/* ── Completed Tasks ── */}
      {tasks.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Completed Tasks</p>
          <ul className="space-y-0" aria-label="Badge tasks">
            {tasks.map((task, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 border-b border-divider py-2 last:border-0"
              >
                {/* Status icon */}
                {task.completed ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}

                {/* Title + subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {task.description}
                  </p>
                  {/* Requirements chips */}
                  {task.requirements && task.requirements.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {task.requirements.map((req) => (
                        <span
                          key={req.label}
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            req.met
                              ? 'bg-success-soft text-success'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {req.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Completion date */}
                {task.completedAt && (
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {new Date(task.completedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

export default BadgeModal;
