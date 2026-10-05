'use client';

/**
 * Coach Settings — Account, Profile, Appearance, Danger Zone.
 *
 * The sections come from the shared `SettingsSections`, so coach and client
 * Settings are structurally identical. There is no notification-preferences
 * section: this platform stores no such preference, so none is invented.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { FormError } from '@/components/ui/FormError';
import {
  AccountSettings,
  AppearanceSettings,
  DangerZone,
  ProfileSettingsLink,
} from '@/components/profile/SettingsSections';

export default function CoachSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to load your account.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-text" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">{failure ?? 'Please log in to view settings.'}</p>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Coach"
        title="Settings"
        description="Manage your sign-in details, profile, appearance, and account safety."
      />

      {failure && (
        <div className="mb-6">
          <FormError message={failure} onDismiss={() => setFailure(null)} />
        </div>
      )}

      <div className="space-y-6">
        <AccountSettings
          userId={profile.id}
          email={profile.email}
          username={profile.username}
          customId={profile.custom_id}
          onSaved={(next) => setProfile((p) => (p ? { ...p, ...next } : p))}
        />

        <ProfileSettingsLink
          href="/coach/profile"
          description="Your coaching details — bio, skill and genres, rates, duration, and payment options."
        />

        <AppearanceSettings />

        <DangerZone
          onSignOutAll={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
          }}
          onDeleteAccount={async () => {
            // The platform's existing support channel is `tickets`; there is no
            // account-deletion endpoint, so this raises an admin-reviewable
            // request rather than pretending to delete anything.
            const supabase = createClient();
            await supabase.from('tickets').insert({
              user_id: profile.id,
              name: `${profile.firstname} ${profile.lastname}`,
              email: profile.email,
              subject: 'Account deletion request',
              message:
                'I am requesting permanent deletion of my Groove account and personal data. Please confirm once this has been actioned.',
              status: 'open',
              priority: 'normal',
            });
          }}
        />
      </div>
    </div>
  );
}