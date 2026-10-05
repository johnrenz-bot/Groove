'use client';

import { useState } from 'react';
import { startGoogleRegistration, type GoogleRole } from '@/lib/googleRegistration';

interface GoogleRegisterButtonProps {
  role: GoogleRole;
  /** Shown under the button, e.g. "as a Client". */
  label?: string;
}

/** Google's brand mark. Inlined so no external image request is made. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
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
 * "Create an account with Google" for the registration pages.
 *
 * Email/password registration is untouched: this sits beside the existing form
 * and starts a separate OAuth handshake. Errors are surfaced in place rather
 * than thrown, because a failed OAuth start leaves the user still on the form
 * with their input intact and nothing else to react to.
 */
export function GoogleRegisterButton({ role, label }: GoogleRegisterButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await startGoogleRegistration(role);
      // Normally unreachable: a successful start navigates away. Kept so that if
      // the navigation is blocked the button does not stay spinning forever.
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
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? 'Connecting to Google…' : 'Create an account with Google'}
        {label ? <span className="font-normal text-muted-foreground">{label}</span> : null}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default GoogleRegisterButton;
