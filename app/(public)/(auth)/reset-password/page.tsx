'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { FormError } from '@/components/ui/FormError';
import { PasswordInput } from '@/components/ui/FormField';
import { AuthButton, SuccessTile } from '@/components/auth/ui/AuthUI';
import { ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has an active session (e.g. from recovery link or callback)
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setHasSession(!!session);
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errs: { password?: string; confirm?: string } = {};
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }
    if (password !== passwordConfirmation) {
      errs.confirm = 'Passwords do not match.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password. Please try again or request a new reset link.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const backToSignIn = (
    <Link href="/login" className="av-back">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Back to login</span>
    </Link>
  );

  if (success) {
    return (
      <AuthLayout
        title="Password updated"
        subtext="Your new password is active."
        backLink={backToSignIn}
      >
        <div className="av-state">
          <SuccessTile />
          <div className="av-state-copy">
            <h2 className="av-state-title">You&apos;re all set</h2>
            <p className="av-state-text">
              Your password has been updated successfully. Sign in with your new credentials to
              continue.
            </p>
          </div>
          <Link href="/login" className="av-btn av-btn--primary av-btn--block">
            <span className="av-btn-label">Continue to sign in</span>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtext="Choose a secure password you haven't used before."
      backLink={backToSignIn}
    >
      {hasSession === false && (
        <FormError message="This reset link is invalid or has expired. Request a new link to continue." />
      )}

      <FormError message={error} />

      <form onSubmit={handleResetPassword} noValidate className="av-form-fields">
        <PasswordInput
          label="New Password"
          name="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
          }}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          error={fieldErrors.password}
          showStrength
        />

        <PasswordInput
          label="Confirm New Password"
          name="password_confirmation"
          value={passwordConfirmation}
          onChange={(e) => {
            setPasswordConfirmation(e.target.value);
            if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined }));
          }}
          autoComplete="new-password"
          placeholder="Repeat your new password"
          required
          error={fieldErrors.confirm}
          hint="Both passwords must match."
        />

        <AuthButton type="submit" loading={loading} className="av-btn--block">
          {loading ? 'Updating password…' : 'Save new password'}
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
