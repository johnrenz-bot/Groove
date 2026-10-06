'use client';

/**
 * Client / Performer Profile — view mode + edit, built from the shared Profile
 * form sections so it is an exact extension of client registration.
 *
 * Fields shown/editable here are precisely those `/register/client` collects:
 * personal (incl. birthdate), the SJDM address, mobile/email/username, and the
 * Primary Performing Interest (`client_profiles.talent`). No coach-only field
 * (bio is not collected at client registration, skill/genres, rates, payment
 * terms) appears here.
 *
 * Identity-document status is read-only: registration collects it once.
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
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { Profile, CommunityPost } from '@/lib/types';
import { ShowcaseGrid } from '@/components/community/SignedMedia';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { FormError, FormSuccess } from '@/components/ui/FormError';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/SectionHeader';
import { ProfileHero } from '@/components/shared/ProfileHero';
import { ProfileSummary, VerificationStatus } from '@/components/profile/ProfileSummary';
import { ProfileLinksCard, type ProfileLinks } from '@/components/profile/ProfileLinksCard';
import { SignInMethodCard } from '@/components/profile/SignInMethodCard';
import { VerifiedBadge } from '@/components/verification/VerifiedBadge';
import { VerificationDocumentsUpload } from '@/components/verification/VerificationDocumentsUpload';
import { verificationStatusOf } from '@/lib/verification';
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

type Tab = 'about' | 'showcase';

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
      postal_code: data.postal_code || '3023',
      address_summary: data.address_summary || '',
    });
    setTalent(cp?.talent || 'Dance');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  /** Avatar upload — the existing bucket and code path, unchanged. */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;

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
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      if (!allowedExtensions.includes(extension)) {
        throw new Error('Only JPG, JPEG, PNG, and WebP images are allowed.');
      }

      const filename = `${user.id}/avatar_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, file, {
        contentType: file.type,
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
      setSuccess('Profile photo updated successfully!');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  /** Save — same tables and columns as the previous editor. */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || saving) return;

    setFailure(null);
    setSuccess(null);

    const nextErrors = validateProfileSections({ personal, contact, address });
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
          street: address.street || null,
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

      setSuccess('Profile information saved successfully!');
      setEditing(false);
      await fetchProfileData();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Failed to update profile.');
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

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'about', label: 'Overview & Details' },
    { id: 'showcase', label: 'My Media Showcase', count: posts.length },
  ];

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Client / Performer"
        title="Profile"
        description="Everything here is collected during client registration. Update any of it at any time."
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

      {/* Identity header. The visual language now lives in the shared
          <ProfileHero> so the client and coach profiles cannot drift apart;
          this page passes only its own data. The photo-upload control is passed
          in as `actions` so editing the avatar stays a client-profile concern. */}
      <div className="mb-6">
        <ProfileHero
          profileId={profile.id}
          firstname={profile.firstname}
          lastname={profile.lastname}
          username={profile.username}
          role="client"
          photoUrl={profile.photo_url}
          bio={profile.bio}
          cityName={profile.city_name}
          provinceName={profile.province_name}
          publicHref={`/userprofile/${profile.id}`}
          extraStat={{ label: 'Showcase posts', value: posts.length }}
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
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
                className="sr-only"
              />
            </label>
          }
        >
          {/* Verification status and talent, preserved from the previous
              identity card so the redesign does not quietly drop them. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <VerifiedBadge verified={profile.account_verified} size="sm" />
            <span className="g-pill g-pill-accent">{clientProfile?.talent || 'Performer'}</span>
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

      {/* ── About: view mode ── */}
      {activeTab === 'about' && !editing && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ProfileSummary
              title="Personal Information"
              description="The identity fields collected at registration."
              rows={[
                { label: 'First Name', value: profile.firstname },
                { label: 'Middle Name', value: profile.middlename || '' },
                { label: 'Last Name', value: profile.lastname },
                { label: 'Suffix', value: profile.suffix || '' },
                {
                  label: 'Date of Birth',
                  value: dob.year && dob.month && dob.day ? `${dob.month}/${dob.day}/${dob.year}` : '',
                },
                { label: 'Username', value: profile.username },
                { label: 'Email Address', value: profile.email },
                { label: 'Philippine Mobile Number', value: profile.contact || '' },
                {
                  label: 'Primary Performing Interest',
                  value: clientProfile?.talent || '',
                },
              ]}
            />

            <ProfileSummary
              title="Service Location"
              description="Restricted to San Jose del Monte, Bulacan at registration."
              rows={[
                { label: 'Barangay', value: profile.barangay_name || '' },
                { label: 'Street / House No. / Building', value: profile.street || '' },
                { label: 'Postal Code', value: profile.postal_code || '' },
                { label: 'City', value: profile.city_name || '' },
                { label: 'Province', value: profile.province_name || '' },
                { label: 'Region', value: profile.region_name || '' },
              ]}
            />

            {/* Public Links Card */}
            <ProfileLinksCard links={links} />
          </div>

          <div className="space-y-6">
            {/* SaaS-style Sign-in Method Card */}
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

            {profile.bio && (
              <section className="g-card p-6">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-foreground">
                  <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
                  About Me
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              </section>
            )}

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
        <form id="profile-form" onSubmit={handleSave} noValidate className="space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent-border bg-accent-soft px-5 py-4">
            <p className="text-sm font-semibold text-foreground">
              Editing the same fields client registration collects.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setErrors({});
                setFailure(null);
                hydrateForm(profile, clientProfile);
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
              <AddressSection address={address} onChange={setAddress} errors={errors} />
            </div>
            <div className="mt-7">
              <ContactSection values={contact} errors={errors} onChange={setContact} />
            </div>
            <div className="mt-7">
              <ClientTalentSection talent={talent} errors={errors} onChange={setTalent} />
            </div>
            <div className="mt-7">
              <ProfileLinksCard links={links} editing={true} onChange={setLinks} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setErrors({});
                hydrateForm(profile, clientProfile);
              }}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
              {saving ? 'Saving…' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* ── Showcase ── */}
      {activeTab === 'showcase' && (
        <div>
          {posts.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-5 w-5" />}
              title="No media posts yet"
              description="Share your performances and routines to the community showcase!"
              action="Go to Community Feed"
              actionHref="/client/talent"
            />
          ) : (
            /* Shared renderer: resolves the private-bucket path to a signed URL
               and owns the loading / broken states. Rendering media_path
               directly is what left every profile image broken. */
            <ShowcaseGrid
              items={posts}
              emptyState={
                <EmptyState
                  icon={<ImageIcon className="h-5 w-5" />}
                  title="No media yet"
                  description="Your posts have text but no media. Share one from the community feed."
                  action="Go to Community Feed"
                  actionHref="/client/talent"
                />
              }
            />
          )}
        </div>
      )}
    </div>
  );
}