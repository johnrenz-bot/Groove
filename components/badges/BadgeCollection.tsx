'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { AchievementModal } from '@/components/achievements/AchievementModal';
import { AchievementWithProgress, UserBadgeStatus } from '@/lib/achievements/types';
import { getBadgeName, getBadgeDescription } from '@/lib/achievements/definitions';
import { refreshAchievements } from '@/app/actions/achievements';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { BadgeCard } from './BadgeCard';
import { BadgeModal } from './BadgeModal';

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
  /**
   * When true the inner `<header>` block (title, description, refresh button)
   * is suppressed. Use this when the parent card already renders its own
   * `CardHeader` — e.g. `BadgeMiniWidget` on the coach/client dashboard — to
   * avoid double-header visual overlap. The `handleRefresh` function is still
   * active; the parent can surface it via its own action slot.
   */
  hideHeader?: boolean;
}

/**
 * Badge Collection section for profile pages.
 * Compact horizontal tiles, icon-only Refresh, 3-col grid.
 * Shared between /client/profile and /coach/profile.
 */
export function BadgeCollection({
  tasks,
  badgeStatus,
  userId,
  role,
  loading = false,
  className,
  onRefresh,
  hideHeader = false,
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

  return (
    <section className={cn('space-y-4', className)} aria-labelledby="badge-collection-heading">
      {/* Section header — hidden when a parent card already provides one */}
      {!hideHeader && (
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2
              id="badge-collection-heading"
              className="text-lg font-semibold text-foreground"
            >
              Badge Collection
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete tasks to earn badges and showcase your achievements
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleRefresh()}
            disabled={refreshing || loading}
            aria-label="Refresh badges"
          >
            <RefreshCw className={cn('h-4 w-4', (refreshing || loading) && 'animate-spin')} />
          </Button>
        </header>
      )}

      {/* Badge grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            {/* Groove Badge tile */}
            <BadgeCard
              badge={{
                badgeType,
                badgeDescription: badgeDescription ?? null,
                isUnlocked,
                unlockedAt,
                badgeImageUrl,
                tasksCompleted,
                tasksTotal,
              }}
              onClick={() => setShowAchievementsModal(true)}
            />

            {/* Coming Soon placeholder 1 */}
            <BadgeCard
              badge={{
                badgeType: 'Coming Soon',
                badgeDescription: null,
                isUnlocked: false,
                unlockedAt: null,
                badgeImageUrl: '/image/Badge/Groove-BADGE.png',
                tasksCompleted: 0,
                tasksTotal: 0,
              }}
              comingSoon={true}
              onClick={() => {}}
            />

            {/* Coming Soon placeholder 2 */}
            <BadgeCard
              badge={{
                badgeType: 'Coming Soon',
                badgeDescription: null,
                isUnlocked: false,
                unlockedAt: null,
                badgeImageUrl: '/image/Badge/Groove-BADGE.png',
                tasksCompleted: 0,
                tasksTotal: 0,
              }}
              comingSoon={true}
              onClick={() => {}}
            />
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

      {/* Badge detail modal */}
      <BadgeModal
        badge={{
          badgeType,
          badgeDescription: badgeDescription ?? null,
          isUnlocked,
          unlockedAt,
          badgeImageUrl,
          tasksCompleted,
          tasksTotal,
        }}
        tasks={modalTasks.map(t => ({
          title: t.title,
          description: t.description,
          completed: t.completed,
          completedAt: t.completedAt,
          requirements: t.requirements,
        }))}
        isOpen={showAchievementsModal}
        onClose={() => setShowAchievementsModal(false)}
        onShare={handleShare}
        onDownload={() => downloadBadge(badgeImageUrl)}
      />
    </section>
  );
}

export default BadgeCollection;
