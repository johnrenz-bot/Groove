'use client';

/**
 * Coach Profile — view mode + edit, built from the shared Profile form sections
 * so it is an exact extension of coach registration.
 *
 * Fields shown/editable here are precisely those `/register/coach` collects:
 * personal (incl. birthdate), the SJDM address, mobile/email/username, bio,
 * skill + genres, service fee, duration, payment mode and handle. Verification
 * documents and verification status stay read-only — registration collects them
 * once and admins own their state.
 *
 * The existing Reviews and Showcase tabs keep their original behaviour.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Loader2,
  Pencil,
  Save,
  Sparkles,
  Star,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { FullCoach, Feedback, CommunityPost } from '@/lib/types';
import { ShowcaseGrid } from '@/components/community/SignedMedia';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { FormError, FormSuccess } from '@/components/ui/FormError';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/SectionHeader';
import { ProfileHero } from '@/components/shared/ProfileHero';
import { ProfileSummary, VerificationStatus } from '@/components/profile/ProfileSummary';
import { VerifiedBadge } from '@/components/verification/VerifiedBadge';
import { VerificationDocumentsUpload } from '@/components/verification/VerificationDocumentsUpload';
import { verificationStatusOf } from '@/lib/verification';
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
import type { AddressData } from '@/components/auth/AddressSelector';

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

type Tab = 'overview' | 'reviews' | 'showcase';

export default function CoachProfilePage() {
  const router = useRouter();

  const [coach, setCoach] = useState<FullCoach | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      postal_code: data.postal_code || '3023',
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

        const avgRating = reviews?.length
          ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
          : 5.0;

        const next = {
          ...profile,
          rating: Number(avgRating.toFixed(1)),
          rating_count: reviews?.length || 0,
        } as FullCoach;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  /** Avatar upload — the existing bucket and code path, unchanged. */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setPhotoUploading(true);
      setFailure(null);
      setSuccess(null);

      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw new Error(`Authentication error: ${authError.message}`);
      if (!user) throw new Error('Your session has expired. Please log in again.');
      if (!file.type.startsWith('image/')) throw new Error('Please select a valid image file.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.');

      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, file, {
        contentType: file.type,
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
      setSuccess('Coach profile photo updated successfully!');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
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
          street: address.street || null,
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

      const { error: coachError } = await supabase
        .from('coach_profiles')
        .upsert(
          {
            id: user.id,
            bio: bio.trim(),
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

      setSuccess('Coach details & pricing terms updated successfully!');
      setEditing(false);
      await fetchCoachData();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to update coach profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-text" />
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

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview & Rates' },
    { id: 'reviews', label: 'Client Reviews', count: feedbacks.length },
    { id: 'showcase', label: 'Media Showcase', count: posts.length },
  ];

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Coach"
        title="Profile"
        description="Everything here is collected during coach registration. Update any of it at any time."
        action={
          editing ? null : (
            <Button onClick={() => setEditing(true)} icon={<Pencil className="h-4 w-4" />}>
              Edit Profile
            </Button>
          )
        }
      />

      {failure && (
        <div className="mb-6">
          <FormError message={failure} onDismiss={() => setFailure(null)} />
        </div>
      )}
      {success && (
        <div className="mb-6">
          <FormSuccess>{success}</FormSuccess>
        </div>
      )}

      {/* Identity header. Shared <ProfileHero> — the same component the client
          profile uses, so the two cannot drift. Coach-only data (rating, review
          count, fee) is passed as its own stat and chips. */}
      <div className="mb-6">
        <ProfileHero
          profileId={coach.id}
          firstname={coach.firstname}
          lastname={coach.lastname}
          username={coach.username}
          role="coach"
          photoUrl={coach.photo_url}
          bio={coach.bio}
          cityName={coach.city_name}
          provinceName={coach.province_name}
          publicHref={`/userprofile/${coach.id}`}
          extraStat={{ label: 'Reviews', value: feedbacks.length }}
          actions={
            <label
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-accent-foreground transition hover:bg-accent-hover ${
                photoUploading ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              {photoUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {photoUploading ? 'Uploading…' : 'Change photo'}
              <span className="sr-only">Change profile photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
                className="sr-only"
              />
            </label>
          }
        >
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <VerifiedBadge verified={coach.account_verified} size="sm" />
            <span className="g-pill g-pill-accent">{cp?.talents || 'Performing Arts'}</span>
          </div>
        </ProfileHero>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-divider">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent-text'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview: view mode ── */}
      {activeTab === 'overview' && !editing && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ProfileSummary
              title="Personal Information"
              description="The identity fields collected at registration."
              rows={[
                { label: 'First Name', value: coach.firstname },
                { label: 'Middle Name', value: coach.middlename || '' },
                { label: 'Last Name', value: coach.lastname },
                { label: 'Suffix', value: coach.suffix || '' },
                {
                  label: 'Date of Birth',
                  value: dob.year && dob.month && dob.day ? `${dob.month}/${dob.day}/${dob.year}` : '',
                },
                { label: 'Username', value: coach.username },
                { label: 'Email Address', value: coach.email },
                { label: 'Philippine Mobile Number', value: coach.contact || '' },
              ]}
            />

            <ProfileSummary
              title="Service Location"
              description="Restricted to San Jose del Monte, Bulacan at registration."
              rows={[
                { label: 'Barangay', value: coach.barangay_name || '' },
                { label: 'Street / House No. / Building', value: coach.street || '' },
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
                { label: 'GCash / Maya Mobile Number', value: cp?.payment_handle || '' },
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
          </div>

          <div className="space-y-6">
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
        <form id="profile-form" onSubmit={handleSave} noValidate className="space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent-border bg-accent-soft px-5 py-4">
            <p className="text-sm font-semibold text-foreground">
              Editing the same fields coach registration collects.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setErrors({});
                setFailure(null);
                if (coach) hydrateForm(coach);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel
            </button>
          </div>

          <div className="g-card p-6">
            <PersonalSection values={personal} errors={errors} onChange={setPersonal} />
            <div className="mt-7">
              <AddressSection address={address} onChange={setAddress} />
            </div>
            <div className="mt-7">
              <ContactSection values={contact} errors={errors} onChange={setContact} />
            </div>
            <div className="mt-7">
              <CoachBioSection bio={bio} errors={errors} onChange={setBio} />
            </div>
            <div className="mt-7">
              <CoachSkillsSection values={coachForm} errors={errors} onChange={setCoachForm} />
            </div>
            <div className="mt-7">
              <CoachRatesSection values={coachForm} errors={errors} onChange={setCoachForm} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setErrors({});
                if (coach) hydrateForm(coach);
              }}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
              {saving ? 'Saving changes…' : 'Save Coach Profile'}
            </Button>
          </div>
        </form>
      )}

      {/* ── Reviews ── */}
      {activeTab === 'reviews' && (
        <div>
          {feedbacks.length === 0 ? (
            <EmptyState
              icon={<Star className="h-5 w-5" />}
              title="No reviews yet"
              description="Reviews and feedback from completed coaching appointments will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="g-card space-y-3 p-5 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-text">
                        {fb.user?.firstname?.[0]}
                      </span>
                      <p className="font-bold text-foreground">
                        {fb.user?.firstname} {fb.user?.lastname}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 font-bold text-accent-text">
                      <Star className="h-3.5 w-3.5 fill-accent" aria-hidden="true" />
                      {fb.rating} / 5
                    </span>
                  </div>
                  <p className="leading-relaxed text-muted-foreground italic">
                    &ldquo;{fb.comment}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Showcase ── */}
      {activeTab === 'showcase' && (
        <div>
          {posts.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-5 w-5" />}
              title="No media posts yet"
              description="Share your choreography, performances, and workshop highlights!"
              action="Go to Coach Showcase Feed"
              actionHref="/coach/talents"
            />
          ) : (
            /* Same shared renderer as the client profile and the public
               profile: it resolves the private-bucket path to a signed URL and
               owns the loading / broken states. */
            <ShowcaseGrid
              items={posts}
              emptyState={
                <EmptyState
                  icon={<ImageIcon className="h-5 w-5" />}
                  title="No media yet"
                  description="Your posts have text but no media. Share one from the showcase feed."
                  action="Go to Coach Showcase Feed"
                  actionHref="/coach/talents"
                />
              }
            />
          )}
        </div>
      )}
    </div>
  );
}