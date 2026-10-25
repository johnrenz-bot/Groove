'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  RegistrationFormFields,
  RegistrationSuccess,
  PersonalData,
  ContactAccountData,
} from '@/components/auth/RegistrationFormFields';
import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import {
  AddressData,
  composeStreetLine,
  getServiceLocationMode,
} from '@/components/auth/AddressSelector';
import {
  CLIENT_TALENT_OPTIONS,
  isClientTalentOption,
  normalizeContactForStorage,
} from '@/lib/profileFields';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { GoogleRegisterButton } from '@/components/shared/GoogleRegisterButton';
import { Sparkles } from 'lucide-react';
import { getFeaturedLocationsDisplay, getFeaturedLocationsAddressSummary } from '@/lib/config/featuredLocations';

// GCASH-QR (temporarily disabled)
// The optional GCash QR upload is hidden in this form. Its component and service
// are deliberately left in place and untouched — both are still used by the
// profile pages, and nothing here was deleted. Every removed piece below is
// fenced with "GCASH-QR (temporarily disabled)" so the block can be restored by
// uncommenting the original code, which is preserved in the project history.

/**
 * The performer form is a single page, so its progress rail maps to the five
 * numbered sections rendered by RegistrationFormFields. The ids below are the
 * heading ids that component already emits for its aria-labelledby wiring.
 */
const CLIENT_SECTIONS = [
  { id: 1, label: 'About you', detail: 'Personal details', target: 'reg-legend-personal' },
  { id: 2, label: 'Location', detail: 'Service area', target: 'reg-legend-address' },
  { id: 3, label: 'Account', detail: 'Contact & login', target: 'reg-legend-contact' },
  { id: 4, label: 'Verify ID', detail: 'ID upload', target: 'reg-legend-id' },
  { id: 5, label: 'Review', detail: 'Terms & submit', target: 'reg-legend-terms' },
] as const;

