'use client';

/**
 * Client / Performer Profile — view mode + edit, redesigned.
 *
 * Data flow is unchanged from the registration-derived editor:
 * fields shown/editable here are precisely those `/register/client` collects.
 * What changed is presentation: a premium hero (cover + overlapping avatar),
 * real follower stats, an organized edit form with section navigation and an
 * unsaved-changes guard, and shared components across all three profile
 * surfaces.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Save,
} from 'lucide-react';
import { maskUsername, maskEmail, maskPhone, maskAddress } from '@/lib/masking';
import type { Profile, CommunityPost } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileGallery } from '@/components/profile/ProfileGallery';
import { createClient } from '@/lib/supabase/client';
import { FormError, FormSuccess } from '@/components/ui/FormError';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileShareButton } from '@/components/profile/ProfileShareButton';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { ProfileTabsNav } from '@/components/profile/ProfileTabsNav';
import { ProfileEditNav } from '@/components/profile/ProfileEditNav';
import { CompletionTile } from '@/components/profile/bento/ProfileTiles';
import { formatMemberSince } from '@/lib/profileDisplay';

// PhotoCropModal pulls in react-easy-crop (~170 KB); it only renders after an
// explicit edit action, so it is split out of the profile routes' initial bundle.
const PhotoCropModal = dynamic(
  () => import('@/components/profile/PhotoCropModal').then((m) => m.PhotoCropModal),
  { ssr: false }
);
import { Button } from '@/components/ui/Button';
import { ProfileSummary, VerificationStatus } from '@/components/profile/ProfileSummary';
import { ProfileLinksCard, type ProfileLinks } from '@/components/profile/ProfileLinksCard';
import { SignInMethodCard } from '@/components/profile/SignInMethodCard';
import { GrooveConfirmDialog } from '@/components/ui/GrooveConfirmDialog';

import { VerificationDocumentsUpload } from '@/features/verification/components/VerificationDocumentsUpload';
import { GCashQrCard } from '@/features/payments/components/GCashQrField';
import { verificationStatusOf } from '@/features/verification/services/verification';
import { BadgeCollection } from '@/components/badges/BadgeCollection';
import { ProfileProgressCard } from '@/components/achievements/ProfileProgressCard';
import { useAchievements, useBadgeStatus } from '@/lib/achievements/hooks';
import { profileTaskRequirements } from '@/lib/achievements/requirements';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
import { coverPublicUrl, uploadCoverImage, removeCoverImage } from '@/lib/profileCover';
import { fetchFollowCounts, type FollowCounts } from '@/lib/profileFollows';
import {
  AddressSection,
  ClientTalentSection,
  ContactSection,
  PersonalSection,
  VerificationReadOnly,
  validateProfileSections,
  type ContactFormValues,
  type PersonalFormValues,
  type ProfileFieldErrors,
} from '@/components/profile/ProfileFormSections';
import {
  joinBirthdate,
  normalizeContactForInput,
  normalizeContactForStorage,
  splitBirthdate,
} from '@/lib/profileFields';
import { composeStreetLine, type AddressData } from '@/components/auth/AddressSelector';

const EMPTY_ADDRESS: AddressData = {
  region_code: '',
  region_name: '',
  province_code: '',
  province_name: '',
  city_code: '',
  city_name: '',
  barangay_code: '',
  barangay_name: '',
  street: '',
  postal_code: '',
  address_summary: '',
};

type Tab = 'about' | 'showcase' | 'payments';

const EDIT_SECTIONS = [
  { id: 'profile-edit-personal', label: 'Personal' },
  { id: 'profile-edit-location', label: 'Location' },
  { id: 'profile-edit-contact', label: 'Contact' },
  { id: 'profile-edit-interest', label: 'Interest' },
  { id: 'profile-edit-links', label: 'Links' },
] as const;

export default function ClientProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientProfile, setClientProfile] = useState<{ talent?: string | null; valid_id_path?: string | null } | null>(
    null
  );
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('about');

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [cropKind, setCropKind] = useState<'avatar' | 'cover' | null>(null);
  const [coverVersion, setCoverVersion] = useState(0);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);

  /* Form state — field names match registration exactly. */
  const [personal, setPersonal] = useState<PersonalFormValues>({
    firstname: '',
    middlename: '',
    lastname: '',
    suffix: '',
    birth_year: '',
    birth_month: '',
    birth_day: '',
  });
  const [contact, setContact] = useState<ContactFormValues>({ contact: '', email: '', username: '' });
  const [address, setAddress] = useState<AddressData>(EMPTY_ADDRESS);
  const [talent, setTalent] = useState('Dance');
  const [links, setLinks] = useState<ProfileLinks>({
    website: '',
    social_link: '',
    github: '',
  });
  const [authProvider, setAuthProvider] = useState<string>('google');
  const [authEmail, setAuthEmail] = useState<string>('');

  // Achievement hooks
  const { achievements: clientAchievements, loading: achievementsLoading, refetch: refetchClientAchievements } = useAchievements(
    profile?.id ?? null,
    'client'
  );
  const { badgeStatus: clientBadgeStatus, refetch: refetchClientBadgeStatus } = useBadgeStatus(
    profile?.id ?? null
  );

  const { notifySuccess } = useSuccessNotifications();

  /** Dirty-tracking wrappers — anything handed to the form marks the form dirty. */
  const markDirty = <T,>(setter: React.Dispatch<React.SetStateAction<T>>): React.Dispatch<React.SetStateAction<T>> => {
    return (value) => {
      setDirty(true);
      setter(value);
    };
  };

  /**
   * The performer profile has three real requirements (photo, interest,
   * location). This checklist updates the moment `profile`/`clientProfile`
   * change, so the card and the toast always show the same saved state.
   */
  const clientProfileRequirements = useMemo(
    () =>
      profileTaskRequirements('client', {
        profile: profile
          ? {
              photo_url: profile.photo_url,
              city_name: profile.city_name,
              region_name: profile.region_name,
              barangay_name: profile.barangay_name,
            }
          : null,
        roleProfile: clientProfile ? { talent: clientProfile.talent } : null,
      }),
    [profile, clientProfile]
  );

  /**
   * Recompute achievement progress from live Supabase data, then reload the
   * task list and badge so the modal reflects a just-saved profile. Used when
   * the section mounts and whenever the modal is opened.
   */
  const handleRefreshAchievements = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { refreshAchievements } = await import('@/app/actions/achievements');
      await refreshAchievements(profile.id);
    } finally {
      await Promise.all([refetchClientAchievements(), refetchClientBadgeStatus()]);
    }
  }, [profile?.id, refetchClientAchievements, refetchClientBadgeStatus]);

  const hydrateForm = (data: Profile, cp: { talent?: string | null } | null) => {
    const b = splitBirthdate(data.birthdate);
    setPersonal({
      firstname: data.firstname || '',
      middlename: data.middlename || '',
      lastname: data.lastname || '',
      suffix: data.suffix || '',
      birth_year: b.year,
      birth_month: b.month,
      birth_day: b.day,
    });
    setContact({
      contact: normalizeContactForInput(data.contact),
      email: data.email || '',
      username: data.username || '',
    });
    setAddress({
      region_code: data.region_code || '',
      region_name: data.region_name || '',
      province_code: data.province_code || '',
      province_name: data.province_name || '',
      city_code: data.city_code || '',
      city_name: data.city_name || '',
      barangay_code: data.barangay_code || '',
      barangay_name: data.barangay_name || '',
      street: data.street || '',
      postal_code: data.postal_code || '',
      address_summary: data.address_summary || '',
    });
    setTalent(cp?.talent || 'Dance');
    setDirty(false);
  };

  /** Load profile, client_profiles row and showcase posts — original queries. */
  const fetchProfileData = useCallback(async () => {
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

      const prov = (user.app_metadata?.provider || user.identities?.[0]?.provider || 'google') as string;
      setAuthProvider(prov);
      setAuthEmail(user.email || '');

      try {
        const cached = typeof window !== 'undefined' ? localStorage.getItem(`groove_links_${user.id}`) : null;
        const parsed = cached ? JSON.parse(cached) : {};
        const meta = user.user_metadata || {};
        setLinks({
          website: meta.website || parsed.website || '',
          social_link: meta.social_link || parsed.social_link || '',
          github: meta.github || parsed.github || '',
        });
      } catch {
        // Non-blocking fallback
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (!profileData) return;

      const { data: cp } = await supabase
        .from('client_profiles')
        .select('talent, valid_id_path')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileData);
      setClientProfile(cp ?? null);
      hydrateForm(profileData, cp ?? null);

      const { data: userPosts } = await supabase
        .from('community_posts')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      setPosts(userPosts || []);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }

  }, [router]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Follower stats for the hero. `null` until the read settles — the row shows
  // an em dash rather than a made-up zero.
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchFollowCounts(profile.id).then((counts) => {
        if (cancelled || counts.missingTable) return;
        setFollowCounts({ followers: counts.followers, following: counts.following });
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [profile?.id]);

  // The cover is a deterministic public URL — memoized so the <img> does not
  // reload on every state change.
  const profileId = profile?.id ?? null;
  const coverUrl = useMemo(
    () => (profileId ? coverPublicUrl(profileId) : null),
    [profileId]
  );

  // Unsaved-changes guard: closing or reloading the tab while the form is dirty
  // asks for confirmation. In-app cancels are intercepted by `requestDiscard`.
  useEffect(() => {
    if (!editing || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [editing, dirty]);

  const leaveEditMode = useCallback(() => {
    if (!profile) return;
    setEditing(false);
    setErrors({});
    setFailure(null);
    hydrateForm(profile, clientProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, clientProfile]);

  /** Cancel button: guard against losing unsaved edits. */
  const requestCancelEdit = useCallback(() => {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    leaveEditMode();
  }, [dirty, leaveEditMode]);

  /** Avatar upload — the existing bucket and code path, fed by a cropped JPEG. */
  const handleAvatarSave = async (blob: Blob) => {
    if (!profile) return;

    setPhotoUploading(true);
    setFailure(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw new Error(`Authentication error: ${authError.message}`);
      if (!user) throw new Error('Your session has expired. Please log in again.');

      const filename = `${user.id}/avatar_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) throw new Error(uploadError.message || 'Failed to upload profile photo.');

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
      const newPhotoUrl = urlData.publicUrl;
      if (!newPhotoUrl) throw new Error('Could not generate the avatar URL.');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: newPhotoUrl })
        .eq('id', user.id);

      if (updateError) throw new Error(updateError.message || 'Photo uploaded, but profile could not be updated.');

      setProfile({ ...profile, photo_url: newPhotoUrl });
      setSuccess('Profile photo updated successfully.');

      const nextRequirements = profileTaskRequirements('client', {
        profile: {
          photo_url: newPhotoUrl,
          city_name: profile.city_name,
          region_name: profile.region_name,
          barangay_name: profile.barangay_name,
        },
        roleProfile: { talent: clientProfile?.talent },
      });
      const completed = nextRequirements.filter((requirement) => requirement.met).length;

      notifySuccess({
        title: 'Profile photo updated',
        description: 'Your new photo is live on your performer profile.',
        icon: <Camera className="h-4 w-4" aria-hidden="true" />,
        dedupeKey: `client-photo-${user.id}`,
        progress: {
          completed,
          total: nextRequirements.length,
          label: 'Profile completion',
        },
      });

      // The photo is one of the profile task's requirements, so recompute the
      // badge checklist too instead of waiting for the next full page load.
      try {
        const { updateAchievementsAfterProfileUpdate } = await import('@/app/actions/achievements');
        await updateAchievementsAfterProfileUpdate(user.id, 'client');
        await Promise.all([refetchClientAchievements(), refetchClientBadgeStatus()]);
      } catch {
        // A badge refresh must not undo a successfully uploaded photo.
      }
    } catch (err) {
      // Surface inside the modal so the member can retry without losing context.
      setFailure(err instanceof Error ? err.message : 'Failed to upload photo.');
      throw err;
    } finally {
      setPhotoUploading(false);
    }
  };

  /** Cover upload — deterministic object in the same public `avatars` bucket. */
  const handleCoverSave = async (blob: Blob) => {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw new Error(`Authentication error: ${authError.message}`);
    if (!user) throw new Error('Your session has expired. Please log in again.');

    setCoverUploading(true);
    try {
      await uploadCoverImage(user.id, blob);
      setCoverVersion(Date.now());
      setSuccess('Cover photo updated.');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverRemove = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Your session has expired. Please log in again.');

    setRemovingCover(true);
    try {
      await removeCoverImage(user.id);
      setCoverVersion(Date.now());
      setSuccess('Cover photo removed.');
    } finally {
      setRemovingCover(false);
    }
  };

  /** Save — same tables and columns as the previous editor. */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || saving) return;

    setFailure(null);
    setSuccess(null);

    const nextErrors = validateProfileSections({ personal, contact, address, talent });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById('profile-form')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session has expired. Please log in again.');

      const nextUsername = contact.username.trim().toLowerCase();
      if (nextUsername !== (profile.username || '').toLowerCase()) {
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', nextUsername)
          .maybeSingle();
        if (taken) {
          setSaving(false);
          setErrors({ username: 'That username is already taken.' });
          return;
        }
      }

      const birthdate = joinBirthdate(personal.birth_year, personal.birth_month, personal.birth_day);
      const nextEmail = contact.email.trim();

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          firstname: personal.firstname.trim(),
          middlename: personal.middlename.trim() || null,
          lastname: personal.lastname.trim(),
          suffix: personal.suffix.trim() || null,
          birthdate,
          contact: normalizeContactForStorage(contact.contact),
          username: nextUsername,
          address_summary: address.address_summary,
          region_code: address.region_code,
          province_code: address.province_code,
          city_code: address.city_code,
          barangay_code: address.barangay_code,
          region_name: address.region_name,
          province_name: address.province_name,
          city_name: address.city_name,
          barangay_name: address.barangay_name,
          street: composeStreetLine(address.street, address.subdivision) || null,
          postal_code: address.postal_code || null,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Email is the sign-in identifier: Auth first, then mirror to `profiles`.
      if (nextEmail && nextEmail !== profile.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: nextEmail });
        if (authError) throw new Error(authError.message);
        const { error: emailMirror } = await supabase
          .from('profiles')
          .update({ email: nextEmail })
          .eq('id', user.id);
        if (emailMirror) throw new Error(emailMirror.message);
      }

      // `client_profiles.talent` — the same row registration upserts. Only
      // `talent` is written; `valid_id_path` is left exactly as submitted.
      const { error: cpError } = await supabase
        .from('client_profiles')
        .upsert({ id: user.id, talent }, { onConflict: 'id' });
      if (cpError) throw new Error(cpError.message);

      // Save optional links to auth user metadata and localStorage
      try {
        await supabase.auth.updateUser({
          data: {
            website: links.website || null,
            social_link: links.social_link || null,
            github: links.github || null,
            links,
          },
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem(`groove_links_${user.id}`, JSON.stringify(links));
        }
      } catch {
        // Non-blocking fallback
      }

      setSuccess('Profile information saved successfully.');
      setEditing(false);
      setDirty(false);

      // Update achievements after profile save
      try {
        const { updateAchievementsAfterProfileUpdate } = await import('@/app/actions/achievements');
        await updateAchievementsAfterProfileUpdate(user.id, 'client');
        await Promise.all([refetchClientAchievements(), refetchClientBadgeStatus()]);
      } catch (e) {
        console.error('Failed to update achievements:', e);
      }

      // Build the completion readout from the values just written, not from a
      // shared counter. The client profile has its own three requirements.
      const nextRequirements = profileTaskRequirements('client', {
        profile: {
          photo_url: profile.photo_url,
          city_name: address.city_name,
          region_name: address.region_name,
          barangay_name: address.barangay_name,
        },
        roleProfile: { talent },
      });
      const completed = nextRequirements.filter((requirement) => requirement.met).length;
      const remaining = nextRequirements.length - completed;

      notifySuccess({
        title: 'Profile saved',
        description:
          remaining === 0
            ? 'Every required performer detail is complete.'
            : `${remaining} required ${remaining === 1 ? 'detail' : 'details'} still need your attention.`,
        dedupeKey: `client-profile-save-${user.id}`,
        progress: {
          completed,
          total: nextRequirements.length,
          label: 'Profile completion',
        },
        action: {
          label: 'View progress',
          onClick: () =>
            document
              .getElementById('profile-completion-client')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        },
      });

      await fetchProfileData();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-16 pt-2">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">
          {failure ?? 'Please log in to view your profile.'}
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const dob = splitBirthdate(profile.birthdate);
  const documentRows = [
    { label: 'Government or Student ID', uploaded: Boolean(clientProfile?.valid_id_path) },
  ];

  const COMPLETION_ITEMS = [
    { id: 'photo', label: 'Profile photo' },
    { id: 'talent', label: 'Performing interest' },
    { id: 'location', label: 'Location' },
  ] as const;
  const completionDone: string[] = [
    ...(profile.photo_url ? ['photo'] : []),
    ...(clientProfile?.talent ? ['talent'] : []),
    ...(profile.city_name || profile.province_name ? ['location'] : []),
  ];
  const completionIncomplete =
    completionDone.length < COMPLETION_ITEMS.length && !completionDismissed;

  const publicHref = `/userprofile/${profile.id}`;
  const fullName = `${profile.firstname ?? ''} ${profile.lastname ?? ''}`.trim() || 'Groove member';

  const TABS = [
    { id: 'about', label: 'Overview & Details' },
    { id: 'showcase', label: 'Media Showcase', count: posts.length },
    { id: 'payments', label: 'Payments' },
  ];

  const heroStats = [
    { label: 'Posts', value: posts.length },
    { label: 'Followers', value: followCounts ? followCounts.followers : '—' },
    { label: 'Following', value: followCounts ? followCounts.following : '—' },
  ];

  return (
    <div className="pb-16">
      {failure && (
        <div className="mb-4">
          <FormError message={failure} onDismiss={() => setFailure(null)} />
        </div>
      )}
      {success && (
        <div className="mb-4">
          <FormSuccess>{success}</FormSuccess>
        </div>
      )}

      {/* ── HERO — cover, avatar, identity, actions ─────────────── */}
      <ProfileHero
        role="client"
        name={fullName}
        username={revealSensitive ? profile.username : maskUsername(profile.username)}
        rolePill={clientProfile?.talent || 'Performer'}
        bio={profile.bio}
        locationText={[profile.city_name, profile.province_name].filter(Boolean).join(', ') || null}
        memberSince={formatMemberSince(profile.created_at)}
        verified={profile.account_verified}
        photoUrl={profile.photo_url}
        coverUrl={coverUrl}
        coverCacheBust={coverVersion}
        stats={heroStats}
        avatarAlt={`${fullName}'s profile photo`}
        onChangePhoto={() => setCropKind('avatar')}
        photoUploading={photoUploading}
        onChangeCover={() => setCropKind('cover')}
        coverUploading={coverUploading}
        actions={
          <>
            <ProfileShareButton path={publicHref} title={`${fullName} on GroovePH`} />
            {!editing && (
              <a
                href={publicHref}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <Eye className="h-4 w-4 text-accent-text" aria-hidden="true" />
                Preview
              </a>
            )}
            <Button
              onClick={editing ? requestCancelEdit : () => setEditing(true)}
              size="md"
              className="h-10 rounded-xl text-[13px]"
              icon={editing ? <ArrowLeft className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            >
              {editing ? 'Back to preview' : 'Edit profile'}
            </Button>
          </>
        }
      />

      {/* Completion checklist — owner only, hidden once complete */}
      {completionIncomplete && (
        <div className="mt-4" id="profile-completion-client">
          <CompletionTile
            items={COMPLETION_ITEMS.slice()}
            completedIds={completionDone}
            onItemClick={() => {
              setEditing(true);
              setDirty(false);
            }}
            onDismiss={() => setCompletionDismissed(true)}
          />
        </div>
      )}

      {/* Achievements — full width below the hero */}
      <div className="mt-6 space-y-4">
        <ProfileProgressCard role="client" requirements={clientProfileRequirements} />
        <BadgeCollection
          tasks={clientAchievements}
          badgeStatus={clientBadgeStatus}
          userId={profile.id}
          role="client"
          loading={achievementsLoading}
          onRefresh={handleRefreshAchievements}
        />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <ProfileTabsNav
          tabs={TABS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as Tab)}
          ariaLabel="Profile sections"
        />
      </div>

      {/* ── About: view mode ── */}
      {activeTab === 'about' && !editing && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <ProfileSummary
              title="Personal Information"
              description="The identity fields collected at registration."
              action={
                <button
                  type="button"
                  onClick={() => setRevealSensitive((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label={revealSensitive ? 'Mask sensitive details' : 'Reveal sensitive details'}
                >
                  {revealSensitive ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      <span>Mask details</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      <span>Reveal details</span>
                    </>
                  )}
                </button>
              }
              rows={[
                { label: 'First Name', value: profile.firstname },
                { label: 'Middle Name', value: profile.middlename || '' },
                { label: 'Last Name', value: profile.lastname },
                { label: 'Suffix', value: profile.suffix || '' },
                {
                  label: 'Date of Birth',
                  value: dob.year && dob.month && dob.day ? `${dob.month}/${dob.day}/${dob.year}` : '',
                },
                {
                  label: 'Username',
                  value: revealSensitive ? profile.username : maskUsername(profile.username),
                },
                {
                  label: 'Email Address',
                  value: revealSensitive ? profile.email : maskEmail(profile.email),
                },
                {
                  label: 'Philippine Mobile Number',
                  value: revealSensitive ? (profile.contact || '') : maskPhone(profile.contact || ''),
                },
                {
                  label: 'Primary Performing Interest',
                  value: clientProfile?.talent || '',
                },
              ]}
            />

            <ProfileSummary
              title="Service Location"
              description="Restricted to San Jose del Monte, Bulacan at registration."
              action={
                <button
                  type="button"
                  onClick={() => setRevealSensitive((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label={revealSensitive ? 'Mask address details' : 'Reveal address details'}
                >
                  {revealSensitive ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      <span>Mask address</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                      <span>Reveal address</span>
                    </>
                  )}
                </button>
              }
              rows={[
                { label: 'Barangay', value: profile.barangay_name || '' },
                {
                  label: 'Street / House No. / Building',
                  value: revealSensitive ? (profile.street || '') : maskAddress(profile.street),
                },
                { label: 'Postal Code', value: profile.postal_code || '' },
                { label: 'City', value: profile.city_name || '' },
                { label: 'Province', value: profile.province_name || '' },
                { label: 'Region', value: profile.region_name || '' },
              ]}
            />

            <ProfileLinksCard links={links} />
          </div>

          <div className="space-y-6">
            <SignInMethodCard provider={authProvider} email={authEmail} />

            <VerificationStatus
              emailVerified={profile.email_verified}
              accountVerified={profile.account_verified}
              status={profile.status}
              extraRows={documentRows}
              verificationStatus={verificationStatusOf(profile)}
              rejectionReason={profile.verification_rejection_reason}
              rejectedDocument={profile.verification_rejected_document}
            />

            <VerificationReadOnly rows={documentRows} />

            {/* The corrective half of the rejection loop: VerificationReadOnly
                above is intentionally read-only, so without this a rejected
                account has no way to fix anything. Renders nothing once verified. */}
            <VerificationDocumentsUpload
              userId={profile.id}
              role="client"
              accountVerified={profile.account_verified}
              verificationStatus={verificationStatusOf(profile)}
              currentPaths={{ valid_id_path: clientProfile?.valid_id_path ?? null }}
              onResubmitted={fetchProfileData}
            />

            <Link href="/client/settings" className="block">
              <Button variant="secondary" className="w-full">
                Account Settings
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── About: edit mode ── */}
      {activeTab === 'about' && editing && (
        <form id="profile-form" onSubmit={handleSave} noValidate className="space-y-5">
          <ProfileEditNav sections={EDIT_SECTIONS.slice()} />

          <section id="profile-edit-personal" className="scroll-mt-24 g-card p-5 sm:p-6">
            <PersonalSection values={personal} errors={errors} onChange={markDirty(setPersonal)} />
          </section>

          <section id="profile-edit-location" className="scroll-mt-24 g-card p-5 sm:p-6">
            <AddressSection address={address} onChange={markDirty(setAddress)} errors={errors} />
          </section>

          <section id="profile-edit-contact" className="scroll-mt-24 g-card p-5 sm:p-6">
            <ContactSection values={contact} errors={errors} onChange={markDirty(setContact)} />
          </section>

          <section id="profile-edit-interest" className="scroll-mt-24 g-card p-5 sm:p-6">
            <ClientTalentSection talent={talent} errors={errors} onChange={markDirty(setTalent)} />
          </section>

          <section id="profile-edit-links" className="scroll-mt-24">
            <ProfileLinksCard links={links} editing={true} onChange={markDirty(setLinks)} />
          </section>

          {/* Sticky action bar — always within reach while editing. */}
          <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 backdrop-blur-md">
            <p className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span
                aria-hidden="true"
                className={`h-2 w-2 flex-none rounded-full ${dirty ? 'bg-accent animate-pulse' : 'bg-success'}`}
              />
              <span className="truncate">{dirty ? 'Unsaved changes' : 'Everything is saved'}</span>
            </p>
            <div className="flex flex-none items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={requestCancelEdit}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={saving} icon={<Save className="h-4 w-4" />}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── Payments tab: GCash QR ── */}
      {activeTab === 'payments' && (
        <GCashQrCard
          userId={profile.id}
          accountName={`${profile.firstname ?? ''} ${profile.lastname ?? ''}`.trim()}
          accountNumber={profile.contact ?? ''}
        />
      )}

      {/* ── Showcase — owner gallery (filters, reorder, lightbox) ── */}
      {activeTab === 'showcase' && (
        <div className="space-y-4">
          {posts.length === 0 && (
            <EmptyState
              icon={<ImageIcon className="h-5 w-5" />}
              title="No media posts yet"
              description="Share your performances and routines to the community showcase!"
              action="Go to Community Feed"
              actionHref="/client/talent"
            />
          )}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* Same private-bucket resolver and owner re-order/lightbox as the
                previous gallery tile — Media_path is never rendered raw. */}
            <ProfileGallery
              items={posts}
              mode="owner"
              userId={profile.id}
            />
          </div>
        </div>
      )}

      {/* Photo / cover crop dialog */}
      <PhotoCropModal
        kind={cropKind ?? 'avatar'}
        open={cropKind !== null}
        onClose={() => setCropKind(null)}
        onSave={cropKind === 'cover' ? handleCoverSave : handleAvatarSave}
        onRemove={cropKind === 'cover' ? handleCoverRemove : undefined}
        removing={removingCover}
      />

      {/* Discard-changes confirmation */}
      <GrooveConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard your changes?"
        description="Your edits haven't been saved yet. Leaving now means everything you typed will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={leaveEditMode}
      />
    </div>
  );
}
