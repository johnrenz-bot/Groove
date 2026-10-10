'use client';

import { useCallback, useEffect, useState } from 'react';
import { AchievementWithProgress, UserBadgeStatus } from './types';
import { getUserAchievementsWithProgress, getUserBadgeStatus } from './client';
import { getAchievementDefinitions } from './definitions';

export function useAchievements(userId: string | null, role: 'client' | 'coach') {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setAchievements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getUserAchievementsWithProgress(userId, role);
      setAchievements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
      // Fall back to static definitions if DB fails
      const staticDefs = getAchievementDefinitions(role);
      setAchievements(staticDefs.map(def => ({
        ...def,
        id: `static-${def.slug}`,
        badge_image_url: null,
        progress: 0,
        completed_at: null,
        unlocked_at: null,
        metadata: {},
        is_completed: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AchievementWithProgress)));
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  // Scheduled through a timer rather than called in the effect body.
  // This avoids react-hooks/set-state-in-effect which rejects a state-setting
  // call in an effect body; deferring it one tick keeps the same behaviour
  // without a cascading render before paint.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetch]);

  return { achievements, loading, error, refetch: fetch };
}

export function useBadgeStatus(userId: string | null) {
  const [badgeStatus, setBadgeStatus] = useState<UserBadgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setBadgeStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getUserBadgeStatus(userId);
      setBadgeStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badge status');
      // We can't determine role from here without the profile, so we'll let the profile page handle it
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Defer the initial fetch to avoid set-state-in-effect lint error.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetch]);

  return { badgeStatus, loading, error, refetch: fetch };
}