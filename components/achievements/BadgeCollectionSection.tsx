'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Circle, Lock, RefreshCw, Trophy } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { InfoTip } from '@/components/ui/InfoTip';
import { AchievementModal } from './AchievementModal';
import { AchievementsModal } from './AchievementsModal';
import { AchievementWithProgress, UserBadgeStatus } from '@/lib/achievements/types';
import { getBadgeName, getBadgeDescription } from '@/lib/achievements/definitions';
import { refreshAchievements } from '@/app/actions/achievements';

/**
 * Task navigation URLs by role — mirrors the map in AchievementSection.
 */
function getTaskUrls(role: 'client' | 'coach'): Record<string, string> {
  if (role === 'client') {
    return {
      'Complete Your Performer Profile': '/client/profile/edit',
      'Book Your First Session': '/client/talent',
      'Leave Your First Review': '/client/appointments',
    };
  }
  return {
    'Complete Your Coach Profile': '/coach/profile/edit',
    'Secure Your First Booking': '/coach/appointments',
    'Earn a 5-Star Review': '/coach/appointments',
  };
}

export interface BadgeCollectionSectionProps {
  tasks: AchievementWithProgress[];
  badgeStatus: UserBadgeStatus | null;
  userId: string;
  role: 'client' | 'coach';
  loading?: boolean;
  className?: string;
  onRefresh?: () => Promise<void>;
}

/**
 * Badge Collection section for profile pages.
 * Renders an inline grid: Groove Badge card + 2 Coming Soon placeholders.
 * Replaces the button-only AchievementSection on client and coach profiles.
 */