export default function ClientRegistrationPage() {
  const [talent, setTalent] = useState('Dance');
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitStage, setSubmitStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    firstname: string;
    username: string;
    email: string;
    talent: string;
    location: string;
    locationDisplay: string;
    /** True when Supabase created the user but requires email confirmation. */
    verificationRequired: boolean;
    // GCASH-QR (temporarily disabled): restore `gcashWarning?: string | null;`
    // here when the optional QR upload is re-enabled.
  } | null>(null);

  // GCASH-QR (temporarily disabled): the optional QR upload state lived here —
  // `gcashName`, `gcashNumber`, `gcashNotes`, `gcashFile` and the derived
  // `wantsGCash` flag. The file was held in state rather than uploaded from the
  // form because the member has no session yet and the `payment-qr-codes`
  // policies are TO authenticated; the upload ran after signUp() returned a
  // session. Reinstate these five hooks exactly as they were to restore.

  /**
   * Keep the section rail in sync with the part of the single-page form the
   * visitor is reading. The headings are rendered by RegistrationFormFields, so
   * they are looked up after mount rather than passed down as refs.
   */
  useEffect(() => {
    const elements = CLIENT_SECTIONS.map((section) =>
      document.getElementById(section.target)
    ).filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!current) return;

        const section = CLIENT_SECTIONS.find(
          (item) => item.target === current.target.id
        );
        if (section) setActiveSection(section.id);
      },
      { rootMargin: '-18% 0px -66% 0px', threshold: 0 }
    );

    elements.forEach((element) => observer.observe(element));

    // The final section is short, so it can never travel into the observer's
    // narrow active band before the page bottoms out. Treat "at the bottom" as
    // the review step explicitly; scrolling back up lets the observer resume.
    const lastSection = CLIENT_SECTIONS[CLIENT_SECTIONS.length - 1];
    const handleScroll = () => {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;
      if (atBottom) setActiveSection(lastSection.id);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const goToSection = (id: number) => {
    const section = CLIENT_SECTIONS.find((item) => item.id === id);
    if (!section) return;
    setActiveSection(id);
    document.getElementById(section.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (data: {
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
    idFile: File | null;
  }) => {
    if (loading) return;

    // Defence in depth: the select only renders current options, but a stale or
    // tampered value (for example a retired "Musical Instruments" choice) must
    // never reach client_profiles.
    if (!isClientTalentOption(talent)) {
      setError('Please choose a current primary performing interest.');
      return;
    }

    setError(null);
    setLoading(true);
    setSubmitStage('Creating your account…');

    // Tracks whether the auth row exists, so a later failure (profile, upload,
    // sign-in for the upload) never reads as "try the whole signup again".
    let accountCreated = false;

    try {
      const supabase = createClient();
      const random4Digit = Math.floor(1000 + Math.random() * 9000).toString();
      const birthdate = `${data.personal.birth_year}-${String(data.personal.birth_month).padStart(2, '0')}-${String(data.personal.birth_day).padStart(2, '0')}`;

      // Shared with the coach form so both flows store the identical value.
      const formattedContact = normalizeContactForStorage(data.contact.contact);


      // Supabase Auth Sign Up
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: data.contact.email.trim(),
        password: data.contact.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: 'client',
            custom_id: random4Digit,
            firstname: data.personal.firstname.trim(),
            middlename: data.personal.middlename.trim() || null,
            lastname: data.personal.lastname.trim(),
            username: data.contact.username.trim().toLowerCase(),
            contact: formattedContact,
            talent: talent,
          },
        },
      });

      if (authErr || !authData.user) {
        // Surface the real reason: a rate limit, a duplicate email, or a
        // database/trigger failure each need different action from the user.
        if (authErr) {
          const status = (authErr as { status?: number }).status;
          const code = (authErr as { code?: string }).code;
          const message = authErr.message || '';

          // over_email_send_rate_limit is the one 429 that must never read as a
          // generic failure: Supabase Auth refused to send the confirmation
          // email because this address is over the hourly send quota. The account
          // was NOT created, so the user must wait, not resubmit.
          //
          // There is deliberately no retry here. Retrying a rate-limited send
          // extends the lockout window; only the wait clears it.
          if (
            code === 'over_email_send_rate_limit' ||
            /email rate limit exceeded/i.test(message) ||
            /over_email_send_rate_limit/i.test(message)
          ) {
            throw new Error(
              'Too many confirmation emails have been requested for this address. ' +
                'Supabase blocked further sends for a short while. Your account was not created — ' +
                'please wait about an hour before trying again, or use a different email address.'
            );
          }

          if (status === 429) {
            throw new Error(
              'Too many registration attempts. Please wait a few minutes and try again.'
            );
          }
          if (status === 422 || /already/i.test(authErr.message)) {
            throw new Error(
              'That email address is already registered. Please sign in instead.'
            );
          }
          if (/database error saving new user/i.test(authErr.message)) {
            throw new Error(
              `Registration could not be completed because the server rejected the new user record. Server said: ${authErr.message}`
            );
          }
        }
        throw new Error(
          authErr?.message || 'Registration failed. Username or email may already be registered.'
        );
      }

      // Supabase deliberately returns an obfuscated user with no identities when
      // an address already exists and email confirmation is enabled. Treating
      // that as a new signup would show a success screen for an account this
      // visitor cannot use.
      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        throw new Error(
          'That email address is already registered. Please sign in instead, or use a different email address.'
        );
      }

      accountCreated = true;

      // Welcome email. Best-effort only: the account already exists at this point,
      // so a delivery failure must not abort the rest of the registration or turn a
      // successful signup into an error for the user. The inner catch is what makes
      // that true for a network-level rejection, which `!response.ok` never sees --
      // without it the throw would land in the outer catch below as a signup failure.
      // The recipient is the address Supabase actually created the user with.
      if (authData.user?.email) {
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: authData.user.email,
              name: data.personal.firstname.trim(),
            }),
          });

          if (!response.ok) {
            // Best-effort diagnostic: log the HTTP status and any detail the
            // route returned. Registration already succeeded at this point.
            try {
              const body = await response.json().catch(() => ({}));
              console.error(
                `[client-reg] Welcome email not sent. HTTP ${response.status}.` +
                  (body?.detail ? ` detail="${body.detail}"` : '') +
                  (body?.error ? ` error="${body.error}"` : '')
              );
            } catch {
              console.error(`[client-reg] Welcome email not sent. HTTP ${response.status}.`);
            }
          }
        } catch {
          // Swallowed on purpose; see the note above.
        }
      }

      // The account now exists. From here on the user is no longer anonymous, so
      // the ID upload runs against their own auth.uid() folder and the Storage
      // policy can enforce that ownership.
      const userId = authData.user.id;
      const location =
        getServiceLocationMode(data.address) === 'other'
          ? data.address.address_summary
          : getFeaturedLocationsAddressSummary();
      const locationDisplay =
        getServiceLocationMode(data.address) === 'other'
          ? [data.address.city_name, data.address.province_name || data.address.region_name]
              .filter(Boolean)
              .join(', ')
          : getFeaturedLocationsDisplay();

      // signUp() returns a session when email confirmation is disabled. When it
      // is enabled the JWT is null, and Storage writes would be evaluated as
      // anonymous. Do not attempt the upload in that case: report the verified
      // backend state instead of pretending the account is fully set up.
      const verificationRequired =
        authData.session === null && !authData.user.email_confirmed_at;

      if (verificationRequired) {
        setSuccessData({
          firstname: data.personal.firstname.trim(),
          username: data.contact.username.trim().toLowerCase(),
          email: data.contact.email.trim(),
          talent,
          location,
          locationDisplay,
          verificationRequired: true,
        });
        setRegisteredSuccess(true);
        return;
      }

      if (authData.session === null) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: data.contact.email.trim(),
          password: data.contact.password,
        });

        if (signInErr || !signInData.session) {
          // Supabase's accurate "email not confirmed" response means the account
          // exists but cannot upload yet. That is a pending-verification state,
          // not a signup failure.
          if (/email not confirmed/i.test(signInErr?.message ?? '')) {
            setSuccessData({
              firstname: data.personal.firstname.trim(),
              username: data.contact.username.trim().toLowerCase(),
              email: data.contact.email.trim(),
              talent,
              location,
              locationDisplay,
              verificationRequired: true,
            });
            setRegisteredSuccess(true);
            return;
          }

          throw new Error(
            'Your account was created, but we could not sign you in to upload your ID document. ' +
              'Please sign in and upload your ID from your profile.'
          );
        }
      }

      // The Storage path of the uploaded ID. Stored in client_profiles as-is;
      // signed URLs are generated on demand for display and never persisted.
      let validIdPath: string | null = null;

      // `barangay_code` is the one address value that can exceed its column:
      // AddressSelector builds it as "<city_code>-<slugified barangay name>"
      // (16-35 chars) against VARCHAR(20), so 37 of the 60 SJDM barangays
      // overflow it. The slug is a synthetic key, not a PSGC code, and nothing
      // reads it back, so the city-code prefix is stored instead. The barangay
      // itself is preserved losslessly in barangay_name / address_summary.
      const rawBarangayCode = data.address.barangay_code;
      const barangayCode =
        rawBarangayCode && rawBarangayCode.length <= 20
          ? rawBarangayCode
          : `${data.address.city_code}-`;

      // Explicitly upsert full profile details so the record is complete.
      // This runs BEFORE the ID upload. The profile row is the one thing that
      // must not depend on Storage succeeding: with the upload first, an upload
      // failure aborted the whole handler and left only the trigger's partial
      // row, losing the name, DOB, contact and address the user had entered.
      setSubmitStage('Saving your profile…');
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        custom_id: random4Digit,
        role: 'client',
        firstname: data.personal.firstname.trim(),
        middlename: data.personal.middlename.trim() || null,
        lastname: data.personal.lastname.trim(),
        suffix: data.personal.suffix.trim() || null,
        birthdate,
        contact: formattedContact,
        email: data.contact.email.trim(),
        username: data.contact.username.trim().toLowerCase(),
        status: 'offline',
        address_summary: data.address.address_summary,
        region_code: data.address.region_code,
        province_code: data.address.province_code,
        city_code: data.address.city_code,
        barangay_code: barangayCode,
        region_name: data.address.region_name,
        province_name: data.address.province_name,
        city_name: data.address.city_name,
        barangay_name: data.address.barangay_name,
        // `profiles.street` (VARCHAR 160) holds the street line and the
        // subdivision joined, so the stored value is unchanged from before the
        // two fields were separated. composeStreetLine() is the single
        // definition of that join.
        street: composeStreetLine(data.address.street, data.address.subdivision) || null,
        postal_code: data.address.postal_code || null,
        terms_accepted: true,
        email_verified: false,
        account_verified: false,
      });

      if (profileErr) {
        throw new Error(`Your profile could not be saved: ${profileErr.message}`);
      }

      // The ID is required for a client, so it is never optional here: a signup that
      // reached this point without a file would persist valid_id_path = NULL and
      // leave the account unverifiable. RegistrationFormFields already blocks
      // submit without one (the `!documentSection && !idFile` check), so this is
      // a guard against a future caller that skips the form, not a new rule.
      if (!data.idFile) {
        throw new Error(
          'Please upload a valid government or student ID. Your account was created, ' +
            'but it cannot be verified without an ID document.'
        );
      }

      // Upload the ID under the user's own folder. A failed upload throws: a
      // synthetic path would store valid_id_path pointing at a file that does
      // not exist, which surfaces later as an unexplained broken document.
      const fileExt = (data.idFile.name.split('.').pop() || 'jpg').toLowerCase();
      const safeExt = /^[a-z0-9]{1,5}$/.test(fileExt) ? fileExt : 'jpg';
      const fileName = `clients/${userId}/${Date.now()}_${random4Digit}.${safeExt}`;

      setSubmitStage('Uploading your ID securely…');
      try {
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, data.idFile, { upsert: false });

        if (storageErr) {
          throw new Error(`Could not upload your ID document: ${storageErr.message}`);
        }

        if (!storageData?.path) {
          throw new Error(
            'Could not upload your ID document: storage did not return a file path.'
          );
        }

        // The STORAGE PATH is what gets stored — never a signed URL.
        validIdPath = storageData.path;
      } catch (storageErr) {
        // The account is already created at this point, so do not delete it and
        // do not present this as a registration failure the user can retry from
        // scratch. The outer catch adds the account-created context.
        throw storageErr instanceof Error
          ? storageErr
          : new Error('Could not upload your ID document. Please try again.');
      }

      // client_profiles has exactly three real columns (id, talent, valid_id_path);
      // nothing else may be sent, and valid_id_path is the raw Storage path.
      setSubmitStage('Finalizing your account…');
      const { error: clientProfileErr } = await supabase.from('client_profiles').upsert({
        id: userId,
        talent: talent,
        valid_id_path: validIdPath,
      });


      if (clientProfileErr) {
        throw new Error(`Your client details could not be saved: ${clientProfileErr.message}`);
      }

      // GCASH-QR (temporarily disabled): the optional GCash attach step that ran
      // here is removed. It only ran when the member actually filled the block in
      // and never threw, so a member who left it blank is unaffected. To restore,
      // re-add the `attachGCashQrAfterSignup` call guarded by `wantsGCash` and
      // pass its result back as `gcashWarning`.

      setSuccessData({
        firstname: data.personal.firstname.trim(),
        username: data.contact.username.trim().toLowerCase(),
        email: data.contact.email.trim(),
        talent,
        location,
        locationDisplay,
        verificationRequired: false,
      });
      setRegisteredSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      const alreadyExplainsAccount = /account was created|account exists/i.test(message);
      setError(
        accountCreated && !alreadyExplainsAccount
          ? `${message} Your account was created — sign in and finish setup from your profile.`
          : message
      );
    } finally {
      setLoading(false);
      setSubmitStage(null);
    }
  };

  if (registeredSuccess && successData) {
    return (
      <RegistrationSuccess
        firstname={successData.firstname}
        role="client"
        details={[
          { label: 'Username', value: successData.username },
          { label: 'Email', value: successData.email },
          { label: 'Primary Interest', value: successData.talent },
          { label: 'Location', value: successData.location },
          ...(successData.verificationRequired
            ? [{ label: 'ID document', value: 'Upload after sign-in', highlight: true }]
            : []),
        ]}
        verificationRequired={successData.verificationRequired}
        email={successData.email}
        verificationNote={
          successData.verificationRequired
            ? 'Then sign in and upload your ID from your profile to finish verification.'
            : undefined
        }
        // GCASH-QR (temporarily disabled): the conditional "GCash QR — not saved"
        // detail row and the matching `warning` prop that rendered beside it were
        // removed here. Restore both alongside `gcashWarning` above.
        message={
          successData.verificationRequired
            ? 'Your account is not active yet. Confirm your email first, then sign in to upload your ID and finish setup.'
            : `You can now sign in to discover verified coaches, book live rehearsal sessions, and explore performing arts in ${successData.locationDisplay}.`
        }
      />
    );
  }

  return (
    <AuthLayout
      wide
      registration
      eyebrow={
        <span className="au-eyebrow">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Client / Performer Registration
        </span>
      }
      title="Join Groove System"
      subtext="Create your performer account to connect with verified coaches and book rehearsal sessions in San Jose del Monte and other locations in the Philippines."
      // Image panel props for potential split mode or future enhancement
      imagePanelTitle="Your stage awaits."
      imagePanelDescription="Join performing artists across the Philippines. Connect with verified coaches, book studios, and sign digital contracts — all in one place."
      imagePanelImage="/image/bg/hero-stage.jpg"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-accent-text underline-offset-4 transition-colors hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <RegistrationProgress
        className="mb-5"
        label="Performer registration"
        status={`Section ${activeSection} of ${CLIENT_SECTIONS.length}`}
        percent={(activeSection / CLIENT_SECTIONS.length) * 100}
        activeId={activeSection}
        onSelect={goToSection}
        ariaLabel="Performer registration sections"
        items={CLIENT_SECTIONS.map((section) => ({
          id: section.id,
          label: section.label,
          detail: section.detail,
        }))}
      />

      {/* Fast Track with Google. The provider remains disabled in the shared
          button; the copy says so rather than promising an unavailable shortcut. */}
      <div className="reg-oauth-card mb-4">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="reg-oauth-icon" aria-hidden="true">
              ⚡
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fast-track with Google</h3>
              <p className="text-[11px] text-muted-foreground">Optional shortcut</p>
            </div>
          </div>
          <span className="reg-soft-badge">Coming soon</span>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Google sign-up is not available yet. Use the full registration form below to create
          your performer account and upload the ID required for verification.
        </p>
        <GoogleRegisterButton role="client" label="Continue with Google as Performer" />
      </div>

      <div className="reg-divider my-4">
        <span>or complete full registration with ID document</span>
      </div>

      <RegistrationFormFields
        role="client"
        loading={loading}
        loadingLabel={submitStage ?? undefined}
        externalError={error}
        onSubmit={handleSubmit}
        submitLabel="Complete Client Registration"
        extraFields={
          <div>
            <label className="g-label" htmlFor="reg-talent">
              Primary Performing Interest <span className="text-accent-text" aria-hidden="true">*</span>
            </label>
            <select
              id="reg-talent"
              value={talent}
              onChange={(e) => setTalent(e.target.value)}
              required
              className="g-input"
            >
              {CLIENT_TALENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* GCASH-QR (temporarily disabled): the optional GCash QR upload block is hidden
          here. It sat outside RegistrationFormFields because the component owns
          its own <form> element and was never part of the shared field contract,
          so removing it affects no other field and no other validation. To
          restore, re-render <GCashRegistrationSection audience="client" … />
          against the state hooks near the top of this component. */}
    </AuthLayout>
  );
}
