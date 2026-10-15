'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShowcaseShell } from '@/features/showcase/components/ShowcaseShell';
import { communityOf } from '@/features/community/utils/community';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

/**
 * Coach Community Showcase.
 *
 * Presentation lives in `<ShowcaseShell />`, which the client showcase shares —
 * same compact header, same music bar and modal, same two-column split, same
 * talent selector, same feed. The only thing this page owns is the role: where a
 * coach's community comes from, and what the tagline says.
 */
export default function CoachTalentsPage() {
  const [coachProfile, setCoachProfile] = useState<Profile | null>(null);
  /** The signed-in coach's discipline, source of their community. */
  const [myTalent, setMyTalent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCoach = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // The community lives in coach_profiles.talents, not on profiles.
        const { data } = await supabase
          .from('profiles')
          .select('*, coach_profile:coach_profiles(talents)')
          .eq('id', user.id)
          .single();
        if (data) {
          const detail = data as Profile & {
            coach_profile?: { talents?: string | null } | null;
          };
          setCoachProfile(detail);
          setMyTalent(detail.coach_profile?.talents ?? null);
        }
      }
    } catch (err) {
      console.error('Error loading coach profile for talents page:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoach();
  }, [fetchCoach]);

  return (
    <ShowcaseShell
      role="coach"
      eyebrow="Coach Showcase & Community Hub · Bulacan"
      currentUser={coachProfile}
      memberCommunity={communityOf(coachProfile, myTalent)}
      loading={loading}
    />
  );
}