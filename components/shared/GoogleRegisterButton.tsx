'use client';

import { useState } from 'react';
import { startGoogleRegistration, type GoogleRole } from '@/lib/googleRegistration';

import { Loader2 } from 'lucide-react';

// TODO: Set to true once Google OAuth is configured in Supabase and tested.
const GOOGLE_OAUTH_ENABLED = false;

interface GoogleRegisterButtonProps {
  role: GoogleRole;
  /** Custom label, e.g. "Register as Client in seconds". */
  label?: string;
  className?: string;
}

/** Google's brand mark. Inlined so no external image request is made. */
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
 * "Continue with Google" for the registration pages.
 *
 * Email/password registration is untouched: this sits beside the existing form
 * and starts a separate OAuth handshake. Errors are surfaced in place rather
 * than thrown, because a failed OAuth start leaves the user still on the form
 * with their input intact and nothing else to react to.
 */
export function GoogleRegisterButton({ role, label, className = '' }: GoogleRegisterButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonText = label || `Continue with Google as ${role === 'coach' ? 'Coach' : 'Performer'}`;

  const handleClick = async () => {
    if (!GOOGLE_OAUTH_ENABLED) return;
    setBusy(true);
    setError(null);
    try {
      await startGoogleRegistration(role);
      setBusy(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Google sign-up could not be started. Please try again.';
      setError(message);
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
            ? 'Google sign-up is not yet available'
            : busy
            ? 'Connecting to Google…'
            : buttonText
        }
        title={!GOOGLE_OAUTH_ENABLED ? 'Google sign-up is coming soon' : undefined}
        className={`group relative flex h-11 w-full items-center justify-center gap-3 rounded-lg border px-5 text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4BE4D] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
          !GOOGLE_OAUTH_ENABLED
            ? 'cursor-not-allowed border-border bg-muted text-subtle-foreground opacity-75 select-none'
            : 'cursor-pointer border-border bg-card text-foreground hover:border-accent-border hover:bg-muted active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'
        } ${className}`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-accent-text" aria-hidden="true" />
        ) : (
          <GoogleMark />
        )}
        <span className="tracking-tight transition-colors group-hover:text-foreground">
          {busy
            ? 'Connecting to Google…'
            : !GOOGLE_OAUTH_ENABLED
            ? `${buttonText} (Coming Soon)`
            : buttonText}
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

export default GoogleRegisterButton;
