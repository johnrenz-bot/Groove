'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  RegistrationFormFields,
  RegistrationSuccess,
  PersonalData,
  ContactAccountData,
} from '@/components/auth/RegistrationFormFields';
import { AddressData } from '@/components/auth/AddressSelector';
import { CLIENT_TALENT_OPTIONS, normalizeContactForStorage } from '@/lib/profileFields';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { GoogleRegisterButton } from '@/components/shared/GoogleRegisterButton';
import { Sparkles } from 'lucide-react';

export default function ClientRegistrationPage() {
  const [talent, setTalent] = useState('Dance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True when signUp() succeeded but the ID upload did not. The account exists in
  // that state, so the message must not read as a retryable signup failure.
  const [accountCreatedWithoutId, setAccountCreatedWithoutId] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    firstname: string;
    username: string;
    email: string;
    talent: string;
  } | null>(null);

  const handleSubmit = async (data: {
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
    idFile: File | null;
  }) => {
    if (loading) return;
    setError(null);
    setAccountCreatedWithoutId(false);
    setLoading(true);

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

      // The account now exists. From here on the user is no longer anonymous, so
      // the ID upload runs against their own auth.uid() folder and the Storage
      // policy can enforce that ownership.
      const userId = authData.user.id;

      // signUp() only returns a session when email confirmation is disabled. When
      // it is enabled the JWT is null and any Storage write would be evaluated as
      // anon, so sign in explicitly to obtain the session the upload requires.
      const hasSession = authData.session !== null;
      if (!hasSession) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: data.contact.email.trim(),
          password: data.contact.password,
        });

        if (signInErr || !signInData.session) {
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
        street: data.address.street || null,
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
        // scratch: tell them the account exists and the ID still needs upload.
        setAccountCreatedWithoutId(true);
        throw storageErr instanceof Error
          ? storageErr
          : new Error('Could not upload your ID document. Please try again.');
      }

      // client_profiles has exactly three real columns (id, talent, valid_id_path);
      // nothing else may be sent, and valid_id_path is the raw Storage path.
      const { error: clientProfileErr } = await supabase.from('client_profiles').upsert({
        id: userId,
        talent: talent,
        valid_id_path: validIdPath,
      });


      if (clientProfileErr) {
        throw new Error(`Your client details could not be saved: ${clientProfileErr.message}`);
      }

      setSuccessData({
        firstname: data.personal.firstname.trim(),
        username: data.contact.username.trim().toLowerCase(),
        email: data.contact.email.trim(),
        talent,
      });
      setRegisteredSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(
        accountCreatedWithoutId
          ? `${message} Your account was created successfully — sign in and upload your ID from your profile.`
          : message
      );
    } finally {
      setLoading(false);
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
          { label: 'Location', value: 'San Jose del Monte, Bulacan' },
        ]}
        message="You can now sign in to discover verified coaches, book live rehearsal sessions, and explore performing arts in San Jose del Monte."
      />
    );
  }

  return (
    <AuthLayout
      wide
      eyebrow={
        <span className="g-eyebrow">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Client / Performer Registration
        </span>
      }
      title="Join Groove System"
      subtext="Create your performer account to connect with verified coaches and book rehearsal sessions in San Jose del Monte."
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
      <RegistrationFormFields
        role="client"
        loading={loading}
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

      {/* Google sign-up sits below the email/password form and does not touch
          it: the form keeps its own state and submit handler. */}
      <div className="mt-6">
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-subtle-foreground">
            <span className="bg-surface px-2">or</span>
          </div>
        </div>
        <GoogleRegisterButton role="client" label="as a Client" />
        <p className="mt-2 text-center text-[11px] text-subtle-foreground">
          Google accounts are created without a verification ID. You can upload one later from your
          profile.
        </p>
      </div>
    </AuthLayout>
  );
}
