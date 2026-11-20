import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { resolveChromeRole } from '@/lib/auth/resolveChromeRole';
import { ShieldCheck, MessageSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact support - GroovePH',
  description:
    'Reach the GroovePH administrators - account issues, verification problems, disputes, or anything the self-serve flow cannot solve.',
};

export default async function SupportPage() {
  const role = await resolveChromeRole();

  const body = (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-text">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Support
        </span>
        <h1 className="font-sans text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-5xl">
          Talk to the GroovePH team
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Anything self-serve can&apos;t solve - verification rejected, an admin action you need to
          understand, a suspended account, a dispute. The fastest way to reach us is the
          in-app messenger; our admins reply there. Pick the channel that matches your situation.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5">
          <MessageSquare className="h-6 w-6 text-accent-text" aria-hidden="true" />
          <h2 className="mt-3 font-sans text-base font-semibold text-foreground">In-app messenger</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Message the platform administrators directly. Available from the messenger once
            you&apos;re signed in; the admin&apos;s reply arrives as a notification.
          </p>
          <Link
            href="/messages"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-accent px-4 text-xs font-bold text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Open messenger
          </Link>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <ShieldCheck className="h-6 w-6 text-accent-text" aria-hidden="true" />
          <h2 className="mt-3 font-sans text-base font-semibold text-foreground">Email</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            For anything that needs a permanent record - verification appeals, legal, or
            safety reports.
          </p>
          <a
            href="mailto:support@grooveph.com"
            className="mt-4 inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            support@grooveph.com
          </a>
        </article>
      </section>

      <section
        aria-labelledby="not-a-bug"
        className="rounded-2xl border border-border bg-warning-soft p-4 text-xs leading-relaxed text-warning"
      >
        <h2 id="not-a-bug" className="text-[10px] font-bold uppercase tracking-[0.12em]">
          Not a bug?
        </h2>
        <p className="mt-1">
          If you expected a feature to work and it didn&apos;t, check the{' '}
          <Link href="/faq" className="font-bold underline underline-offset-2">FAQ</Link> first -
          many issues (sign-in loop, hidden booking rows, expired requests) are solved there.
        </p>
      </section>
    </main>
  );

  if (role === 'guest') {
    return <PublicLayout>{body}</PublicLayout>;
  }
  return <DashboardLayout role={role}>{body}</DashboardLayout>;
}

