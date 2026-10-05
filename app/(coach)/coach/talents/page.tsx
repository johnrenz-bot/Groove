'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import CommunityFeed from '@/components/community/CommunityFeed';
import { communityOf } from '@/lib/community';
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
        eyebrow="Community Feed"
        title="Performing Arts Showcase &amp; Updates"
        description="Share choreography routines, rehearsal highlights, studio announcements, and engage with verified students and coaches in Bulacan."
      />

      {loading ? (
        <div
          className="space-y-5 rounded-[20px] border border-border bg-card p-6"
          role="status"
          aria-live="polite"
        >
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            Loading community feed...
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3 rounded-[20px] border border-border p-5">
                <div className="g-skeleton h-9 w-9 rounded-full" />
                <div className="g-skeleton h-4 w-3/4" />
                <div className="g-skeleton h-3 w-full" />
                <div className="g-skeleton h-3 w-5/6" />
              </div>
            ))}
          </div>
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
