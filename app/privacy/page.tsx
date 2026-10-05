'use client';

import React from 'react';
import Link from 'next/link';
import {
  Printer,
  Database,
  Eye,
  Users,
  ShieldCheck,
  KeyRound,
  Trash2,
  Mail,
  Scale,
} from 'lucide-react';
import { LegalLayout, type LegalSection } from '@/components/shared/LegalLayout';
import { Button } from '@/components/ui/Button';

const sections: LegalSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'collect', label: 'Information We Collect' },
  { id: 'use', label: 'How We Use Your Information' },
  { id: 'sharing', label: 'When We Share Information' },
  { id: 'retention', label: 'Data Retention' },
  { id: 'security', label: 'Security' },
  { id: 'your-rights', label: 'Your Rights & Controls' },
  { id: 'cookies', label: 'Cookies & Sessions' },
  { id: 'children', label: 'Children’s Privacy' },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact Us' },
];

const LAST_UPDATED = 'March 12, 2026';

const DATA_COLLECTED = [
  {
    title: 'Account details',
    body: 'Username, email address, account role (client or coach), and password credentials held by our authentication provider.',
  },
  {
    title: 'Personal information',
    body: 'First, middle, and last name, optional suffix, and date of birth. We require a minimum age of 13.',
  },
  {
    title: 'Contact & location',
    body: 'Philippine mobile number and your address within San Jose del Monte, Bulacan, used to match performers with nearby coaches and studios.',
  },
  {
    title: 'Verification documents',
    body: 'Government or student ID images, coach credentials, and selfie verification. These are used solely for identity verification.',
  },
  {
    title: 'Platform activity',
    body: 'Appointment requests, session timestamps, digital agreements and signatures, messages, and community posts you create.',
  },
];

const USES = [
  {
    icon: KeyRound,
    title: 'Authenticate users',
    body: 'To verify your identity when you sign in and keep your account secure.',
  },
  {
    icon: Users,
    title: 'Facilitate bookings',
    body: 'To match you with available coaches, schedule appointments, and coordinate sessions.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify coach identities',
    body: 'To review submitted credentials before a coach appears as verified on the Platform.',
  },
  {
    icon: Eye,
    title: 'Generate agreements',
    body: 'To create digital session contracts and record the signatures you provide.',
  },
  {
    icon: Database,
    title: 'Deliver notifications',
    body: 'To send booking updates, confirmation emails, and platform announcements.',
  },
];

