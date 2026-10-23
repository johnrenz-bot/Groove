'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { User, Sparkles, ArrowRight, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isAdminIdentity } from '@/lib/admin/access';
import type { UserRole } from '@/lib/types';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { FormField, PasswordInput } from '@/components/ui/FormField';
import { FormError } from '@/components/ui/FormError';
import { Button } from '@/components/ui/Button';
import { GoogleSignInButton } from '@/components/shared/GoogleSignInButton';
import { RoleSelectionModal } from '@/features/auth/components/RoleSelectionModal';

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
    if (urlError === 'oauth_cancelled') {
      setError('Google sign-in was canceled. You can try again or sign in with your credentials.');
    }
    if (urlError === 'profile_missing') {
      setError('Account profile could not be found. Please complete registration or contact support.');
    }
    // Sent by `lib/supabase/middleware.ts` when a session exists but the account
    // has no `profiles` row yet. Without this the visitor is bounced off the
    // login page by the same middleware with no explanation and lands in a
    // loop they cannot see the cause of.
    if (urlError === 'account_not_ready') {
      setError(
        'Your sign-in worked, but this account has no profile yet, so there is no dashboard to open. Finish creating the account, or contact support if this is unexpected.'
      );
    }
  }, [urlError]);

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
        const authMessage = authError?.message?.toLowerCase() || '';
        if (authMessage.includes('database error loading user')) {
          setError(
            'We could not load your account. This usually means the sign-in record is stale or missing; please contact support if it persists.'
          );
        } else if (authMessage.includes('email not confirmed')) {
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

      /**
       * THE ROLE IS THE `profiles` ROW, OR NOTHING.
       *
       * This used to fall back to `authData.user.user_metadata.role` and then
       * to `'client'`. `user_metadata` is written by whoever called
       * `supabase.auth.signUp` — it is the client's own claim about itself, and
       * it is not an authorization decision. A forged `role: 'coach'` in signup
       * metadata therefore landed the account in the coach portal until the
       * middleware read the real row and bounced it. The `profiles` row is
       * written by a database trigger from the signup path, so it is the only
       * place a role can come from.
       */
      if (!profile?.role) {
        setError(
          'Your credentials are correct, but this account has no profile yet, so there is no dashboard to open. Finish creating the account, or contact support if this is unexpected.'
        );
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

      // A `role: 'admin'` account that is not the pinned admin address has no
      // console to enter. Send it to the member portal rather than to a URL
      // the middleware will bounce straight back.
      const portalRole = userRole === 'admin' ? 'client' : userRole;

      // Honour a safe same-origin redirect target that matches the role.
      // Admin routes are never honoured here: a real admin was already sent to
      // /admin/dashboard above, so anything reaching this branch is a member,
      // and forwarding them to /admin/* is what produced the redirect loop.
      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        const isAdminRoute = redirectTo === '/admin' || redirectTo.startsWith('/admin/');
        if (!isAdminRoute) {
          const isClientRoute = redirectTo === '/client' || redirectTo.startsWith('/client/');
          const isCoachRoute = redirectTo === '/coach' || redirectTo.startsWith('/coach/');
          if ((portalRole === 'coach' && !isClientRoute) || (portalRole === 'client' && !isCoachRoute)) {
            // Mark the welcome modal even on this branch. It used to `return`
            // first, so a member who arrived through a deep link — the common
            // case, because the middleware sets `redirectTo` whenever it bounces
            // a guest off a protected route — never saw it at all.
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

  const hasIdentifierError = Boolean(fieldErrors.identifier);
  const hasPasswordError = Boolean(fieldErrors.password);

  return (
    <div className="groove-auth">
      <AuthLayout
        split
        eyebrow={
          <span className="au-eyebrow">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Member Access
          </span>
        }
        title="Welcome back"
        subtext="Sign in to your GroovePH account to continue."
        image="/image/login/bright.jpeg"
        quote="Move to your own rhythm."
        imagePanelTitle="Move to your own rhythm."
        imagePanelDescription="Sign in to discover verified coaches, book rehearsal studios, and grow your craft in Bulacan's premier performing arts hub."
        imagePanelImage="/image/login/bright.jpeg"
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              className="inline-block cursor-pointer py-1.5 -my-1.5 font-semibold text-accent-text underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Create account
            </button>
          </p>
        }
      >
        {/* Error Banner */}
        {(error || urlError === 'account_not_ready') && (
          <div className="mb-5" role="alert" aria-live="assertive">
            <FormError message={error} className="mb-5" />
          </div>
        )}

        {urlError === 'account_not_ready' && (
          <div className="mb-5 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </div>
        )}

        {/* Continue with Google */}
        <div className="mb-6">
          <GoogleSignInButton next={redirectTo ?? undefined} />

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#262832]" />
            </div>
            <span className="relative bg-[#111218] px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#9e9ea8]">
              or sign in with password
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} noValidate className="space-y-6" aria-label="Sign in form">
          {/* Username/Email Field */}
          <FormField
            label="Username or Email"
            error={fieldErrors.identifier}
            hint="Your username, or the email you registered with."
            required
          >
            {(props) => (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <User
                    className={`h-4 w-4 text-muted-foreground transition-colors ${
                      hasIdentifierError ? 'text-danger' : ''
                    }`}
                    aria-hidden="true"
                  />
                </div>
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
                  onBlur={() => {
                    if (!usernameOrEmail.trim() && !fieldErrors.identifier) {
                      setFieldErrors((p) => ({ ...p, identifier: 'Enter your username or email address.' }));
                    }
                  }}
                  autoComplete="username"
                  autoFocus
                  placeholder="juan_dancer or you@email.com"
                  className={`${props.className} g-input-has-icon ${hasIdentifierError ? 'border-danger focus:ring-danger/20' : ''}`}
                  aria-invalid={hasIdentifierError}
                  aria-describedby={hasIdentifierError ? 'identifier-error' : 'identifier-hint'}
                />
              </div>
            )}
          </FormField>

          {/* Password Field */}
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
              onBlur={() => {
                if (!password && !fieldErrors.password) {
                  setFieldErrors((p) => ({ ...p, password: 'Enter your password.' }));
                }
              }}
              error={fieldErrors.password}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              aria-invalid={hasPasswordError}
              aria-describedby={hasPasswordError ? 'password-error' : undefined}
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between gap-3 pt-1">
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
                aria-describedby="remember-me-hint"
              />
              <span id="remember-me-hint" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Remember me
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="border-t border-[#262832] pt-5">
            <Button
              type="submit"
              size="lg"
              className="w-full font-bold bg-[#F4BE4D] text-[#121008] hover:bg-[#E5B23E] hover:shadow-[0_4px_24px_rgba(244,190,77,0.22)] active:scale-[0.99] transition-all"
              loading={loading}
              trailingIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
              aria-busy={loading}
            >
              {loading ? 'Signing in…' : 'Sign in to GroovePH'}
            </Button>
          </div>

          {/* Loading indicator text for screen readers */}
          {loading && (
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              Signing in, please wait
            </div>
          )}
        </form>
      </AuthLayout>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <span
              className="g-spin h-6 w-6 rounded-full border-2 border-border border-t-accent"
              role="status"
              aria-label="Loading sign in"
            />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}