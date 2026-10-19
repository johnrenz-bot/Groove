'use client';

import { useState } from 'react';
import { startGoogleSignIn } from '@/lib/googleRegistration';

import { Loader2 } from 'lucide-react';

// TODO: Set to true once Google OAuth is configured in Supabase and tested.
const GOOGLE_OAUTH_ENABLED = false;

interface GoogleSignInButtonProps {
  /**
   * Where to land after sign-in. Must be an in-app path; the helper validates
   * that before putting it in the OAuth redirect.
   */
  next?: string;
  label?: string;
  className?: string;
}

/** Google's brand mark, inlined so no external image request is made. */
function GoogleMark({ className = 'h-5 w-5 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" for the login page.
 *
 * Uses the project's existing Supabase Google provider and the same
 * /auth/callback PKCE exchange as registration -- no second provider and no new
 * configuration. The role is deliberately not sent: at login time it is not
 * known, so it is detected from the profile after sign-in.
 */
export function GoogleSignInButton({
  next,
  label = 'Continue with Google',
  className = '',
}: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!GOOGLE_OAUTH_ENABLED) return;
    setBusy(true);
    setError(null);
    try {
      await startGoogleSignIn(next);
      setBusy(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in could not be started. Please try again.'
      );
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || !GOOGLE_OAUTH_ENABLED}
        aria-disabled={!GOOGLE_OAUTH_ENABLED || busy}
        aria-label={
          !GOOGLE_OAUTH_ENABLED
            ? 'Google sign-in is not yet available'
            : busy
            ? 'Connecting to Google…'
            : label
        }
        title={!GOOGLE_OAUTH_ENABLED ? 'Google sign-in is coming soon' : undefined}
        className={`group relative flex h-12 w-full items-center justify-center gap-3 rounded-xl border px-5 text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4BE4D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] ${
          !GOOGLE_OAUTH_ENABLED
            ? 'cursor-not-allowed border-[#1e2029] bg-[#0e0f14] text-[#4a4a55] opacity-60 select-none'
            : 'cursor-pointer border-[#2a2c38] bg-[#121319] text-[#f5f5f5] hover:border-[#F4BE4D]/60 hover:bg-[#181a22] hover:shadow-[0_4px_20px_-4px_rgba(244,190,77,0.15)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'
        } ${className}`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#F4BE4D]" aria-hidden="true" />
        ) : (
          <GoogleMark />
        )}
        <span className="tracking-tight transition-colors group-hover:text-white">
          {busy
            ? 'Connecting to Google…'
            : !GOOGLE_OAUTH_ENABLED
            ? `${label} (Coming Soon)`
            : label}
        </span>
      </button>

      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-2.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-center text-xs font-medium text-danger"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default GoogleSignInButton;