const RIGHTS = [
  {
    icon: Eye,
    title: 'View and edit your profile',
    body: 'You can update your personal information, contact details, rates, and availability at any time.',
  },
  {
    icon: Trash2,
    title: 'Delete your content',
    body: 'You can remove posts and uploaded media you have published to the community.',
  },
  {
    icon: Mail,
    title: 'Request account removal',
    body: 'You can request that we delete your account and associated personal information by emailing us.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="What information Groove collects, why we use it, and the controls you have over it."
      lastUpdated={LAST_UPDATED}
      sections={sections}
      backHref="/login"
      backLabel="Back to Sign In"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
          icon={<Printer className="h-3.5 w-3.5" />}
        >
          Print
        </Button>
      }
    >
      <div className="g-eyebrow mb-6">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        Legal Document
      </div>

      <article className="max-w-[70ch] space-y-12">
        <section id="overview" className="scroll-mt-28">
          <SectionHeading title="Overview" icon={<ShieldCheck className="h-4 w-4" />} />
          <Prose>
            <p>
              Groove (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a performing arts platform
              connecting clients, coaches, and studios in San Jose del Monte, Bulacan. This policy
              explains what personal information we collect, the purposes we use it for, and the
              choices you have.
            </p>
            <p>
              This policy supplements our{' '}
              <Link
                href="/terms"
                className="font-semibold text-accent-text hover:underline underline-offset-2"
              >
                Terms &amp; Conditions
              </Link>
              , which govern your use of the Platform.
            </p>
          </Prose>
        </section>

        <section id="collect" className="scroll-mt-28">
          <SectionHeading title="Information We Collect" icon={<Database className="h-4 w-4" />} />
          <Prose>
            <p>We collect only the information the Platform needs to operate:</p>
            <ul className="mt-4 space-y-3">
              {DATA_COLLECTED.map((item) => (
                <li
                  key={item.title}
                  className="g-card px-5 py-4"
                >
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        <section id="use" className="scroll-mt-28">
          <SectionHeading title="How We Use Your Information" icon={<Eye className="h-4 w-4" />} />
          <Prose>
            <div className="grid gap-3 sm:grid-cols-2">
              {USES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="g-card p-5 transition-colors hover:border-border-strong"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </Prose>
        </section>

        <section id="sharing" className="scroll-mt-28">
          <SectionHeading title="When We Share Information" icon={<Users className="h-4 w-4" />} />
          <Prose>
            <p>
              We do not sell your personal information. We share it only in these circumstances:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-accent-text">
              <li>
                <strong className="font-semibold text-foreground">With other users.</strong>{' '}
                When you book a session or send a request, the coach sees the profile and contact
                details needed to fulfil that booking. Your address is shown only to the extent
                needed to confirm service coverage.
              </li>
              <li>
                <strong className="font-semibold text-foreground">With service providers.</strong>{' '}
                We use hosting, authentication, and storage providers that process data on our
                instructions to operate the Platform.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Where legally required.</strong>{' '}
                We may disclose information when required by Philippine law or a valid legal
                process.
              </li>
            </ul>
          </Prose>
        </section>

        <section id="retention" className="scroll-mt-28">
          <SectionHeading title="Data Retention" icon={<Database className="h-4 w-4" />} />
          <Prose>
            <p>
              We retain your information for as long as your account is active. If you request
              account removal, we delete your personal information, uploaded documents, and content
              from our systems, except where retention is required to comply with law or resolve a
              dispute.
            </p>
          </Prose>
        </section>

        <section id="security" className="scroll-mt-28">
          <SectionHeading title="Security" icon={<ShieldCheck className="h-4 w-4" />} />
          <Prose>
            <p>
              Passwords are hashed and never stored in plain text. Access to verification documents
              is restricted to staff who need it to review coach credentials. No system is
              perfectly secure, but we apply reasonable safeguards and limit collection to what the
              Platform requires.
            </p>
          </Prose>
        </section>

        <section id="your-rights" className="scroll-mt-28">
          <SectionHeading title="Your Rights & Controls" icon={<KeyRound className="h-4 w-4" />} />
          <Prose>
            <div className="grid gap-3">
              {RIGHTS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card/60 p-5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Prose>
        </section>

        <section id="cookies" className="scroll-mt-28">
          <SectionHeading title="Cookies & Sessions" icon={<Database className="h-4 w-4" />} />
          <Prose>
            <p>
              We use cookies and browser storage to keep you signed in, remember your interface
              preferences such as light or dark mode, and preserve form state. We do not use
              advertising cookies or sell behavioural data to third parties.
            </p>
          </Prose>
        </section>

        <section id="children" className="scroll-mt-28">
          <SectionHeading title="Children’s Privacy" icon={<ShieldCheck className="h-4 w-4" />} />
          <Prose>
            <p>
              The Platform is not directed to children under 13. Users aged 13–17 require
              parental consent. We do not knowingly collect information from children below this
              age, and if you believe a child has provided us information, contact us so we can
              remove it.
            </p>
          </Prose>
        </section>

        <section id="changes" className="scroll-mt-28">
          <SectionHeading title="Changes to This Policy" icon={<Scale className="h-4 w-4" />} />
          <Prose>
            <p>
              We may update this policy as the Platform evolves. Material changes will be announced
              through platform notifications, and the revision date at the top of this page will
              always reflect the current version.
            </p>
          </Prose>
        </section>

        <section id="contact" className="scroll-mt-28">
          <SectionHeading title="Contact Us" icon={<Mail className="h-4 w-4" />} />
          <Prose>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-5">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-accent-text"
              >
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">
                  Questions, requests, or complaints
                </p>
                <a
                  href="mailto:Groove1152000@gmail.com"
                  className="text-sm font-semibold text-accent-text hover:underline underline-offset-2"
                >
                  Groove1152000@gmail.com
                </a>
              </div>
            </div>
          </Prose>
        </section>
      </article>
    </LegalLayout>
  );
}

/* ─── Presentational blocks (token-driven, no inline styles) ─── */

function SectionHeading({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3.5">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text"
      >
        {icon}
      </span>
      <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground">{title}</h2>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-sm leading-[1.75] text-muted-foreground sm:text-[0.9375rem]">
      {children}
    </div>
  );
}