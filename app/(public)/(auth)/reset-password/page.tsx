'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { FormError, FormSuccess } from '@/components/ui/FormError';
import { PasswordInput } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

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
    <Link
      href="/login"
      className="text-xs font-medium text-accent-text hover:underline underline-offset-4"
    >
      Back to Sign In
    </Link>
  );

  if (success) {
    return (
      <AuthLayout
        centered
        title="Password updated"
        subtext="Your new password is active."
        footer={backToSignIn}
      >
        <div className="space-y-5 text-center">
          <FormSuccess>
            Your password has been updated successfully. You can now sign in with your new
            credentials.
          </FormSuccess>
          <Link href="/login" className="block w-full">
            <Button size="lg" pill={false} className="h-12 w-full">
              Continue to Sign In
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      centered
      title="Set a new password"
      subtext="Choose a secure password you haven't used before."
      footer={backToSignIn}
    >
      {hasSession === false && (
        <FormError
          className="mb-5"
          message="This reset link is invalid or has expired. Request a new link to continue."
        />
      )}

      <FormError message={error} className="mb-5" />

      <form onSubmit={handleResetPassword} noValidate className="space-y-5">
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

        <Button type="submit" size="lg" pill={false} className="h-12 w-full" loading={loading}>
          {loading ? 'Updating password…' : 'Save New Password'}
        </Button>
      </form>
    </AuthLayout>
  );
}