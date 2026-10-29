'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Award, RefreshCw } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { AchievementModal } from '@/components/achievements/AchievementModal';
import { AchievementWithProgress, UserBadgeStatus } from '@/lib/achievements/types';
import { getBadgeName, getBadgeDescription } from '@/lib/achievements/definitions';
import { refreshAchievements } from '@/app/actions/achievements';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { InfoTip } from '@/components/ui/InfoTip';
import { BadgeCard } from './BadgeCard';
import { BadgeModal } from './BadgeModal';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';

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
  const [refreshing, setRefreshing] = useState(false);

  const { notifySuccess } = useSuccessNotifications();
  const lastBadgeStatusRef = useRef<{ isUnlocked: boolean; unlockedAt: string | null } | null>(
    null
  );
  const handledStatusKeyRef = useRef<string | null>(null);

  // Derive badge display values
  const badgeType = (badgeStatus?.badge_name as 'Groove Coach' | 'Groove Active') || getBadgeName(role);
  const badgeDescription = badgeStatus?.badge_description || getBadgeDescription(role);
  const isUnlocked = badgeStatus?.is_unlocked ?? false;
  const unlockedAt = badgeStatus?.unlocked_at ?? null;
  const badgeImageUrl = badgeStatus?.badge_image_url || '/image/Badge/Groove-BADGE.png';
  const tasksCompleted = badgeStatus?.tasks_completed ?? tasks.filter(t => t.is_completed).length;
  const tasksTotal = badgeStatus?.tasks_total ?? tasks.length;

  /**
   * Announce a badge exactly once per unlock.
   *
   * A badge that was already earned when the section first loaded keeps the
   * existing celebration modal. A badge that flips from locked to unlocked
   * while the member is using the app (after saving a profile, completing a
   * booking, or leaving a review) is announced with the global top-centre
   * toast. The sessionStorage key is per user AND per unlock timestamp, so a
   * duplicate refetch — or a second component mounting — cannot repeat it.
   */
  useEffect(() => {
    if (!badgeStatus) return;

    const statusKey = `${isUnlocked}:${unlockedAt ?? ''}:${tasksCompleted}:${tasksTotal}`;
    if (handledStatusKeyRef.current === statusKey) return;
    handledStatusKeyRef.current = statusKey;

    const previous = lastBadgeStatusRef.current;
    lastBadgeStatusRef.current = { isUnlocked, unlockedAt };

    if (!isUnlocked || !unlockedAt) return;

    const modalKey = `badge-modal-shown-${userId}`;
    const unlockKey = `badge-unlock-${userId}-${unlockedAt}`;

    if (!previous) {
      if (!sessionStorage.getItem(modalKey)) {
        setShowCelebrationModal(true);
        sessionStorage.setItem(modalKey, 'true');
      }
      return;
    }

    if (!previous.isUnlocked && !sessionStorage.getItem(unlockKey)) {
      sessionStorage.setItem(unlockKey, 'true');
      notifySuccess({
        title: 'Achievement Unlocked!',
        description: `You earned the ${badgeType} badge.`,
        icon: <Award className="h-4 w-4" aria-hidden="true" />,
        tone: 'achievement',
        duration: 7000,
        dedupeKey: unlockKey,
        progress: {
          completed: tasksCompleted,
          total: tasksTotal,
          label: 'Badge tasks',
        },
      });
    }
  }, [
    badgeStatus,
    isUnlocked,
    unlockedAt,
    tasksCompleted,
    tasksTotal,
    badgeType,
    userId,
    notifySuccess,
  ]);

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
    <section
      className={cn('@container space-y-4', className)}
      aria-labelledby={hideHeader ? undefined : 'badge-collection-heading'}
    >
      {/* Section header — hidden when a parent card already provides one */}
      {!hideHeader && (
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="badge-collection-heading"
                className="text-lg font-semibold text-foreground"
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

      {/* Badge grid.

          Column count is driven by the CONTAINER, not the viewport. This section
          is also rendered inside a dashboard card that is half a grid cell wide,
          where a viewport-keyed `lg:grid-cols-3` squeezed three tiles into ~170px
          and truncated their labels. The profile pages are full-width, so they
          still get three across exactly as before. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 @2xl:grid-cols-3">
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
          onClose={() => setShowCelebrationModal(false)}
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
