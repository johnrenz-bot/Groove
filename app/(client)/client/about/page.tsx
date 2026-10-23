'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Bot, MapPin, Compass } from 'lucide-react';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';

const INSIGHTS = [
  {
    icon: <Compass className="h-4 w-4" />,
    title: 'Coach Discovery',
    value: '78.9%',
    line: 'of local performers struggled to find qualified coaches',
    details:
      '78.9% of local performers struggled to discover qualified choreographers and vocal coaches without standard directory tools.',
  },
  {
    icon: <Bot className="h-4 w-4" />,
    title: 'Inquiry Delays',
    value: '82.2%',
    line: 'hit communication bottlenecks when asking about rates',
    details:
      '82.2% experienced communication bottlenecks when inquiring about rates and schedules, now resolved with 24/7 AI Smart Chat.',
  },
  {
    icon: <MapPin className="h-4 w-4" />,
    title: 'Studio Access',
    value: '86.8%',
    line: 'faced challenges finding accessible rehearsal space',
    details:
      '86.8% faced challenges finding accessible rehearsal spaces, solved by our integrated studio locator and map guide.',
  },
] as const;

export default function ClientAboutPage() {
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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="San Jose del Monte Performing Arts Platform"
        title={
          <>
            About <span className="text-accent-text">GROOVE</span>
          </>
        }
        description="Built from research in San Jose del Monte, Bulacan, GROOVE solves the core barriers in performing arts: connecting talented performers with verified coaches, providing 24/7 AI assistance, and locating rehearsal studios."
      />

      <div className="g-stagger grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {INSIGHTS.map((insight) => (
          <Panel key={insight.title} hoverable>
            <PanelHeader
              icon={insight.icon}
              title={insight.title}
              info={insight.details}
              infoShort={insight.line}
            />
            <PanelBody className="space-y-1">
              <p className="text-3xl font-bold tabular-nums tracking-[-0.03em] text-foreground">
                {insight.value}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{insight.line}</p>
            </PanelBody>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
        <Panel>
          <PanelHeader
            icon={<Sparkles className="h-4 w-4" />}
            title="Our Mission"
            infoShort="Empower artists, remove logistics barriers."
            info="To empower artists to showcase their skills, connect with world-class mentorship, and overcome logistics barriers in finding rehearsal spaces and reliable performance coaching."
          />
          <PanelBody>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To empower artists to showcase their skills, connect with world-class mentorship, and
              overcome logistics barriers in finding rehearsal spaces and reliable performance
              coaching.
            </p>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            icon={<Sparkles className="h-4 w-4" />}
            title="Our Vision"
            infoShort="A thriving, interconnected performing arts ecosystem."
            info="A thriving, interconnected performing arts ecosystem where every dancer, singer, actor, and thespian has access to the resources they need to excel professionally."
          />
          <PanelBody>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A thriving, interconnected performing arts ecosystem where every dancer, singer, actor,
              and thespian has access to the resources they need to excel professionally.
            </p>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
