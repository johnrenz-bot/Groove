'use client';

/**
 * Coach Settings — Account, Profile, Appearance, Danger Zone.
 *
 * Uses the same shared `SettingsSections` as the client Settings page, so both
 * render identically. No notification-preferences section exists because this
 * platform stores no such preference.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/SectionHeader';
import { FormError } from '@/components/ui/FormError';
import { useProfile } from '@/hooks/useProfile';
import { signOutEverywhere } from '@/lib/auth/signOut';
import {
  AccountSettings,
  AppearanceSettings,
  DangerZone,
  ProfileSettingsLink,
} from '@/components/profile/SettingsSections';
import { SettingsNav } from '@/components/profile/SettingsNav';

export default function CoachSettingsPage() {
  const router = useRouter();
  const { profile, setProfile, userId, loading, error } = useProfile();
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !userId) router.push('/login');
  }, [loading, userId, router]);

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
        <p className="text-sm text-muted-foreground">{error ?? 'Please log in to view settings.'}</p>
      </div>
    );
  }

  return (
    <div className="app-page pb-16">
      <PageHeader
        eyebrow="Coach"
        title="Settings"
        description="Manage your sign-in details, profile, appearance, and account safety."
      />

      {error && error !== dismissedError && (
        <div className="mb-6">
          <FormError message={error} onDismiss={() => setDismissedError(error)} />
        </div>
      )}

      <div className="settings-shell">
        <SettingsNav />
        <div className="app-section">
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
          id="danger"
          onSignOutAll={() => signOutEverywhere(profile.id)}
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
    </div>
  );
}

