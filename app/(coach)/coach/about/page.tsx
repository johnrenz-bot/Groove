'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Compass, MapPin } from 'lucide-react';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';

const FEATURES = [
  {
    icon: <Compass className="h-4 w-4" />,
    title: 'Client Booking Workflow',
    line: 'Accept, decline or complete requests with full context.',
    details:
      'Accept, decline, or complete session requests with full visibility into client goals, experience level, and preferred location.',
  },
  {
    icon: <Bot className="h-4 w-4" />,
    title: '24/7 Smart AI Delegation',
    line: 'Your assistant answers rates while you rehearse.',
    details:
      'When you are in rehearsals or busy, your AI Coach Assistant answers rate and availability inquiries automatically.',
  },
  {
    icon: <MapPin className="h-4 w-4" />,
    title: 'Studio Map Directory',
    line: 'Find and recommend safe rehearsal spaces in Bulacan.',
    details:
      'Easily locate and recommend rehearsal studios in Bulacan to clients for safe, productive face-to-face coaching.',
  },
] as const;

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

      <div className="g-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:gap-6">
        {FEATURES.map((feature) => (
          <Panel key={feature.title} hoverable>
            <PanelHeader
              icon={feature.icon}
              title={feature.title}
              info={feature.details}
              infoShort={feature.line}
            />
            <PanelBody>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.line}</p>
            </PanelBody>
          </Panel>
        ))}
      </div>
    </div>
  );
}
