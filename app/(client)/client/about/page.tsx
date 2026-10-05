'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Bot,
  MapPin,
  Compass,
} from 'lucide-react';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, CardHeader, IconBadge } from '@/components/ui/Card';

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

      {/* Research insights */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        <Card padding="md" hoverable className="space-y-4">
          <IconBadge icon={<Compass className="h-5 w-5" />} />
          <div className="space-y-1.5">
            <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">Coach Discovery</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              78.9% of local performers struggled to discover qualified choreographers and vocal
              coaches without standard directory tools.
            </p>
          </div>
        </Card>

        <Card padding="md" hoverable className="space-y-4">
          <IconBadge icon={<Bot className="h-5 w-5" />} />
          <div className="space-y-1.5">
            <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">Inquiry Delays</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              82.2% experienced communication bottlenecks when inquiring about rates and schedules,
              now resolved with 24/7 AI Smart Chat.
            </p>
          </div>
        </Card>

        <Card padding="md" hoverable className="space-y-4">
          <IconBadge icon={<MapPin className="h-5 w-5" />} />
          <div className="space-y-1.5">
            <h3 className="text-base font-bold tracking-[-0.01em] text-foreground">Studio Access</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              86.8% faced challenges finding accessible rehearsal spaces, solved by our integrated
              studio locator and map guide.
            </p>
          </div>
        </Card>
      </div>

      {/* Mission & vision */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
        <Card padding="md">
          <CardHeader
            icon={<Sparkles className="h-4 w-4" />}
            title="Our Mission"
            subtitle="What Groove sets out to do"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            To empower artists to showcase their skills, connect with world-class mentorship, and
            overcome logistics barriers in finding rehearsal spaces and reliable performance
            coaching.
          </p>
        </Card>

        <Card padding="md">
          <CardHeader
            icon={<Sparkles className="h-4 w-4" />}
            title="Our Vision"
            subtitle="Where the platform is headed"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            A thriving, interconnected performing arts ecosystem where every dancer, singer, actor,
            and thespian has access to the resources they need to excel professionally.
          </p>
        </Card>
      </div>
    </div>
  );
}
