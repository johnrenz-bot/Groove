'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CommunityFeed from '@/features/community/components/CommunityFeed';
import { communityOf } from '@/features/community/utils/community';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';

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
    fetchCoach();
  }, [fetchCoach]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Coach Showcase & Community Hub · Bulacan"
        title={
          <>
            Performing Arts Showcase &amp; <span className="text-accent-text">Community</span>
          </>
        }
        description="Share choreography routines, rehearsal highlights, masterclass announcements, and engage with verified students and mentors in San Jose del Monte."
      />

      {loading ? (
        <div className="space-y-5">
          <div className="g-skeleton h-28 w-full rounded-[22px]" />
          <div className="g-skeleton h-36 w-full rounded-[22px]" />
        </div>
      ) : (
        <CommunityFeed
          currentUser={coachProfile}
          community={communityOf(coachProfile, myTalent)}
        />
      )}
    </div>
  );
}
