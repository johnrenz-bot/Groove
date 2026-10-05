'use client';

import { useState } from 'react';
import { startGoogleSignIn } from '@/lib/googleRegistration';

interface GoogleSignInButtonProps {
  /**
   * Where to land after sign-in. Must be an in-app path; the helper validates
   * that before putting it in the OAuth redirect.
   */
  next?: string;
  label?: string;
}

/** Google's brand mark, inlined so no external image request is made. */
function GoogleMark({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
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
 *
 * This is `type="button"`, never a submit. Nested inside the credentials form
 * that would otherwise be a footgun; the login page places it outside the form
 * regardless, so pressing Enter in a field still submits credentials.
 */
export function GoogleSignInButton({ next, label = 'Continue with Google' }: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await startGoogleSignIn(next);
      // A successful start navigates away. Resetting here covers the case where
      // the browser blocks the redirect, so the button cannot hang on "…".
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
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-border-strong bg-surface px-4 text-sm font-bold tracking-wide text-foreground transition hover:border-accent-border hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? 'Connecting to Google…' : label}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default GoogleSignInButton;
