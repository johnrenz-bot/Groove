'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/components/shared/cn';

import { AchievementModal } from './AchievementModal';
import { AchievementsModal } from './AchievementsModal';
import { AchievementWithProgress, UserBadgeStatus } from '@/lib/achievements/types';
import { getBadgeName, getBadgeDescription } from '@/lib/achievements/definitions';
import { refreshAchievements } from '@/app/actions/achievements';
import { Button } from '@/components/ui/Button';

/**
 * Task navigation URLs by role
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

/**
 * Achievement section for profile pages.
 * Shows only the "View Achievements" button inline; full progress shown in modal.
 */
interface AchievementSectionProps {
  tasks: AchievementWithProgress[];
  badgeStatus: UserBadgeStatus | null;
  userId: string;
  role: 'client' | 'coach';
  className?: string;
  /**
   * Recomputes achievement progress from live data and refreshes the local
   * task/badge state. Supplied by the profile page so the modal reflects a
   * just-saved profile without a reload.
   */
  onRefresh?: () => Promise<void>;
}

export function AchievementSection({
  tasks,
  badgeStatus,
  userId,
  role,
  className,
  onRefresh,
}: AchievementSectionProps) {
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check if badge was just unlocked (for auto-showing celebration modal)
  React.useEffect(() => {
    if (!badgeStatus?.is_unlocked || !badgeStatus.unlocked_at || justUnlocked) return;
    const modalShown = sessionStorage.getItem(`badge-modal-shown-${userId}`);
    if (!modalShown) {
      const timer = window.setTimeout(() => {
        setShowCelebrationModal(true);
        setJustUnlocked(true);
        sessionStorage.setItem(`badge-modal-shown-${userId}`, 'true');
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [badgeStatus, userId, justUnlocked]);

  const handleCloseCelebrationModal = () => {
    setShowCelebrationModal(false);
    setJustUnlocked(false);
  };

  const handleOpenAchievementsModal = () => {
    setShowAchievementsModal(true);
  };

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

  // Recompute once on mount so an already-complete profile is recognised
  // immediately, and again every time the modal is opened. Deferred one tick so
  // the effect body does not set state synchronously (react-hooks/set-state-in-effect).
  const refreshedOnMount = useRef(false);
  useEffect(() => {
    if (!onRefresh || refreshedOnMount.current) return;
    refreshedOnMount.current = true;
    const timer = window.setTimeout(() => {
      void handleRefresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onRefresh, handleRefresh]);

  useEffect(() => {
    if (!showAchievementsModal) return;
    const timer = window.setTimeout(() => {
      void handleRefresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showAchievementsModal, handleRefresh]);

  // Handle task navigation from modal
  const handleTaskClick = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  // Use badgeStatus if available, otherwise fall back to static definitions
  const isCoach = role === 'coach';
  const badgeType = (badgeStatus?.badge_name as 'Groove Coach' | 'Groove Active') || getBadgeName(role);
  const badgeDescription = badgeStatus?.badge_description || getBadgeDescription(role);
  const isUnlocked = badgeStatus?.is_unlocked ?? false;
  const unlockedAt = badgeStatus?.unlocked_at ?? null;

  // Still show the section even if no tasks loaded yet (will show static placeholder)
  if (tasks.length === 0) {
    return null;
  }

  // Convert tasks for the modal with navigation URLs
  const taskUrls = getTaskUrls(role);
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

  return (
    <section className={cn('space-y-6', className)} aria-labelledby="achievements-heading">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 id="achievements-heading" className="text-lg font-bold tracking-[-0.01em] text-foreground">
            {isCoach ? 'Coach' : 'Performer'} Achievements
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete tasks to earn your {badgeType} badge
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenAchievementsModal}
          disabled={refreshing}
          icon={<Sparkles className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
          className="gap-1.5"
        >
          View Achievements
        </Button>
      </header>

      {/* Unlock Celebration Modal (only shows when badge is unlocked) */}
      {isUnlocked && unlockedAt && (
        <AchievementModal
          open={showCelebrationModal}
          onClose={handleCloseCelebrationModal}
          badgeType={badgeType}
          badgeDescription={badgeDescription}
          tasks={tasks.map(t => ({ title: t.title, description: t.description }))}
          unlockedAt={unlockedAt}
          onShare={() => {
            if (navigator.share) {
              navigator.share({
                title: `I earned the ${badgeType} badge on Groove PH!`,
                text: `Just unlocked the ${badgeType} badge by completing all my coaching tasks! 🎉`,
                url: window.location.origin,
              }).catch(() => {});
            } else {
              navigator.clipboard.writeText(
                `I just earned the ${badgeType} badge on Groove PH! 🎉 ${window.location.origin}`
              );
            }
          }}
          onDownload={() => {
            alert('Badge image download coming soon!');
          }}
        />
      )}

      {/* Achievements Progress Modal (shows all tasks with real-time status) */}
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
        onShare={() => {
          if (navigator.share) {
            navigator.share({
              title: `I earned the ${badgeType} badge on Groove PH!`,
              text: `Just unlocked the ${badgeType} badge by completing all my coaching tasks! 🎉`,
              url: window.location.origin,
            }).catch(() => {});
          } else {
            navigator.clipboard.writeText(
              `I just earned the ${badgeType} badge on Groove PH! 🎉 ${window.location.origin}`
            );
          }
        }}
        onDownload={() => {
          alert('Badge image download coming soon!');
        }}
      />
    </section>
  );
}

export default AchievementSection;