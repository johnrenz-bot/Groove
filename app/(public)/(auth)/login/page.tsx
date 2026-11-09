'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isAdminIdentity } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';
import { FormError } from '@/components/ui/FormError';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const REMEMBER_ME_KEY = 'groove-remember-me';
const REMEMBERED_IDENTIFIER_KEY = 'groove-remembered-identifier';

function LoginPageContent() {
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
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Restore the remembered identifier on mount
  useEffect(() => {
    try {
      if (window.localStorage.getItem(REMEMBER_ME_KEY) === '1') {
        setRememberMe(true);
        const saved = window.localStorage.getItem(REMEMBERED_IDENTIFIER_KEY);
        if (saved) setUsernameOrEmail(saved);
      }
    } catch {
      // Blocked storage
    }
  }, []);

  // Handle URL errors
  useEffect(() => {
    if (urlError === 'auth_callback_failed') {
      setError('Authentication callback failed or link expired. Please sign in directly.');
    }
    if (urlError === 'oauth_cancelled') {
      setError('Google sign-in was canceled. You can try again or sign in with your credentials.');
    }
    if (urlError === 'profile_missing') {
      setError('Account profile could not be found. Please complete registration or contact support.');
    }
    if (urlError === 'account_not_ready') {
      setError('Your sign-in worked, but this account has no profile yet, so there is no dashboard to open. Finish creating the account, or contact support if this is unexpected.');
    }
  }, [urlError]);

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
      return;
    }

    // Persist the identifier for "Remember me"
    if (rememberMe) {
      try {
        window.localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, usernameOrEmail.trim());
        window.localStorage.setItem(REMEMBER_ME_KEY, '1');
      } catch {
        // Blocked storage
      }
    }

    try {
      const supabase = createClient();
      let email = usernameOrEmail.trim();

      // A username is resolved to an email via the profiles table
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
        const authMessage = authError?.message?.toLowerCase() || '';
        if (authMessage.includes('database error loading user')) {
          setError('We could not load your account. This usually means the sign-in record is stale or missing; please contact support if it persists.');
        } else if (authMessage.includes('email not confirmed')) {
          setError('Your email is not confirmed yet. Please check your inbox for the confirmation email.');
        } else {
          setError('Invalid email/username or password.');
        }
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!profile?.role) {
        setError('Your credentials are correct, but this account has no profile yet, so there is no dashboard to open. Finish creating the account, or contact support if this is unexpected.');
        setLoading(false);
        return;
      }

      const userRole = profile.role as UserRole;

      await supabase.from('profiles').update({ status: 'online' }).eq('id', authData.user.id);

      if (isAdminIdentity({ role: userRole, email: profile.email })) {
        router.push('/admin/dashboard');
        router.refresh();
        return;
      }

      const portalRole = userRole === 'admin' ? 'client' : userRole;

      // Honour a safe same-origin redirect target
      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        const isAdminRoute = redirectTo === '/admin' || redirectTo.startsWith('/admin/');
        if (!isAdminRoute) {
          const isClientRoute = redirectTo === '/client' || redirectTo.startsWith('/client/');
          const isCoachRoute = redirectTo === '/coach' || redirectTo.startsWith('/coach/');
          if ((portalRole === 'coach' && !isClientRoute) || (portalRole === 'client' && !isCoachRoute)) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('groove_welcome_pending', 'true');
            }
            router.push(redirectTo);
            router.refresh();
            return;
          }
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('groove_welcome_pending', 'true');
      }

      router.push(portalRole === 'coach' ? '/coach/home' : '/client/home');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <AuthLayout
      split
      logo={
        <Image
          src="/image/Logo/GroovePH-Logo.png"
          alt="GroovePH"
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
        />
      }
      imagePanelTitle="Move to your own rhythm."
      imagePanelDescription="Discover verified coaches, book rehearsal studios, and grow your craft in Bulacan's premier performing arts hub."
      imagePanelImage="/image/login/LoginPage.jpeg"
      title="Welcome back"
      subtext="Sign in to your GroovePH account to continue."
      footer={
        <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="font-semibold text-accent-text underline-offset-4 hover:underline"
            >
              Create an account
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            By proceeding, you agree to our{' '}
            <Link href="/terms" className="font-medium text-accent-text underline-offset-4 hover:underline">
              Terms of use
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-accent-text underline-offset-4 hover:underline">
              Privacy policy
            </Link>
            .
          </p>
        </div>
      }
    >
      <div className="login-enter">
      {(error || urlError === 'account_not_ready') && (
        <div className="mb-5" role="alert" aria-live="assertive">
          <FormError message={error} className="mb-5" />
        </div>
      )}

      <div className="space-y-4">
        <button
          type="button"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-[8px] border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          onClick={() => {
            console.log('Google sign-in clicked');
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
            <path d="M533.5 96.5c-6.9-3.3-14.3-5.5-22.3-6.5-6.1-2.3-12.4-3.5-18.8-3.5-5.9 0-11.6.7-17.1 2.1-4.2-1.1-8.6-1.7-13.1-1.7-8.4 0-16.2 2.5-22.8 6.7-5.6-2.3-11.5-3.9-17.8-3.9-12.5 0-24.3 6.5-30.9 16.3-6.4-2.1-13.1-3.2-19.9-3.2-13.4 0-25.8 6.8-33.1 18.2-6.9-2.3-14-3.8-21.1-3.8-13.4 0-26.1 7.3-33.5 20.2-6.9-2.3-14-3.8-21.2-4.3-6.2-3.8-12.5-7.5-18.9-11-5.9-3.3-11.4-6.7-16.9-10.3-5.8-3.6-11.4-7.5-16.7-11.6-5.9-4.7-10.9-10.1-14.8-15.8-4.3-5.9-6.9-12.7-7.6-19.8-1.4-13.6 5.2-26.3 18.1-26.3h.2c13.3 0 25.1 7.6 30.8 19.1 3.5 7.2 5.3 15.1 5.3 23.2 0 .6-.1 1.3-.2 1.9-6.5 126.6-25.3 233.5-48.3 233.5" fill="#4285F4" />
            <path d="M109.3 193.8c10.9-3.4 23-6.6 36-8.3-5.2-3.9-10.7-6.9-16.8-9.1-6.1-2.2-12.4-3.5-18.9-3.5-3.2 10.2-4.1 20.9-2.5 31.5 3.1 19.2 12.2 35.8 29.3 46.3-2.6-3.9-5.5-9-8.8-13.7-8.5 16.1-17.5 29.5-30.2 39.1-6.8 4.7-14 8.4-21.7 11.3-6.8 2.5-13.8 4.7-20.9 6.5-6.3 1.7-12.5 2.7-18.7 2.7-1.7 0-3.3-.1-4.9-.2 2.4 9.8 4.9 19.2 7.7 28.2 6.1 18.8 16.1 34.5 30.2 42.7-8.7-.6-17-2.4-24.6-5.1-1-3.3-1.7-7-1.9-11.1-1.4 6.1-5.2 11.5-10.7 15.8-9.3 8.1-20.1 12.8-32.4 12.8-26.8 0-47.5-23.2-42.1-45.5 4.4-19.3 21.3-33.6 42.6-33.6h.2c3.1 10.5 8.2 20.2 14.7 27.8 6.5 7.7 14 13.5 22.4 17.4 7.6 3.4 15.6 5.6 24 6.6 1.3 13.8 6.5 26.5 14.7 35.3 6.1 6.9 13.4 12.5 21.6 16.9 8 4.3 16.7 7.3 25.8 9.5 12-3.4 22.5-11.1 29.9-20.3 6-7.3 10.3-15.8 12.8-25 2.5-9.4 2.9-19-1.2-27.6z" fill="#34a853" />
            <path d="M93.6 199.4c3.4-10.9 10.3-20.2 20.2-26.4-5.3-1.4-10.5-4.3-14.2-9-4.3 6-6.7 12.8-5.9 19.9 1.6 10.3 6.3 18.9 13.4 25.4 5.7 5.1 11.9 8.7 19 10.8 6.7 1.8 13.3 1.8 19.6.6 12.7-3.1 24.3-9.3 33.1-17.8 4.4-3.7 8-7.5 11.2-11.4 4.5 4.7 6.9 10.2 7 15.9 1.1 5.8-3.2 11.4-9.3 14.9-6.2 3.4-12.8 5.5-19.9 6.1-6.5.4-13-.5-18.5-2.9-5.9-2.4-11.1-5.8-15.6-9.9-4.6-4.2-7.7-9-8.9-14.2" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
        <div className="reg-divider">OR</div>
      </div>

      <form onSubmit={handleLogin} className="space-y-5" aria-label="Sign in form">
        <div>
          <label htmlFor="usernameOrEmail" className="g-label">
            Username or Email <span className="text-accent-text" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="usernameOrEmail"
              name="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="juan_dancer or you@email.com"
              className={`g-input g-input-has-icon ${fieldErrors.identifier ? 'border-danger' : ''}`}
              aria-invalid={!!fieldErrors.identifier}
            />
          </div>
          {fieldErrors.identifier && (
            <p className="g-field-error" role="alert">
              <span>{fieldErrors.identifier}</span>
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="g-label mb-0">
              Password <span className="text-accent-text" aria-hidden="true">*</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs font-semibold text-accent-text underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`g-input g-input-has-icon ${fieldErrors.password ? 'border-danger' : ''}`}
              style={{ paddingRight: '2.5rem' }}
              aria-invalid={!!fieldErrors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="g-field-error" role="alert">
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border border-border checked:bg-accent checked:border-accent focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">Remember me</span>
        </label>

        <Button type="submit" size="lg" pill={false} className="h-11 w-full" loading={loading}>
          {loading ? 'Signing in…' : 'Continue'}
        </Button>
      </form>



      <Modal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        size="lg"
        headerAccent={<span />}
        title={
          <span className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">
              Registration
            </span>
            <span className="font-serif text-2xl font-medium tracking-[-0.02em] text-foreground">
              Create your account
            </span>
          </span>
        }
        description="Choose the path that fits you."
        showClose
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Coach card — full-bleed image */}
          <Link
            href="/register/coach"
            onClick={() => setShowRegisterModal(false)}
            className="group relative block aspect-[3/4] overflow-hidden rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Register as Coach / Choreographer"
          >
            <img
              src="/image/login/choreo.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[300ms] ease-out group-hover:scale-[1.04]"
            />
            {/* subtle base overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/10 transition-opacity duration-[300ms] group-hover:from-black/70 group-hover:via-black/35 group-hover:to-black/20" />
            {/* content pinned to bottom */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5 sm:p-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                Coach / Choreographer
              </span>
              <h3 className="font-serif text-xl font-medium leading-tight text-white opacity-100 translate-y-0 transition-all duration-[300ms] ease-out sm:text-2xl sm:opacity-0 sm:translate-y-3 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus:opacity-100 sm:group-focus:translate-y-0">
                Turn your craft into a studio.
              </h3>
              {/* revealed on hover (always visible on touch via group-focus / media query) */}
              <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white opacity-100 translate-y-0 transition-all duration-[300ms] ease-out sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus:opacity-100 sm:group-focus:translate-y-0">
                Continue as Coach <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>

          {/* Client card — full-bleed image */}
          <Link
            href="/register/client"
            onClick={() => setShowRegisterModal(false)}
            className="group relative block aspect-[3/4] overflow-hidden rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Register as Client / Performer"
          >
            <img
              src="/image/login/arti.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[300ms] ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/10 transition-opacity duration-[300ms] group-hover:from-black/70 group-hover:via-black/35 group-hover:to-black/20" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5 sm:p-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                Client / Performer
              </span>
              <h3 className="font-serif text-xl font-medium leading-tight text-white opacity-100 translate-y-0 transition-all duration-[300ms] ease-out sm:text-2xl sm:opacity-0 sm:translate-y-3 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus:opacity-100 sm:group-focus:translate-y-0">
                Find your next stage.
              </h3>
              <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white opacity-100 translate-y-0 transition-all duration-[300ms] ease-out sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus:opacity-100 sm:group-focus:translate-y-0">
                Continue as Client <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        </div>
      </Modal>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#f4be4d] border-t-transparent" />
            <p className="mt-2 text-sm text-white/60">Loading…</p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}