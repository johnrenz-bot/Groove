'use client';

import React from 'react';
import Link from 'next/link';
import {
  Printer,
  CheckCircle,
  BookOpen,
  UserCheck,
  ShieldAlert,
  CreditCard,
  Bot,
  Lightbulb,
  AlertTriangle,
  Lock,
  RefreshCw,
  Ban,
  Scale,
  Mail,
} from 'lucide-react';
import { LegalLayout, type LegalSection } from '@/components/shared/LegalLayout';
import { Button } from '@/components/ui/Button';

/**
 * Section metadata drives the sticky table of contents in LegalLayout, which
 * handles the scroll-spy. `id` must match the `id` on the rendered <section>.
 */
const sections: LegalSection[] = [
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'accounts', label: 'User Accounts' },
  { id: 'conduct', label: 'User Conduct' },
  { id: 'payments', label: 'Booking & Payments' },
  { id: 'smartchat', label: 'Smart Chat Support' },
  { id: 'ip', label: 'Intellectual Property' },
  { id: 'disclaimer', label: 'Disclaimer & Liability' },
  { id: 'privacy', label: 'Privacy & Data Use' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'termination', label: 'Termination' },
  { id: 'law', label: 'Governing Law' },
  { id: 'contact', label: 'Contact' },
];

const DEFINITIONS = [
  { term: 'Platform', def: 'Groove website and services.' },
  { term: 'User', def: 'Anyone accessing the Platform.' },
  { term: 'Client', def: 'User booking artists, coaches, or studios.' },
  {
    term: 'Artist / Coach',
    def: 'Choreographer, coach, or performer offering services on the Platform.',
  },
  {
    term: 'Content',
    def: 'Text, images, videos, audio, profiles, posts, agreements, or other materials uploaded.',
  },
];

const PRIVACY_POINTS = [
  {
    label: 'What we collect',
    tone: 'accent' as const,
    text: 'Name, contact details, Philippine address hierarchy, email, account role, uploaded verification IDs, performance showcase videos, and appointment timestamps.',
  },
  {
    label: 'Why we use it',
    tone: 'success' as const,
    text: 'To authenticate users, facilitate appointment scheduling, verify coach identities, generate digital contracts with signatures, and deliver notifications.',
  },
  {
    label: 'Data control',
    tone: 'warning' as const,
    text: 'You may edit your profile information, delete uploaded posts, or request account removal at any time.',
  },
];

const PAYMENT_METHODS = ['Cash', 'GCash', 'Maya', 'Bank Transfer'];

const LAST_UPDATED = 'March 12, 2026';

