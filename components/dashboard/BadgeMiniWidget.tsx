'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { useAchievements, useBadgeStatus } from '@/lib/achievements/hooks';
import { Card, CardHeader } from '@/components/ui/Card';
import { BadgeCollection } from '@/components/badges/BadgeCollection';

export interface BadgeMiniWidgetProps {
  userId: string;
  role: 'client' | 'coach';
}

export function BadgeMiniWidget({ userId, role }: BadgeMiniWidgetProps) {
  const { achievements, loading: achievementsLoading } = useAchievements(userId, role);
  const { badgeStatus, loading: badgeLoading } = useBadgeStatus(userId);

  if (achievementsLoading || badgeLoading) {
    return <div className="g-skeleton h-28 rounded-[20px]" aria-hidden />;
  }

  return (
    <Card padding="md">
      <CardHeader
        icon={<Award className="h-4 w-4" />}
        title="Badge Progress"
        subtitle="Complete tasks to earn your badge"
      />
      <BadgeCollection
        tasks={achievements}
        badgeStatus={badgeStatus}
        userId={userId}
        role={role}
        loading={achievementsLoading || badgeLoading}
      />
    </Card>
  );
}

export default BadgeMiniWidget;
