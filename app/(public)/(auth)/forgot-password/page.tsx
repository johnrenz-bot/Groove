'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { FormField } from '@/components/ui/FormField';
import { FormError, FormSuccess } from '@/components/ui/FormError';
import { Button } from '@/components/ui/Button';
import { Mail } from 'lucide-react';

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
    <Link
      href="/login"
      className="text-xs font-medium text-accent-text hover:underline underline-offset-4"
    >
      Back to Sign In
    </Link>
  );

  if (sentSuccess) {
    return (
      <AuthLayout
        centered
        title="Check your inbox"
        subtext="We sent password recovery instructions to your email address."
        footer={backToSignIn}
      >
        <div className="space-y-5 text-center">
          <FormSuccess>
            A password reset link has been sent to <strong>{email.trim()}</strong>. Follow the
            instructions in that email to choose a new password.
          </FormSuccess>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Nothing arrived? Check your spam or promotions folder, then try again.
          </p>
          <Button
            variant="secondary"
            size="lg"
            pill={false}
            className="h-12 w-full"
            onClick={() => {
              setSentSuccess(false);
              setEmail('');
            }}
          >
            Send to a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      centered
      title="Reset your password"
      subtext="Enter the email address on your account and we'll send you a recovery link."
      footer={backToSignIn}
    >
      <FormError message={error} className="mb-5" />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField label="Registered Email Address" error={fieldError} required>
          {(props) => (
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                {...props}
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(undefined);
                }}
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                className={`${props.className} g-input-has-icon`}
              />
            </div>
          )}
        </FormField>

        <Button type="submit" size="lg" pill={false} className="h-12 w-full" loading={loading}>
          {loading ? 'Sending reset link…' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthLayout>
  );
}