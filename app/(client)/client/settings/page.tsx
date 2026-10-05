'use client';

/**
 * Client Settings — Account, Profile, Appearance, Danger Zone.
 *
 * Uses the same shared `SettingsSections` as the coach Settings page, so both
 * render identically. No notification-preferences section exists because this
 * platform stores no such preference.
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

export default function ClientSettingsPage() {
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
        eyebrow="Client / Performer"
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
          href="/client/profile"
          description="Your personal details, service location, and primary performing interest."
        />

        <AppearanceSettings />

        <DangerZone
          onSignOutAll={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
          }}
          onDeleteAccount={async () => {
            // No account-deletion endpoint exists, so this raises a request in
            // the existing `tickets` channel for an admin to action.
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