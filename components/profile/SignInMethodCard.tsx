'use client';

import React from 'react';
import { Mail, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SignInMethodCardProps {
  provider?: string | null;
  email?: string | null;
  className?: string;
}

function GoogleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function SignInMethodCard({
  provider = 'google',
  email,
  className = '',
}: SignInMethodCardProps) {
  const normProvider = (provider || 'google').toLowerCase();
  const isGoogle = normProvider.includes('google');
  const isGithub = normProvider.includes('github');

  const providerName = isGoogle ? 'Google' : isGithub ? 'GitHub' : 'Email & Password';
  const providerType = isGoogle || isGithub ? 'OAuth Sign-in Provider' : 'Direct Email Authentication';

  return (
    <section className={`g-card p-6 ${className}`} aria-label="Sign-in method">
      <header className="mb-5 flex items-center justify-between border-b border-divider pb-4">
        <div>
          <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">
            Sign-in Method
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            App Builders PH uses {providerName} to sign you in. It&apos;s your active sign-in method.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-text" />
          <span>Secured</span>
        </span>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4.5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface shadow-xs">
            {isGoogle ? (
              <GoogleIcon className="h-6 w-6" />
            ) : isGithub ? (
              <svg className="h-6 w-6 fill-foreground" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            ) : (
              <Mail className="h-6 w-6 text-accent-text" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{providerName}</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Connected
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{providerType}</p>
            {email && (
              <p className="mt-0.5 text-[11px] text-subtle-foreground font-mono">{email}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>Active &amp; Verified</span>
          </span>
        </div>
      </div>
    </section>
  );
}
