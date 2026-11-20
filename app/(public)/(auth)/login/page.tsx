'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isAdminIdentity } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';
import { FormError } from '@/components/ui/FormError';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { Modal } from '@/components/ui/Modal';
import {
  AuthButton,
  Checkbox,
  Divider,
  PasswordField,
  TextField,
} from '@/components/auth/ui/AuthUI';
import { GoogleSignInButton } from '@/components/shared/GoogleSignInButton';

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
          alt=""
          width={34}
          height={34}
          priority
          className="av-brand-mark"
        />
      }
      imagePanelTitle="Move to your own rhythm."
      imagePanelDescription="Discover verified coaches, book rehearsal studios, and grow your craft in Bulacan's premier performing arts hub."
      imagePanelImage="/image/login/LoginPage.jpeg"
      title="Welcome back"
      subtext="Sign in to your GroovePH account to continue."
      footer={
        <div className="av-footer-copy">
          <p>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="av-link"
            >
              Create an account
            </button>
          </p>
          <p className="av-legal">
            By proceeding, you agree to our{' '}
            <Link href="/terms" className="av-legal-link">
              Terms of use
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="av-legal-link">
              Privacy policy
            </Link>
            .
          </p>
        </div>
      }
    >
      <div className="login-enter av-form">
        {(error || urlError === 'account_not_ready') && (
          <div role="alert" aria-live="assertive">
            <FormError message={error} />
          </div>
        )}

        {/*
          Google sign-in: the honest disabled state from GoogleSignInButton.
          The OAuth chain (signInWithOAuth → /auth/callback → /register/complete)
          is implemented and tested, but the Google provider is not verified
          configured in Supabase for this project, so the button renders
          disabled ("Coming Soon") instead of logging to console. Flip
          GOOGLE_OAUTH_ENABLED in components/shared/GoogleSignInButton.tsx
          after configuring the provider and the button becomes live — no
          other changes required.
        */}
        <GoogleSignInButton next={redirectTo ?? undefined} label="Continue with Google" />

        <Divider label="OR" variant="dotted" />

        <form onSubmit={handleLogin} className="av-form-fields" aria-label="Sign in form">
          <TextField
            id="usernameOrEmail"
            name="usernameOrEmail"
            type="text"
            label="Username or Email"
            required
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            placeholder="juan_dancer or you@email.com"
            leadingIcon={<User className="h-4 w-4" />}
            error={fieldErrors.identifier}
          />

          <PasswordField
            id="password"
            name="password"
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            leadingIcon={<Lock className="h-4 w-4" />}
            error={fieldErrors.password}
            action={
              <button
                type="button"
                onClick={handleForgotPassword}
                className="av-link av-link--sm"
              >
                Forgot password?
              </button>
            }
          />

          <Checkbox
            id="rememberMe"
            name="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            label="Remember me"
          />

          <AuthButton type="submit" loading={loading} className="av-btn--block">
            {loading ? 'Signing in…' : 'Continue'}
          </AuthButton>
        </form>
      </div>

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
            <span className="font-sans text-2xl font-medium tracking-[-0.02em] text-foreground">
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
              <h3 className="font-sans text-xl font-medium leading-tight text-white opacity-100 translate-y-0 transition-all duration-[300ms] ease-out sm:text-2xl sm:opacity-0 sm:translate-y-3 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus:opacity-100 sm:group-focus:translate-y-0">
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
              <h3 className="font-sans text-xl font-medium leading-tight text-white opacity-100 translate-y-0 transition-all duration-[300ms] ease-out sm:text-2xl sm:opacity-0 sm:translate-y-3 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus:opacity-100 sm:group-focus:translate-y-0">
                Find your next stage.
              </h3>
              <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white opacity-100 translate-y-0 transition-all duration-[300ms] ease-out sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus:opacity-100 sm:group-focus:translate-y-0">
                Continue as Client <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        </div>
      </Modal>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout
          split
          title="Welcome back"
          subtext="Sign in to your GroovePH account to continue."
          eyebrow="Performing Arts Platform"
          imagePanelImage="/image/login/LoginPage.jpeg"
          imagePanelTitle="Move to your own rhythm."
          imagePanelDescription="Discover verified coaches, book rehearsal studios, and grow your craft in Bulacan's premier performing arts hub."
        >
          <div className="space-y-4 pt-2" role="status" aria-busy="true" aria-label="Loading sign in">
            <div className="g-skeleton h-12 w-full" />
            <div className="g-skeleton h-12 w-full" />
            <div className="g-skeleton h-12 w-full" />
          </div>
        </AuthLayout>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
