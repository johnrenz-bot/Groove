'use client';

import React, { useCallback, useState } from 'react';
import { Award, RefreshCw } from 'lucide-react';
import { useAchievements, useBadgeStatus } from '@/lib/achievements/hooks';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BadgeCollection } from '@/components/badges/BadgeCollection';
import { refreshAchievements } from '@/app/actions/achievements';

export interface BadgeMiniWidgetProps {
  userId: string;
  role: 'client' | 'coach';
}

export function BadgeMiniWidget({ userId, role }: BadgeMiniWidgetProps) {
  const { achievements, loading: achievementsLoading, refetch: refetchAchievements } = useAchievements(userId, role);
  const { badgeStatus, loading: badgeLoading, refetch: refetchBadgeStatus } = useBadgeStatus(userId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAchievements(userId);
    } finally {
      await Promise.all([refetchAchievements(), refetchBadgeStatus()]);
      setRefreshing(false);
    }
  }, [userId, refetchAchievements, refetchBadgeStatus]);

  if (achievementsLoading || badgeLoading) {
    return <div className="g-skeleton h-28 rounded-[20px]" aria-hidden />;
  }

  return (
    <Card padding="md">
      <CardHeader
        icon={<Award className="h-4 w-4" />}
        title="Badge Progress"
        subtitle="Complete tasks to earn your badge"
        action={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleRefresh()}
            disabled={refreshing || achievementsLoading || badgeLoading}
            aria-label="Refresh badges"
          >
            <RefreshCw
              className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`}
            />
          </Button>
        }
      />
      <BadgeCollection
        tasks={achievements}
        badgeStatus={badgeStatus}
        userId={userId}
        role={role}
        loading={achievementsLoading || badgeLoading}
        hideHeader
      />
    </Card>
  );
}

export default BadgeMiniWidget;
