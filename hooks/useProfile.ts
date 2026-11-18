'use client';

import { useCallback, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { getProfileById } from '@/features/profile/services/profileService';

export interface UseProfileResult {
  /** The profiles row, or null when guest or half-created. */
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  /** The authenticated user's id, or null once resolved as guest. */
  userId: string | null;
  loading: boolean;
  /** Human-readable failure, or null. A missing row is NOT a failure. */
  error: string | null;
  /** Re-read the profile (e.g. after an edit). */
  refresh: () => Promise<void>;
}

/**
 * The signed-in user's profile, with loading and error state.
 *
 * Replaces the inline `auth.getUser()` + `from('profiles')` block that every
 * account page used to copy. Guests resolve to `profile: null` with
 * `userId: null`; callers decide where guests go.
 */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setUserId(null);
        setProfile(null);
        return;
      }

      setUserId(user.id);
      setProfile(await getProfileById(supabase, user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your account.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred a tick: `refresh` sets state synchronously, and the linter
    // (correctly) rejects synchronous setState in an effect body. Same
    // pattern as SessionProvider.
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { profile, setProfile, userId, loading, error, refresh };
}

export default useProfile;
