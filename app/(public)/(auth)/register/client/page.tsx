'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  RegistrationFormFields,
  RegistrationSuccess,
  RegistrationStepHeader,
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
import { Sparkles, AlertCircle, UploadCloud, FileText, X, CheckCircle, Shield } from 'lucide-react';
import { FormError } from '@/components/ui/FormError';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import { getFeaturedLocationsDisplay, getFeaturedLocationsAddressSummary } from '@/lib/config/featuredLocations';
import {
  DOCUMENT_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  formatFileSize,
  validateUploadFile,
} from '@/lib/uploadValidation';

// GCASH-QR (temporarily disabled)
// The optional GCash QR upload is hidden in this form. Its component and service
// are deliberately left in place and untouched — both are still used by the
// profile pages, and nothing here was deleted. Every removed piece below is
// fenced with "GCASH-QR (temporarily disabled)" so the block can be restored by
// uncommenting the original code, which is preserved in the project history.

export default function ClientRegistrationPage() {
  const [talent, setTalent] = useState('Dance');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1Data, setStep1Data] = useState<{
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
  } | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idFileError, setIdFileError] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
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

  // Blob URL cleanup for the ID preview.
  useEffect(() => {
    return () => {
      if (idPreview) URL.revokeObjectURL(idPreview);
    };
  }, [idPreview]);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileError = validateUploadFile(file, {
      allowedExtensions: DOCUMENT_EXTENSIONS,
      maxBytes: MAX_UPLOAD_BYTES,
      noun: 'ID document',
    });

    if (fileError) {
      setIdFileError(fileError);
      setIdFile(null);
      setIdPreview(null);
      if (e.target) e.target.value = '';
      return;
    }

    setIdFileError(null);
    setIdFile(file);
    setError(null);
    if (file.type.startsWith('image/')) {
      setIdPreview(URL.createObjectURL(file));
    } else {
      setIdPreview(null);
    }
  };

  const removeIdFile = () => {
    setIdFile(null);
    setIdFileError(null);
    setIdPreview(null);
  };

  const handleStep1Validated = (data: {
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
  }) => {
    setStep1Data(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Proceed = () => {
    if (!idFile) {
      setIdFileError('Please upload a valid government or student ID.');
      return;
    }
    setIdFileError(null);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    if (!step1Data) {
      setStep(1);
      return;
    }
    if (!idFile) {
      setStep(2);
      return;
    }
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions and Privacy Policy to register.');
      return;
    }

    const data = { personal: step1Data.personal, contact: step1Data.contact, address: step1Data.address, idFile };

  // Keep original handler body below but indented? We'll instead keep function and close later.
  // We'll patch the rest by replacing handleSubmit signature only; body references data. Need data defined. Already defined above as const data.
  // The original body starts after `if (loading) return;` with talent check. We'll leave it but it expects `data` in scope. Good.

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

  const CLIENT_STEPS = [
    { id: 1, label: 'Basic info', detail: 'Personal & account' },
    { id: 2, label: 'Verify ID', detail: 'ID upload' },
    { id: 3, label: 'Review', detail: 'Terms & submit' },
  ] as const;

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
      imagePanelTitle="Your stage awaits."
      imagePanelDescription="Join performing artists across the Philippines. Connect with verified coaches, book studios, and sign digital contracts — all in one place."
      imagePanelImage="/image/login/LoginPage.jpeg"
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
        status={`Step ${step} of ${CLIENT_STEPS.length}`}
        percent={(step / CLIENT_STEPS.length) * 100}
        activeId={step}
        onSelect={(id) => {
          if (loading) return;
          // Only allow jumping to completed steps.
          if (id < step) setStep(id as 1 | 2 | 3);
        }}
        ariaLabel="Performer registration steps"
        items={CLIENT_STEPS.map((s) => ({
          id: s.id,
          label: s.label,
          detail: s.detail,
          disabled:
            (s.id === 2 && !step1Data) ||
            (s.id === 3 && (!step1Data || !idFile)),
        }))}
      />

      {error && <FormError message={error} className="mb-5" />}

      {/* Fast Track with Google */}
      {step === 1 && (
        <>
          <div className="reg-oauth-card mb-4">
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="reg-oauth-icon" aria-hidden="true">⚡</span>
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
        </>
      )}

      {/* ─── STEP 1: Basic Information ─── */}
      {step === 1 && (
        <div data-client-step="1" className="space-y-6">
          <RegistrationFormFields
            role="client"
            loading={false}
            externalError={null}
            showSubmitButton={false}
            onValidatedData={handleStep1Validated}
            initialPersonal={step1Data?.personal}
            initialContact={step1Data?.contact}
            initialAddress={step1Data?.address}
            extraFields={
              <div className="reg-field">
                <label className="g-label" htmlFor="reg-talent">
                  Primary Performing Interest <span className="text-accent-text" aria-hidden="true">*</span>
                </label>
                <select
                  id="reg-talent"
                  value={talent}
                  onChange={(e) => setTalent(e.target.value)}
                  required
                  aria-describedby="reg-talent-hint"
                  className="g-input"
                >
                  {CLIENT_TALENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p id="reg-talent-hint" className="g-field-hint">
                  Used to show you relevant coaches and sessions first.
                </p>
              </div>
            }
            documentSection={<></>}
          />
          <Button
            type="button"
            size="lg"
            className="h-12 w-full font-bold"
            trailingIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => {
              const container = document.querySelector('[data-client-step="1"]');
              const f = container?.querySelector('form');
              if (f) f.requestSubmit();
              else setError('Something went wrong loading this step. Please refresh and try again.');
            }}
          >
            Next: upload ID
          </Button>
        </div>
      )}

      {/* ─── STEP 2: Identity Verification ─── */}
      {step === 2 && (
        <div data-client-step="2" className="space-y-6 animate-in fade-in duration-200">
          <RegistrationStepHeader
            step={2}
            total={3}
            icon={Shield}
            title="Verify your identity"
            description="Upload a government-issued or student ID to verify your artist status."
          />

          <div
            className={cn(
              'reg-upload-card',
              idFile && 'reg-upload-card--filled',
              idFileError && 'reg-upload-card--error'
            )}
          >
            <input
              ref={idInputRef}
              type="file"
              accept={DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
              onChange={handleIdChange}
              aria-label="Upload identity document"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            {idFile ? (
              <div className="flex flex-col items-center gap-4">
                {idPreview ? (
                  <div className="relative overflow-hidden rounded-xl border border-border bg-muted/60 p-1.5 shadow-sm">
                    <img
                      src={idPreview}
                      alt="Preview of the uploaded ID document"
                      className="max-h-44 rounded-lg object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-accent-text shadow-sm">
                    <FileText className="h-7 w-7" aria-hidden="true" />
                  </div>
                )}
                <div className="max-w-full text-center">
                  <p className="mx-auto max-w-xs truncate text-sm font-semibold text-foreground">
                    {idFile.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatFileSize(idFile.size)} · Ready for verification
                  </p>
                </div>
                <div className="relative z-20 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      idInputRef.current?.click();
                    }}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent-border hover:bg-accent-soft hover:text-accent-text"
                  >
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeIdFile();
                    }}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2 text-center text-muted-foreground">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-accent-text shadow-sm transition-transform group-hover:scale-105">
                  <UploadCloud className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Click to upload your ID document</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Passport, UMID, Driver&apos;s License, Postal ID, or Student ID
                  </p>
                </div>
                <div className="reg-upload-badges">
                  <span>PDF</span>
                  <span>JPG</span>
                  <span>PNG</span>
                  <span>Max 5 MB</span>
                </div>
              </div>
            )}
          </div>
          {idFileError && (
            <p className="g-field-error" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{idFileError}</span>
            </p>
          )}

          <div className="reg-actions">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full sm:w-1/3"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-12 w-full sm:flex-1"
              trailingIcon={<Sparkles className="h-4 w-4" />}
              onClick={handleStep2Proceed}
            >
              Next: review &amp; submit
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Review & Submit ─── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} noValidate className="space-y-6 animate-in fade-in duration-200">
          <RegistrationStepHeader
            step={3}
            total={3}
            icon={CheckCircle}
            title="Review & submit"
            description="Confirm the agreement below, then create your account."
          />

          <div className="reg-terms-card">
            <input
              type="checkbox"
              id="clientTerms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="g-checkbox mt-0.5"
            />
            <label
              htmlFor="clientTerms"
              className="cursor-pointer select-none text-sm leading-relaxed text-muted-foreground"
            >
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-accent-text hover:underline underline-offset-2">
                Terms &amp; Conditions
              </Link>{' '}
              and the{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-accent-text hover:underline underline-offset-2">
                Privacy Policy
              </Link>{' '}
              for Groove System.
            </label>
          </div>

          <div className="reg-actions">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full sm:w-1/3"
              disabled={loading}
              onClick={() => setStep(2)}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="h-12 w-full font-bold sm:flex-1"
              trailingIcon={!loading ? <Sparkles className="h-4 w-4" /> : undefined}
            >
              {loading ? submitStage || 'Creating account…' : 'Complete Client Registration'}
            </Button>
          </div>
          {loading && (
            <p className="text-center text-xs text-muted-foreground" role="status" aria-live="polite">
              Keep this tab open while we finish setting up your account.
            </p>
          )}
        </form>
      )}
    </AuthLayout>
  );
}
