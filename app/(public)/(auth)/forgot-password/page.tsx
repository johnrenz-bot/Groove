'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { FormError } from '@/components/ui/FormError';
import { AuthButton, SuccessTile, TextField } from '@/components/auth/ui/AuthUI';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFieldError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setFieldError(undefined);

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${origin}/auth/callback?type=recovery`,
      });

      if (resetErr) {
        throw new Error(resetErr.message);
      }

      setSentSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.';
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

  if (sentSuccess) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtext="We sent password recovery instructions to your email address."
        backLink={backToSignIn}
      >
        <div className="av-state">
          <SuccessTile />
          <div className="av-state-copy">
            <h2 className="av-state-title">Reset link sent</h2>
            <p className="av-state-text">
              A password reset link has been sent to <strong>{email.trim()}</strong>. Follow the
              instructions in that email to choose a new password.
            </p>
            <p className="av-state-hint">
              Nothing arrived? Check your spam or promotions folder, then try again.
            </p>
          </div>

          <AuthButton
            variant="secondary"
            className="av-btn--block"
            onClick={() => {
              setSentSuccess(false);
              setEmail('');
            }}
          >
            Send to a different email
          </AuthButton>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtext="Enter the email address on your account and we'll send you a recovery link."
      backLink={backToSignIn}
    >
      <FormError message={error} />

      <form onSubmit={handleSubmit} noValidate className="av-form-fields">
        <TextField
          id="email"
          name="email"
          type="email"
          label="Registered email address"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldError) setFieldError(undefined);
          }}
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          leadingIcon={<Mail className="h-4 w-4" />}
          error={fieldError}
        />

        <AuthButton type="submit" loading={loading} className="av-btn--block">
          {loading ? 'Sending reset link…' : 'Send reset link'}
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
