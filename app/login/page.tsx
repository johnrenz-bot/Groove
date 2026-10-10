'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { User, Sparkles, ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { ImageCard } from '@/components/shared/ImageCard';
import { FormField, PasswordInput } from '@/components/ui/FormField';
import { FormError } from '@/components/ui/FormError';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/**
 * Remember-me persistence keys.
 *
 * Supabase owns the session itself — this app's session lifetime is set by the
 * Supabase client and is deliberately NOT changed here. What "Remember me"
 * persists is the user's preference plus their last identifier, so returning to
 * /login pre-fills the field. Unchecking it clears both.
 */
const REMEMBER_ME_KEY = 'groove-remember-me';
const REMEMBERED_IDENTIFIER_KEY = 'groove-remembered-identifier';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const urlError = searchParams.get('error');

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [showRoleModal, setShowRoleModal] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Restore the remembered identifier on mount, if one was saved.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(REMEMBER_ME_KEY) === '1') {
        setRememberMe(true);
        const saved = window.localStorage.getItem(REMEMBERED_IDENTIFIER_KEY);
        if (saved) setUsernameOrEmail(saved);
      }
    } catch {
      // Blocked storage: nothing to restore.
    }
  }, []);

  useEffect(() => {
    if (urlError === 'auth_callback_failed') {
      setError('Authentication callback failed or link expired. Please sign in directly.');
    }
  }, [urlError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRoleModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /** Focus the first invalid field so keyboard users land on the problem. */
  const focusFirstInvalid = () => {
    if (fieldErrors.identifier) identifierRef.current?.focus();
    else if (fieldErrors.password) passwordRef.current?.focus();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const errors: { identifier?: string; password?: string } = {};
    if (!usernameOrEmail.trim()) {
      errors.identifier = 'Enter your username or email address.';
    }
    if (!password) {
      errors.password = 'Enter your password.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setLoading(false);
      focusFirstInvalid();
      return;
    }

    // Persist the identifier for "Remember me" before the network round-trip so
    // it is stored even if the credentials turn out to be wrong.
    if (rememberMe) {
      try {
        window.localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, usernameOrEmail.trim());
        window.localStorage.setItem(REMEMBER_ME_KEY, '1');
      } catch {
        // Blocked storage: the preference simply won't persist.
      }
    }

    try {
      const supabase = createClient();
      let email = usernameOrEmail.trim();

      // A username is resolved to an email via the profiles table.
      if (!email.includes('@')) {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('email, role, status')
          .eq('username', email)
          .maybeSingle();

        if (profileErr || !profileData?.email) {
          setError('Invalid username or password.');
          setLoading(false);
          return;
        }
        email = profileData.email;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        if (authError?.message?.toLowerCase().includes('email not confirmed')) {
          setError('Your email is not confirmed yet. Please check your inbox for the confirmation email.');
        } else {
          setError('Invalid email/username or password.');
        }
        setLoading(false);
        passwordRef.current?.focus();
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      const userRole = profile?.role || authData.user.user_metadata?.role || 'client';

      await supabase.from('profiles').update({ status: 'online' }).eq('id', authData.user.id);

      if (userRole === 'admin') {
        router.push('/admin/dashboard');
        router.refresh();
        return;
      }

      // Honour a safe same-origin redirect target that matches the role.
      if (redirectTo && redirectTo.startsWith('/')) {
        const isClientRoute = redirectTo.startsWith('/client');
        const isCoachRoute = redirectTo.startsWith('/coach');
        if ((userRole === 'coach' && !isClientRoute) || (userRole === 'client' && !isCoachRoute)) {
          router.push(redirectTo);
          router.refresh();
          return;
        }
      }

      if (typeof window !== 'undefined' && (userRole === 'client' || userRole === 'coach')) {
        sessionStorage.setItem('groove_welcome_pending', 'true');
      }

      router.push(userRole === 'coach' ? '/coach/home' : '/client/home');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        eyebrow={
          <span className="g-eyebrow">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Member Access
          </span>
        }
        title="Welcome back"
        subtext="Sign in to your Groove account to continue."
        image="/image/login/bright.jpeg"
        quote="Move to your own rhythm."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              className="cursor-pointer font-semibold text-accent-text underline-offset-4 transition-colors hover:underline"
            >
              Create account
            </button>
          </p>
        }
      >
        <FormError message={error} className="mb-5" />

        <form onSubmit={handleLogin} noValidate className="space-y-5">
          <FormField
            label="Username or Email"
            error={fieldErrors.identifier}
            hint="Your username, or the email you registered with."
            required
          >
            {(props) => (
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  {...props}
                  ref={identifierRef}
                  name="usernameOrEmail"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => {
                    setUsernameOrEmail(e.target.value);
                    if (fieldErrors.identifier) setFieldErrors((p) => ({ ...p, identifier: undefined }));
                  }}
                  autoComplete="username"
                  autoFocus
                  placeholder="juan_dancer or you@email.com"
                  className={`${props.className} g-input-has-icon`}
                />
              </div>
            )}
          </FormField>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="password" className="g-label mb-0">
                Password <span className="text-accent-text" aria-hidden="true">*</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-accent-text underline-offset-4 transition-colors hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              ref={passwordRef}
              id="password"
              name="password"
              label={undefined}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              error={fieldErrors.password}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <label className="flex cursor-pointer select-none items-center gap-2.5">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  setRememberMe(e.target.checked);
                  try {
                    if (e.target.checked) {
                      window.localStorage.setItem(REMEMBER_ME_KEY, '1');
                    } else {
                      window.localStorage.removeItem(REMEMBER_ME_KEY);
                      window.localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
                    }
                  } catch {
                    // Blocked storage: the preference simply won't persist.
                  }
                }}
                className="g-checkbox"
              />
              <span className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Remember me
              </span>
            </label>
          </div>

          {/* One primary action, visually separated from the fields above it. */}
          <div className="border-t border-divider pt-5">
            <Button
              type="submit"
              size="lg"
              pill={false}
              className="h-12 w-full text-sm font-bold tracking-wide shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-accent)]"
              loading={loading}
              trailingIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {loading ? 'Signing in…' : 'Sign in to Groove'}
            </Button>
          </div>
        </form>
      </AuthLayout>

      <Modal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={
          <div className="flex flex-col gap-1 text-left sm:text-center">
            <span className="g-eyebrow mx-auto mb-1">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Join Groove System
            </span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight">Create your account</span>
          </div>
        }
        description="Select your account type to begin your registration as a performer or coach."
        size="lg"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-2">
          <ImageCard
            overlay
            href="/register/coach"
            aspect="aspect-[4/3] sm:aspect-[16/10]"
            image="/image/login/choreo.jpg"
            alt="Coach / Choreographer registration"
            name="Coach / Choreographer"
            subtitle="Showcase your talents and manage bookings"
            badges={
              <span className="g-pill g-pill-accent text-[10px] font-bold uppercase tracking-wider">
                Teach &amp; Mentor
              </span>
            }
            continuePill="Register as Coach"
          />
          <ImageCard
            overlay
            href="/register/client"
            aspect="aspect-[4/3] sm:aspect-[16/10]"
            image="/image/login/arti.jpg"
            alt="Client / Performer registration"
            name="Client / Performer"
            subtitle="Discover mentors and book sessions"
            badges={
              <span className="g-pill g-pill-accent text-[10px] font-bold uppercase tracking-wider">
                Learn &amp; Perform
              </span>
            }
            continuePill="Register as Performer"
          />
        </div>

        <p className="mt-6 border-t border-divider pt-5 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            onClick={() => setShowRoleModal(false)}
            className="font-semibold text-accent-text hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </Modal>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <span
            className="g-spin h-6 w-6 rounded-full border-2 border-border border-t-accent"
            role="status"
            aria-label="Loading sign in"
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
