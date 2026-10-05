'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Compass,
  MapPin,
} from 'lucide-react';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, IconBadge } from '@/components/ui/Card';

export default function CoachAboutPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data as Profile);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <div className="space-y-10 sm:space-y-14">
      <PageHeader
        eyebrow="San Jose del Monte Performing Arts Platform"
        title={
          <>
            About <span className="text-accent-text">GROOVE</span>
          </>
        }
        description="As a coach, GROOVE provides you with direct student bookings, digital signed contracts, AI assistant delegation, and a dedicated showcase for your routines and workshops."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:gap-6">
        <Card hoverable className="flex flex-col gap-4">
          <IconBadge icon={<Compass className="h-5 w-5" />} size="sm" />
          <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">
            Client Booking Workflow
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Accept, decline, or complete session requests with full visibility into client goals, experience level, and preferred location.
          </p>
        </Card>

        <Card hoverable className="flex flex-col gap-4">
          <IconBadge icon={<Bot className="h-5 w-5" />} size="sm" />
          <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">
            24/7 Smart AI Delegation
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            When you are in rehearsals or busy, your AI Coach Assistant answers rate and availability inquiries automatically.
          </p>
        </Card>

        <Card hoverable className="flex flex-col gap-4">
          <IconBadge icon={<MapPin className="h-5 w-5" />} size="sm" />
          <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">
            Studio Map Directory
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Easily locate and recommend rehearsal studios in Bulacan to clients for safe, productive face-to-face coaching.
          </p>
        </Card>
      </div>
    </div>
  );
}