export function BadgeCollectionSection({
  tasks,
  badgeStatus,
  userId,
  role,
  loading = false,
  className,
  onRefresh,
}: BadgeCollectionSectionProps) {
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Derive badge display values
  const badgeType = (badgeStatus?.badge_name as 'Groove Coach' | 'Groove Active') || getBadgeName(role);
  const badgeDescription = badgeStatus?.badge_description || getBadgeDescription(role);
  const isUnlocked = badgeStatus?.is_unlocked ?? false;
  const unlockedAt = badgeStatus?.unlocked_at ?? null;
  const badgeImageUrl = badgeStatus?.badge_image_url || '/image/Badge/Groove-BADGE.png';
  const tasksCompleted = badgeStatus?.tasks_completed ?? tasks.filter(t => t.is_completed).length;
  const tasksTotal = badgeStatus?.tasks_total ?? tasks.length;

  // Auto-trigger celebration modal on first unlock (sessionStorage guard)
  useEffect(() => {
    if (!isUnlocked || !unlockedAt || justUnlocked) return;
    const modalShown = sessionStorage.getItem(`badge-modal-shown-${userId}`);
    if (!modalShown) {
      const timer = window.setTimeout(() => {
        setShowCelebrationModal(true);
        setJustUnlocked(true);
        sessionStorage.setItem(`badge-modal-shown-${userId}`, 'true');
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isUnlocked, unlockedAt, userId, justUnlocked]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await refreshAchievements(userId);
      }
    } finally {
      setRefreshing(false);
    }
  }, [userId, onRefresh]);

  // Refresh once on mount so an already-complete profile is recognised immediately
  const refreshedOnMount = useRef(false);
  useEffect(() => {
    if (!onRefresh || refreshedOnMount.current) return;
    refreshedOnMount.current = true;
    const timer = window.setTimeout(() => {
      void handleRefresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onRefresh, handleRefresh]);

  // Refresh when achievements modal opens
  useEffect(() => {
    if (!showAchievementsModal) return;
    const timer = window.setTimeout(() => {
      void handleRefresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showAchievementsModal, handleRefresh]);

  const handleTaskClick = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  const downloadBadge = useCallback((imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'Groove-BADGE.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: `I earned the ${badgeType} badge on Groove PH!`,
        text: `Just unlocked the ${badgeType} badge! 🎉`,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `I just earned the ${badgeType} badge on Groove PH! 🎉 ${window.location.origin}`
      );
    }
  }, [badgeType]);

  const taskUrls = getTaskUrls(role);

  // Build modal task list
  const modalTasks = tasks.map(t => ({
    title: t.title,
    description: t.description,
    completed: t.is_completed,
    progress: t.progress,
    completedAt: t.completed_at ?? undefined,
    icon: t.icon,
    actionUrl: taskUrls[t.title],
    requirements: t.requirements,
  }));

  // Status pill config
  const statusPill = isUnlocked
    ? { label: 'Earned', className: 'bg-green-100 text-green-800 border border-green-200' }
    : tasksCompleted > 0
      ? { label: 'In Progress', className: 'bg-amber-100 text-amber-800 border border-amber-200' }
      : { label: 'Locked', className: 'bg-muted text-muted-foreground border border-border' };

  return (
    <section className={cn('space-y-4', className)} aria-labelledby="badge-collection-heading">
      {/* Section header */}
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="badge-collection-heading"
              className="text-lg font-bold tracking-[-0.01em] text-foreground"
            >
              Badge Collection
            </h2>
            <InfoTip
              title="Badge Collection"
              short="Complete tasks to earn badges and showcase your achievements."
              details="Each badge tracks its own checklist. Complete every task to unlock it, then share it from your public profile. Progress saves automatically."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing || loading}
          aria-label="Refresh badge progress"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50',
            (refreshing || loading) && 'cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', (refreshing || loading) && 'animate-spin')} />
          Refresh
        </button>
      </header>

      {/* Badge grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ── Loading skeletons ── */}
        {loading ? (
          <>
            <div className="g-skeleton h-48 rounded-2xl" aria-hidden="true" />
            <div className="g-skeleton h-48 rounded-2xl" aria-hidden="true" />
            <div className="g-skeleton h-48 rounded-2xl" aria-hidden="true" />
          </>
        ) : (
          <>
            {/* ── Groove Badge card ── */}
            <div className="g-card flex flex-col gap-3 p-5">
              {/* Badge image */}
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl',
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
                {/* Status pill */}
                <span
                  className={cn(
                    'mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    statusPill.className
                  )}
                >
                  {statusPill.label}
                </span>
              </div>

              {/* Badge name + description */}
              <div>
                <h3 className="text-sm font-bold text-foreground">{badgeType}</h3>
                {badgeDescription && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {badgeDescription}
                  </p>
                )}
              </div>

              {/* Earned date (only when unlocked and date is available) */}
              {isUnlocked && unlockedAt && (
                <p className="text-xs text-green-700">
                  Earned{' '}
                  {new Date(unlockedAt).toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}

              {/* Progress bar (only when not yet earned) */}
              {!isUnlocked && tasksTotal > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Progress</span>
                    <span>
                      {tasksCompleted}/{tasksTotal} tasks
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Task checklist */}
              {tasks.length > 0 && (
                <ul className="space-y-1.5" aria-label="Badge tasks">
                  {tasks.map((task) => {
                    const url = taskUrls[task.title];
                    return (
                      <li key={task.slug} className="flex items-start gap-2">
                        {task.is_completed ? (
                          <CheckCircle2
                            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                        {!task.is_completed && url ? (
                          <Link
                            href={url}
                            className="text-xs leading-snug text-accent-text underline-offset-2 hover:underline"
                          >
                            {task.title}
                          </Link>
                        ) : (
                          <span
                            className={cn(
                              'text-xs leading-snug',
                              task.is_completed ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {task.title}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* View Details button */}
              <button
                type="button"
                onClick={() => setShowAchievementsModal(true)}
                className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/70"
              >
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                View Details
              </button>
            </div>

            {/* ── Coming Soon placeholder 1 ── */}
            <ComingSoonCard />

            {/* ── Coming Soon placeholder 2 ── */}
            <ComingSoonCard />
          </>
        )}
      </div>

      {/* Celebration modal — only when badge is earned */}
      {isUnlocked && unlockedAt && (
        <AchievementModal
          open={showCelebrationModal}
          onClose={() => {
            setShowCelebrationModal(false);
            setJustUnlocked(false);
          }}
          badgeType={badgeType}
          badgeDescription={badgeDescription}
          tasks={tasks.map(t => ({ title: t.title, description: t.description }))}
          unlockedAt={unlockedAt}
          badgeImageUrl={badgeImageUrl}
          onShare={handleShare}
          onDownload={() => downloadBadge(badgeImageUrl)}
        />
      )}

      {/* Achievements progress modal */}
      <AchievementsModal
        open={showAchievementsModal}
        onClose={() => setShowAchievementsModal(false)}
        badgeType={badgeType}
        badgeDescription={badgeDescription}
        tasks={modalTasks}
        isUnlocked={isUnlocked}
        unlockedAt={unlockedAt}
        onRefresh={handleRefresh}
        onTaskClick={handleTaskClick}
        badgeImageUrl={badgeImageUrl}
        onShare={handleShare}
        onDownload={() => downloadBadge(badgeImageUrl)}
      />
    </section>
  );
}

/** Reusable "Coming Soon" placeholder card */
function ComingSoonCard() {
  return (
    <div
      className="g-card flex cursor-default flex-col items-center justify-center gap-3 p-5 opacity-60"
      aria-label="Coming Soon badge"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
        <Lock className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-muted-foreground">Coming Soon</p>
        <p className="mt-0.5 text-xs text-muted-foreground">New badge in development</p>
      </div>
    </div>
  );
}

export default BadgeCollectionSection;