export default function TermsAndConditionsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      description="The rules that govern your use of the Groove performing arts platform."
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
        <Scale className="h-3 w-3" aria-hidden="true" />
        Legal Document
      </div>

      <article className="max-w-[70ch] space-y-12">
        <section id="acceptance" className="scroll-mt-28">
          <SectionHeading title="Acceptance of Terms" icon={<CheckCircle className="h-4 w-4" />} />
          <Prose>
            <p>
              By accessing or using the Groove website (&ldquo;Platform&rdquo;), you agree to be
              bound by these Terms. If you do not agree, do not use the Platform.
            </p>
          </Prose>
        </section>

        <section id="definitions" className="scroll-mt-28">
          <SectionHeading title="Definitions" icon={<BookOpen className="h-4 w-4" />} />
          <Prose>
            <dl className="g-card divide-y divide-divider overflow-hidden">
              {DEFINITIONS.map(({ term, def }) => (
                <div
                  key={term}
                  className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4"
                >
                  <dt className="text-sm font-bold text-foreground">{term}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">{def}</dd>
                </div>
              ))}
            </dl>
          </Prose>
        </section>

        <section id="accounts" className="scroll-mt-28">
          <SectionHeading title="User Accounts" icon={<UserCheck className="h-4 w-4" />} />
          <Prose>
            <p>
              Registration is required for interactive booking and messaging features. Keep your
              password safe. Coaches undergo verification of valid identification. Users must be 13+
              or have parental consent.
            </p>
          </Prose>
        </section>

        <section id="conduct" className="scroll-mt-28">
          <SectionHeading title="User Conduct" icon={<ShieldAlert className="h-4 w-4" />} />
          <Prose>
            <p>
              Post legal and safe performing arts content only. Harassment, spam, fraudulent
              listings, or disruption of Platform services will result in immediate account
              suspension.
            </p>
          </Prose>
        </section>

        <section id="payments" className="scroll-mt-28">
          <SectionHeading title="Booking & Payments" icon={<CreditCard className="h-4 w-4" />} />
          <Prose>
            <p>
              Payments occur directly between Client and Coach via agreed channels. Groove
              facilitates scheduling, digital agreement contracts, and communication.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <span key={m} className="g-pill">
                  {m}
                </span>
              ))}
            </div>
          </Prose>
        </section>

        <section id="smartchat" className="scroll-mt-28">
          <SectionHeading title="Smart Chat Support" icon={<Bot className="h-4 w-4" />} />
          <Prose>
            <p>
              Our AI coach assistant provides preliminary answers regarding coach specializations,
              booking steps, and studio guidelines when coaches are offline.
            </p>
          </Prose>
        </section>

        <section id="ip" className="scroll-mt-28">
          <SectionHeading title="Intellectual Property" icon={<Lightbulb className="h-4 w-4" />} />
          <Prose>
            <p>
              Groove owns the Platform intellectual property. Performing artists retain full
              copyright over their video submissions, choreography, and showcase media.
            </p>
          </Prose>
        </section>

        <section id="disclaimer" className="scroll-mt-28">
          <SectionHeading title="Disclaimer & Liability" icon={<AlertTriangle className="h-4 w-4" />} />
          <Prose>
        <Callout tone="warning">
          The Platform is provided on an &ldquo;as-is&rdquo; basis. Groove exercises reasonable
          care in verifying coaches and facilitating contracts.
        </Callout>
          </Prose>
        </section>

        <section id="privacy" className="scroll-mt-28">
          <SectionHeading title="Privacy & Data Use" icon={<Lock className="h-4 w-4" />} />
          <Prose>
            <p>
              How we handle your personal information is set out in full in our{' '}
              <Link
                href="/privacy"
                className="font-semibold text-accent-text hover:underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              . In summary:
            </p>
            <ul className="mt-4 space-y-3">
              {PRIVACY_POINTS.map((point) => (
                <li key={point.label} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      point.tone === 'success'
                        ? 'bg-success'
                        : point.tone === 'warning'
                          ? 'bg-warning'
                          : 'bg-accent'
                    }`}
                  />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {point.label}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {point.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        <section id="changes" className="scroll-mt-28">
          <SectionHeading title="Changes to Terms" icon={<RefreshCw className="h-4 w-4" />} />
          <Prose>
            <p>
              We may update these terms from time to time. Registered users will be notified via our
              global platform announcements.
            </p>
          </Prose>
        </section>

        <section id="termination" className="scroll-mt-28">
          <SectionHeading title="Termination" icon={<Ban className="h-4 w-4" />} />
          <Prose>
            <p>
              We reserve the right to suspend or terminate any account that violates these Terms or
              engages in conduct harmful to the Platform, other users, or third parties, without
              prior notice.
            </p>
          </Prose>
        </section>

        <section id="law" className="scroll-mt-28">
          <SectionHeading title="Governing Law" icon={<Scale className="h-4 w-4" />} />
          <Prose>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the
              Republic of the Philippines.
            </p>
          </Prose>
        </section>

        <section id="contact" className="scroll-mt-28">
          <SectionHeading title="Contact" icon={<Mail className="h-4 w-4" />} />
          <Prose>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-5">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-accent-text"
              >
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Email us at</p>
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

function Callout({
  tone,
  children,
}: {
  tone: 'warning' | 'danger' | 'info' | 'accent';
  children: React.ReactNode;
}) {
  const tones = {
    warning: 'border-warning/25 bg-warning-soft text-warning',
    danger: 'border-danger/25 bg-danger-soft text-danger',
    info: 'border-info/25 bg-info-soft text-info',
    accent: 'border-accent-border bg-accent-soft text-accent-text',
  } as const;

  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${tones[tone]}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="text-foreground">{children}</div>
    </div>
  );
}