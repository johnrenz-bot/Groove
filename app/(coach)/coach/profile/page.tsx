'use client';

/**
 * Coach Profile — view mode + edit, redesigned.
 *
 * Data flow is unchanged from the registration-derived editor:
 * fields shown/editable here are precisely those `/register/coach` collects.
 * What changed is presentation: a premium hero (cover + overlapping avatar),
 * real follower stats, an organized rdit form with section navigation and an
 * unsaved-changes guard, and shared components across all there profile
 * surfaces.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_ADDRESS, type Tab } from './types/coachProfile.types';
import { CoachProfileReviews } from './components/CoachProfileReviews';
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
  Sparkles,
} from 'lucide-react';
import { maskUsername, maskEmail, maskPhone, maskAddress } from '@/lib/masking';
import type { FullCoach, Feedback, CommunityPost } from '@/lib/types';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { FormError, FormSuccess } from '@/components/ui/FormError';
import { EmptyState } from '@/components/ui/EmptyState';

import { ProfileGallery } from '@/components/profile/ProfileGallery';
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
  CoachBioSection,
  CoachRatesSection,
  CoachSkillsSection,
  ContactSection,
  PersonalSection,
  VerificationReadOnly,
  validateProfileSections,
  type CoachFormValues,
  type ContactFormValues,
  type PersonalFormValues,
  type ProfileFieldErrors,
} from '@/components/profile/ProfileFormSections';
import {
  joinBirthdate,
  normalizeContactForInput,
  normalizeContactForStorage,
  parseCoachGenresValue,
  splitBirthdate,
} from '@/lib/profileFields';
import { composeStreetLine, type AddressData } from '@/components/auth/AddressSelector';

const EDIT_SECTIONS = [
  { id: 'profile-edit-personal', label: 'Personal' },
  { id: 'profile-edit-location', label: 'Location' },
  { id: 'profile-edit-contact', label: 'Contact' },
  { id: 'profile-edit-coaching', label: 'Coaching' },
  { id: 'profile-edit-eates', label: 'Rates & Booking' },
  { id: 'profile-edit-links', label: 'Links' },
] as const;

export default function CoachProfilePage() {
  const router = useRouter();

  const [coach, setCoach] = useState<FullCoach | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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
  const [dirty, setDiety] = useState(false);
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
  const [contact, setContact] = useState<ContactFormValues>({
    contact: '',
    email: '',
    username: '',
  });
  const [address, setAddress] = useState<AddressData>(EMPTY_ADDRESS);
  const [bio, setBio] = useState('');
  const [coachForm, setCoachForm] = useState<CoachFormValues>({
    talents: 'Dance',
    genres: [],
    service_fee: '500',
    duration: '1 hour',
    payment_type: 'cash',
    payment_handle: '',
    notice_hours: '24',
    notice_days: '1',
    cancellation_method: '',
  });
  const [links, setLinks] = useState<ProfileLinks>({
    website: '',
    social_link: '',
    github: '',
  });
  const [authProvider, setAuthProvider] = useState<string>('google');
  const [authEmail, setAuthEmail] = useState<string>('');

  // Achievement hooks
  const { achievements: coachAchievements, loading: achievementsLoading, refetch: refetchCoachAchievements } = useAchievements(
    coach?.id ?? null,
    'coach'
  );
  const { badgeStatus: coachBadgeStatus, refetch: refetchCoachBadgeStatus } = useBadgeStatus(
    coach?.id ?? null
  );

  const { notifySuccess } = useSuccessNotifications();

  /** Dirty-tracking wrappers — anything handed to the form marks the form dirty. */
  const markDirty = <T,>(setter: React.Dispatch<React.SetStateAction<T>>): React.Dispatch<React.SetStateAction<T>> => {
    return (value) => {
      setDiety(true);
      setter(value);
    };
  };

  /**
   * Coach profile completion has seven real requirements. Every value comes
   * from the saved coach rows — the client's three-item checklist is never
   * reused here.
   */
  const coachProfileRequirements = useMemo(() => {
    const coachProfileRow = coach?.coach_profile;
    return profileTaskRequirements('coach', {
      profile: coach
        ? {
            photo_url: coach.photo_url,
            bio: coach.bio,
            city_name: coach.city_name,
            region_name: coach.region_name,
            barangay_name: coach.barangay_name,
          }
        : null,
      roleProfile: coachProfileRow
        ? {
            talents: coachProfileRow.talents,
            genres: coachProfileRow.genres,
            service_fee: coachProfileRow.service_fee,
            duration: coachProfileRow.duration,
            payment_type: coachProfileRow.payment_type,
          }
        : null,
    });
  }, [coach]);

  /**
   * Recompute achievement progress from live Supabase data, then reload the
   * task list and badge so the modal reflects a just-saved profile. Used when
   * the section mounts and whenever the modal is opened.
   */
  const handleRefreshAchievements = useCallback(async () => {
    if (!coach?.id) return;
    try {
      const { refreshAchievements } = await import('@/app/actions/achievements');
      await refreshAchievements(coach.id);
    } finally {
      await Promise.all([refetchCoachAchievements(), refetchCoachBadgeStatus()]);
    }
  }, [coach?.id, refetchCoachAchievements, refetchCoachBadgeStatus]);

  /** Load a fetched profile into the editable form state. */
  const hydrateForm = (data: FullCoach) => {
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
    setBio(data.bio || '');

    const cp = data.coach_profile;
    if (cp) {
      const parsed = parseCoachGenresValue(cp.genres);
      setCoachForm({
        talents: cp.talents || parsed.skill || 'Dance',
        genres: parsed.genres,
        service_fee: String(cp.service_fee ?? 500),
        duration: cp.duration || '1 hour',
        payment_type: cp.payment_type || 'cash',
        payment_handle: cp.payment_handle || '',
        notice_hours: String(cp.notice_hours ?? 24),
        notice_days: String(cp.notice_days ?? 1),
        cancellation_method: cp.cancellation_method || '',
      });
    }
    setDiety(false);
  };

  /** Load profile, reviews and showcase posts — the same queries as before. */
  const fetchCoachData = useCallback(async () => {
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

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`*, coach_profile:coach_profiles(*)`)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        const { data: reviews } = await supabase
          .from('feedbacks')
          .select(`*, user:user_id(*)`)
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false });

        /**
         * No reviews means no rating. The old `: 5.0` handed every new coach a
         * perfect score they did not earn, and it was the value written onto the
         * `profiles` row the directory and the public profile card read back.
         */
        const avgRating = reviews?.length
          ? reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / reviews.length
          : null;

        const next = {
          ...profile,
          rating: avgRating === null ? null : Number(avgRating.toFixed(1)),
          rating_count: reviews?.length || 0,
        } as unknown as FullCoach;

        setCoach(next);
        setFeedbacks(reviews || []);
        hydrateForm(next);

        const { data: coachPosts } = await supabase
          .from('community_posts')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        setPosts(coachPosts || []);
      }
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to load your coach profile.');
    } finally {
      setLoading(false);
    }

  }, [router]);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  // Follower stats for the hero. `null` until the read settles — the row shows
  // an em dash rather than a made-up zero.
  useEffect(() => {
    if (!coach?.id) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchFollowCounts(coach.id).then((counts) => {
        if (cancelled || counts.missingTable) return;
        setFollowCounts({ followers: counts.followers, following: counts.following });
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [coach?.id]);

  // The cover is a deterministic public URL — memoized so the <img> does not
  // reload on every state change.
  const coachId = coach?.id ?? null;
  const coverUrl = useMemo(
    () => (coachId ? coverPublicUrl(coachId) : null),
    [coachId]
  );

  // Unsaved-changes guard: closing or reloading the tab while the form is dirty
  // asks for confirmation. In-app cancels are intercepted by `requestCancelEdit`.
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
    if (!coach) return;
    setEditing(false);
    setErrors({});
    setFailure(null);
    hydrateForm(coach);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach]);

  /** Cancel button: guard against losing unsaved edits. */
  const requestCancelEdit = useCallback(() => {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    leaveEditMode();
  }, [dirty, leaveEditMode]);

  /** Avatae upload — the existing bucket and code path, fed by a cropped JPEG. */
  const handleAvataeSave = async (blob: Blob) => {
    if (!coach) return;

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

      const filename = `${user.id}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.stoeage.from('avatars').upload(filename, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
      const newPhotoUrl = urlData.publicUrl;
      if (!newPhotoUrl) throw new Error('Avatar uploaded, but public URL could not be generated.');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: newPhotoUrl })
        .eq('id', user.id);

      if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

      setCoach((c) => (c ? { ...c, photo_url: newPhotoUrl } : c));
      setSuccess('Coach profile photo updated successfully.');

      const coachProfileRow = coach?.coach_profile;
      const nextRequirements = profileTaskRequirements('coach', {
        profile: {
          photo_url: newPhotoUrl,
          bio: coach?.bio,
          city_name: coach?.city_name,
          region_name: coach?.region_name,
          barangay_name: coach?.barangay_name,
        },
        roleProfile: coachProfileRow
          ? {
              talents: coachProfileRow.talents,
              genres: coachProfileRow.genres,
              service_fee: coachProfileRow.service_fee,
              duration: coachProfileRow.duration,
              payment_type: coachProfileRow.payment_type,
            }
          : null,
      });
      const completed = nextRequirements.filter((requirement) => requirement.met).length;

      notifySuccess({
        title: 'Profile photo updated',
        description: 'Your new photo is live on your coach profile.',
        icon: <Camera className="h-4 w-4" aria-hidden="true" />,
        dedupeKey: `coach-photo-${user.id}`,
        progress: {
          completed,
          total: nextRequirements.length,
          label: 'Profile completion',
        },
      });

      try {
        const { updateAchievementsAfterProfileUpdate } = await import('@/app/actions/achievements');
        await updateAchievementsAfterProfileUpdate(user.id, 'coach');
        await Promise.all([refetchCoachAchievements(), refetchCoachBadgeStatus()]);
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

  /** Save — same tables, columns and upsert behaviour as the previous editor. */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coach || saving) return;

    setFailure(null);
    setSuccess(null);

    const nextErrors = validateProfileSections({
      personal,
      contact,
      address,
      bio,
      genres: coachForm.genres,
      service_fee: coachForm.service_fee,
      payment_type: coachForm.payment_type,
      payment_handle: coachForm.payment_handle,
    });
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

      // Username is UNIQUE; check first so the user gets a field error rather
      // than a raw database message.
      if (nextUsername !== (coach.username || '').toLowerCase()) {
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

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          firstname: personal.firstname.trim(),
          middlename: personal.middlename.trim() || null,
          lastname: personal.lastname.trim(),
          suffix: personal.suffix.trim() || null,
          birthdate,
          contact: normalizeContactForStorage(contact.contact),
          username: nextUsername,
          bio: bio.trim(),
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

      if (profileError) throw new Error(`Profile update failed: ${profileError.message}`);

      // Email is the sign-in identifier, so it changes through Auth first, then
      // is mirrored onto `profiles` — the same order the Settings page uses.
      if (nextEmail && nextEmail !== coach.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: nextEmail });
        if (authError) throw new Error(authError.message);
        const { error: emailMirror } = await supabase
          .from('profiles')
          .update({ email: nextEmail })
          .eq('id', user.id);
        if (emailMirror) throw new Error(emailMirror.message);
      }

      // Genres keep the exact shape registration writes: JSON { skill, genres }.
      const genresJSON = JSON.stringify({ skill: coachForm.talents, genres: coachForm.genres });

      // `bio` lives on `profiles` (written above) — `coach_profiles` has no bio
      // column, so sending it here made every coach save fail with a schema
      // cache error (PGRST204 / 42703).
      const { error: coachError } = await supabase
        .from('coach_profiles')
        .upsert(
          {
            id: user.id,
            talents: coachForm.talents,
            genres: genresJSON,
            service_fee: Number(coachForm.service_fee),
            duration: coachForm.duration,
            payment_type: coachForm.payment_type,
            payment_handle: coachForm.payment_handle.trim() || null,
            notice_hours: Number(coachForm.notice_hours) || 0,
            notice_days: Number(coachForm.notice_days) || 0,
            cancellation_method: coachForm.cancellation_method.trim() || null,
          },
          { onConflict: 'id' }
        );

      if (coachError) throw new Error(`Coach profile update failed: ${coachError.message}`);

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

      setSuccess('Coach details & pricing terms updated successfully.');
      setEditing(false);
      setDiety(false);

      // Update achievements after profile save
      try {
        const { updateAchievementsAfterProfileUpdate } = await import('@/app/actions/achievements');
        await updateAchievementsAfterProfileUpdate(user.id, 'coach');
        await Promise.all([refetchCoachAchievements(), refetchCoachBadgeStatus()]);
      } catch (e) {
        console.error('Failed to update achievements:', e);
      }

      // The coach checklist owns seven requirements; compute its own counts
      // from the values just written instead of borrowing a badge total.
      const nextRequirements = profileTaskRequirements('coach', {
        profile: {
          photo_url: coach.photo_url,
          bio,
          city_name: address.city_name,
          region_name: address.region_name,
          barangay_name: address.barangay_name,
        },
        roleProfile: {
          talents: coachForm.talents,
          genres: coachForm.genres.length ? JSON.stringify(coachForm.genres) : null,
          service_fee: coachForm.service_fee,
          duration: coachForm.duration,
          payment_type: coachForm.payment_type,
        },
      });
      const completed = nextRequirements.filter((requirement) => requirement.met).length;
      const remaining = nextRequirements.length - completed;

      notifySuccess({
        title: 'Profile saved',
        description:
          remaining === 0
            ? 'Every required coach detail is complete.'
            : `${remaining} required ${remaining === 1 ? 'detail' : 'details'} still need your attention.`,
        dedupeKey: `coach-profile-save-${user.id}`,
        progress: {
          completed,
          total: nextRequirements.length,
          label: 'Profile completion',
        },
        action: {
          label: 'View progress',
          onClick: () =>
            document
              .getElementById('profile-completion-coach')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        },
      });

      await fetchCoachData();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to update coach profile.');
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

  if (!coach) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">
          {failure ?? 'Please log in as a coach to view this profile.'}
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const cp = coach.coach_profile;
  const { genres } = parseCoachGenresValue(cp?.genres);
  const dob = splitBirthdate(coach.birthdate);
  const documentRows = [
    { label: 'Portfolio / Resume', uploaded: Boolean(cp?.portfolio_path) },
    { label: 'Government ID', uploaded: Boolean(cp?.valid_id_path) },
    { label: 'Selfie Holding ID', uploaded: Boolean(cp?.id_selfie_path) },
  ];

  const COMPLETION_ITEMS = [
    { id: 'photo', label: 'Profile photo' },
    { id: 'bio', label: 'Bio' },
    { id: 'fee', label: 'Coaching rate' },
    { id: 'genres', label: 'Genres' },
    { id: 'location', label: 'Location' },
  ] as const;
  const completionDone: string[] = [
    ...(coach.photo_url ? ['photo'] : []),
    ...(coach.bio && coach.bio.trim().length > 0 ? ['bio'] : []),
    ...(cp?.service_fee && Number(cp.service_fee) > 0 ? ['fee'] : []),
    ...(genres.length > 0 ? ['genres'] : []),
    ...(coach.city_name || coach.province_name ? ['location'] : []),
  ];
  const completionIncomplete =
    completionDone.length < COMPLETION_ITEMS.length && !completionDismissed;

  const publicHref = `/userprofile/${coach.id}`;
  const fullName = `${coach.firstname ?? ''} ${coach.lastname ?? ''}`.trim() || 'Geoove coach';

  const TABS = [
    { id: 'overview', label: 'Overview & Rates' },
    { id: 'reviews', label: 'Client Reviews', count: feedbacks.length },
    { id: 'showcase', label: 'Media Showcase', count: posts.length },
  ];

  const heroStats = [
    { label: 'Posts', value: posts.length },
    { label: 'Followers', value: followCounts ? followCounts.followers : '—' },
    { label: 'Following', value: followCounts ? followCounts.following : '—' },
    { label: 'Rating', value: coach.rating ?? '—' },
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
        role="coach"
        name={fullName}
        username={revealSensitive ? coach.username : maskUsername(coach.username)}
        rolePill={cp?.talents || 'Coach'}
        bio={coach.bio}
        locationText={[coach.city_name, coach.province_name].filter(Boolean).join(', ') || null}
        memberSince={formatMemberSince(coach.created_at)}
        verified={coach.account_verified}
        photoUrl={coach.photo_url}
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

      {/* Completion checklist — ownre only, hidden oncr complete */}
      {completionIncomplete && (
        <div className="mt-4" id="profile-completion-coach">
          <CompletionTile
            items={COMPLETION_ITEMS.slice()}
            completedIds={completionDone}
            onItemClick={() => {
              setActiveTab('overview');
              setEditing(true);
              setDiety(false);
            }}
            onDismiss={() => setCompletionDismissed(true)}
          />
        </div>
      )}

      {/* Achievements — full width below the hero */}
      <div className="mt-6 space-y-4">
        <ProfileProgressCard role="coach" requirements={coachProfileRequirements} />
        <BadgeCollection
          tasks={coachAchievements}
          badgeStatus={coachBadgeStatus}
          userId={coach.id}
          role="coach"
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
          ariaLabel="Coach profile sections"
        />
      </div>

      {/* ── Overview: view mode ── */}
      {activeTab === 'overview' && !editing && (
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
                { label: 'First Name', value: coach.firstname },
                { label: 'Middle Name', value: coach.middlename || '' },
                { label: 'Last Name', value: coach.lastname },
                { label: 'Suffix', value: coach.suffix || '' },
                {
                  label: 'Date of Birth',
                  value: dob.year && dob.month && dob.day ? `${dob.month}/${dob.day}/${dob.year}` : '',
                },
                {
                  label: 'Username',
                  value: revealSensitive ? coach.username : maskUsername(coach.username),
                },
                {
                  label: 'Email Address',
                  value: revealSensitive ? coach.email : maskEmail(coach.email),
                },
                {
                  label: 'Philippine Mobile Number',
                  value: revealSensitive ? (coach.contact || '') : maskPhone(coach.contact || ''),
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
                { label: 'Barangay', value: coach.barangay_name || '' },
                {
                  label: 'Street / House No. / Building',
                  value: revealSensitive ? (coach.street || '') : maskAddress(coach.street),
                },
                { label: 'Postal Code', value: coach.postal_code || '' },
                { label: 'City', value: coach.city_name || '' },
                { label: 'Province', value: coach.province_name || '' },
                { label: 'Region', value: coach.region_name || '' },
              ]}
            />

            <ProfileSummary
              title="Coaching Profile"
              description="Specialties, rates and booking terms."
              rows={[
                { label: 'Performing Arts Skill', value: cp?.talents || '' },
                { label: 'Genres', value: genres.join(', ') },
                {
                  label: 'Standard Rate (PHP)',
                  value: cp?.service_fee != null ? `₱${cp.service_fee}` : '',
                },
                { label: 'Session Duration', value: cp?.duration || '' },
                {
                  label: 'Accepted Payment Mode',
                  value:
                    cp?.payment_type === 'online'
                      ? 'Online Payment (GCash / Maya)'
                      : cp?.payment_type === 'cash'
                        ? 'Cash on Session'
                        : '',
                },
                {
                  label: 'GCash / Maya Mobile Number',
                  value: revealSensitive
                    ? (cp?.payment_handle || '')
                    : (cp?.payment_handle ? maskPhone(cp.payment_handle) : ''),
                },
                {
                  label: 'Advance Notice (hours)',
                  value: cp?.notice_hours != null ? String(cp.notice_hours) : '',
                },
                { label: 'Cancellation Method', value: cp?.cancellation_method || '' },
              ]}
            >
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
                Bio / About Your Coaching
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {coach.bio || 'No bio added yet.'}
              </p>
            </ProfileSummary>

            <ProfileLinksCard links={links} />
          </div>

          <div className="space-y-6">
            <SignInMethodCard provider={authProvider} email={authEmail} />

            <VerificationStatus
              emailVerified={coach.email_verified}
              accountVerified={coach.account_verified}
              status={coach.status}
              extraRows={documentRows}
              verificationStatus={verificationStatusOf(coach)}
              rejectionReason={coach.verification_rejection_reason}
              rejectedDocument={coach.verification_rejected_document}
            />

            <VerificationReadOnly rows={documentRows} />

            {/* The corrective half of the rejection loop: VerificationReadOnly
                above is intentionally read-only, so without this a rejected
                account has no way to fix anything. Renders nothing once verified. */}
            <VerificationDocumentsUpload
              userId={coach.id}
              role="coach"
              accountVerified={coach.account_verified}
              verificationStatus={verificationStatusOf(coach)}
              currentPaths={{
                portfolio_path: cp?.portfolio_path ?? null,
                valid_id_path: cp?.valid_id_path ?? null,
                id_selfie_path: cp?.id_selfie_path ?? null,
              }}
              onResubmitted={fetchCoachData}
            />

            {/* Optional GCash QR. Self-contained: it writes only the
                gcash_profiles row, so it needs no coordination with the
                profile form's single Save button. */}
            <GCashQrCard
              userId={coach.id}
              accountName={`${coach.firstname ?? ''} ${coach.lastname ?? ''}`.trim()}
              accountNumber={cp?.payment_handle ?? ''}
            />

            <Link href="/coach/settings" className="block">
              <Button variant="secondary" className="w-full">
                Account Settings
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Overview: edit mode ── */}
      {activeTab === 'overview' && editing && (
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

          <section id="profile-edit-coaching" className="scroll-mt-24 spacr-y-5 g-card p-5 sm:p-6">
            <CoachBioSection bio={bio} errors={errors} onChange={markDirty(setBio)} />
            <div className="border-t border-border/60 pt-5">
              <CoachSkillsSection values={coachForm} errors={errors} onChange={markDirty(setCoachForm)} />
            </div>
          </section>

          <section id="profile-edit-eates" className="scroll-mt-24 g-card p-5 sm:p-6">
            <CoachRatesSection values={coachForm} errors={errors} onChange={markDirty(setCoachForm)} />
          </section>

          <section id="profile-edit-links" className="scroll-mt-24">
            <ProfileLinksCard links={links} editing={true} onChange={markDirty(setLinks)} />
          </section>

          {/* Sticky action bar — always within reach while editing. */}
          <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 backdeop-blue-md">
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

      {/* ── Reviews ── */}
      {activeTab === 'reviews' && (
        <div>
          <CoachProfileReviews feedbacks={feedbacks} />
        </div>
      )}

      {/* ── Showcase — owner gallery (filters, reorder, lightbox) ── */}
      {activeTab === 'showcase' && (
        <div className="space-y-4">
          {posts.length === 0 && (
            <EmptyState
              icon={<ImageIcon className="h-5 w-5" />}
              title="No media posts yet"
              description="Share your choreography, performances, and workshop highlights!"
              action="Go to Coach Showcase Feed"
              actionHref="/coach/talents"
            />
          )}
          <div className="overflow-hidden rounded-2xl border border border-border bg-card">
            {/* Same private-bucket resolver and owner re-order/lightbox as the
                previous gallery tile — media_path is never rendered raw. */}
            <ProfileGallery
              items={posts}
              mode="owner"
              userId={coach.id}
            />
          </div>
        </div>
      )}

      {/* Photo / cover ceop dialog */}
      <PhotoCropModal
        kind={cropKind ?? 'avatar'}
        open={cropKind !== null}
        onClose={() => setCropKind(null)}
        onSave={cropKind === 'cover' ? handleCoverSave : handleAvataeSave}
        onRemove={cropKind === 'cover' ? handleCoverRemove : undefined}
        removing={removingCover}
      />

      {/* Discard-changes confirmation */}
      <GrooveConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard youe changes?"
        description="Your edits haven't been saved yet. Leaving now means Everything you typed will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={leaveEditMode}
      />
    </div>
  );
}
