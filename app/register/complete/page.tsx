'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import {
  completeGoogleRegistration,
  completeGoogleSignIn,
  isGoogleRole,
  GOOGLE_ROLE_DASHBOARD,
  GOOGLE_ROLE_LABEL,
  type GoogleRole,
} from '@/lib/googleRegistration';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { Loader2, TriangleAlert } from 'lucide-react';

type Phase =
  | { kind: 'working' }
  | { kind: 'failed'; message: string }
  | { kind: 'signed-out' }
  | { kind: 'wrong-role'; actual: GoogleRole; attempted: GoogleRole };

function GoogleCompletionInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawRole = searchParams.get('role');
  const next = searchParams.get('next') ?? undefined;
  // No `role` means the user arrived from /login rather than from a
  // registration page, so the role is not knowable yet and is detected from the
  // profile after sign-in instead of being guessed.
  const fromRegistration = isGoogleRole(rawRole);
  const role: GoogleRole = isGoogleRole(rawRole) ? rawRole : 'client';
  const [phase, setPhase] = useState<Phase>({ kind: 'working' });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Sign-in from /login: detect the role rather than being told it.
        if (!fromRegistration) {
          const result = await completeGoogleSignIn(next);
          if (cancelled) return;
          router.replace(result.redirectTo);
          return;
        }

        const outcome = await completeGoogleRegistration(role);

        if (cancelled) return;

        if (outcome.status === 'signed-out') {
          setPhase({ kind: 'signed-out' });
          return;
        }

        if (outcome.status === 'wrong-role') {
          setPhase({
            kind: 'wrong-role',
            actual: outcome.actualRole,
            attempted: outcome.attempted,
          });
          return;
        }

        // Both 'created' and 'existing' end in the same place: a usable account.
        // A returning Google user should land on their dashboard, not be told
        // they registered again.
        router.replace(GOOGLE_ROLE_DASHBOARD[outcome.role]);
      } catch (err: unknown) {
        if (cancelled) return;
        setPhase({
          kind: 'failed',
          message:
            err instanceof Error
              ? err.message
              : 'Your Google account could not be set up. Please try again.',
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [role, fromRegistration, next, router]);

  if (phase.kind === 'working') {
    return (
      <AuthLayout
        title={fromRegistration ? 'Setting up your account' : 'Signing you in'}
        subtext={
          fromRegistration
            ? 'One moment while we finish your Google sign-up.'
            : 'One moment while we bring up your account.'
        }
      >
        <div className="flex flex-col items-center gap-4 py-6" role="status" aria-live="polite">
          <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {fromRegistration
              ? `Creating your ${GOOGLE_ROLE_LABEL[role].toLowerCase()} profile…`
              : 'Signing you in…'}
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (phase.kind === 'signed-out') {
    return (
      <AuthLayout
        title="Sign-in was not completed"
        subtext="No Google session came back, so no account was created."
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-sm text-foreground">
              Google sign-in did not finish, so nothing was created. This usually means the
              consent screen was closed or the session expired. You can try again, or register
              with an email and password instead.
            </p>
          </div>
          <Link
            href={`/register/${role}`}
            className="block w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-contrast transition hover:opacity-90"
          >
            Try Google again
          </Link>
          <Link
            href="/login"
            className="block text-center text-xs font-semibold text-accent-text underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (phase.kind === 'wrong-role') {
    return (
      <AuthLayout
        title="You already have an account"
        subtext="This Google account is already registered with a different role."
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-sm text-foreground">
              This Google account is already registered as a{' '}
              <strong className="font-semibold">{GOOGLE_ROLE_LABEL[phase.actual]}</strong>. We did not
              change it to a {GOOGLE_ROLE_LABEL[phase.attempted].toLowerCase()}. If that is wrong,
              contact support so an admin can update your role.
            </p>
          </div>
          <Link
            href={GOOGLE_ROLE_DASHBOARD[phase.actual]}
            className="block w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-contrast transition hover:opacity-90"
          >
            Go to my dashboard
          </Link>
          <Link
            href="/login"
            className="block text-center text-xs font-semibold text-accent-text underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="We could not finish sign-up"
      subtext="Your Google account is verified, but its profile could not be completed."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <p role="alert" className="text-sm text-foreground">
            {phase.message}
          </p>
        </div>
        <Link
          href={`/register/${role}`}
          className="block w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-contrast transition hover:opacity-90"
        >
          Try again
        </Link>
        <Link
          href="/login"
          className="block text-center text-xs font-semibold text-accent-text underline underline-offset-4"
        >
          I already have an account
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function GoogleCompletionPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Setting up your account" subtext="One moment please.">
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
          </div>
        </AuthLayout>
      }
    >
      <GoogleCompletionInner />
    </Suspense>
  );
}
