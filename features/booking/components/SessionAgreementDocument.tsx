'use client';

/**
 * The Session Agreement document.
 *
 * Rendered identically on screen and in print, so a PDF (via the browser's
 * print-to-PDF) matches what the parties read and signed.
 *
 * HARD RULE: every value shown here comes from a stored column. Where a value is
 * absent the component says so in words — "To be agreed", "Not stated" — and
 * never substitutes a plausible default. This document is signed by two people
 * and backs a payment; an invented cancellation window or fee would be worse
 * than an acknowledged gap.
 */

import React from 'react';
import {
  agreementReference,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  fullName,
  noticeWindow,
  type BookingAgreement,
} from '../services/bookingAgreement';

/**
 * The contract surface.
 *
 * Theme-aware by delegation, not by hardcoded palette: `g-agreement-paper` in
 * globals.css re-points the Tailwind colour variables at this element so every
 * `text-foreground`, `bg-muted`, `border-border` and `text-accent-text` inside
 * resolves against the ACTIVE theme.
 *
 * A previous version tried to do this from JSX by setting `--foreground` and
 * friends inline. That does not work, and the browser measurement showed why:
 * `@theme` declares `--color-foreground: var(--foreground)` on `:root`, and a
 * var() inside a custom property is substituted where it is DECLARED, so
 * `--color-foreground` was already frozen to the dark palette before any
 * descendant inherited it. The paper ended up with light text on a white
 * background. The fix lives in CSS precisely so no palette is duplicated here.
 *
 * Scoped to this element: app chrome outside it keeps the user's theme.
 */
export function AgreementPaper({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`g-agreement-paper rounded-xl p-5 sm:p-7 ${className}`}>{children}</div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 first:mt-0">
      <h3 className="flex items-baseline gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-text">
        <span className="tabular-nums">{number}.</span>
        {title}
      </h3>
      <div className="mt-2.5 space-y-2.5 text-[13px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

/** A labelled fact. Values are passed in already formatted. */
function Fact({ label, value }: { label: string; value: string }) {
  const missing = value === 'To be agreed' || value === 'Not stated' || value === '—';
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="shrink-0 text-[12px] font-semibold text-muted-foreground sm:w-40">{label}</dt>
      <dd className={missing ? 'text-[13px] italic text-muted-foreground' : 'text-[13px] text-foreground'}>
        {value}
      </dd>
    </div>
  );
}

/** The letterhead. Uses the app's own accent tokens, no image asset required. */
export function AgreementLetterhead({ agreement }: { agreement: BookingAgreement }) {
  return (
    <header className="border-b border-border pb-5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-accent-text">
        Groove System
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Session Agreement
      </h2>
      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
        Reference {agreementReference(agreement)} · Version {agreement.version}
      </p>
    </header>
  );
}

export function SessionAgreementBody({
  agreement,
  sessionTime,
  sessionGoal,
}: {
  agreement: BookingAgreement;
  /** '10:00' etc. from the booking, which the agreement does not duplicate. */
  sessionTime?: string | null;
  /** The booking's stated purpose. */
  sessionGoal?: string | null;
}) {
  const clientName = fullName(agreement.client);
  const coachName = fullName(agreement.coach);
  const window = noticeWindow(agreement);

  // Payment sentence, built from what is actually stored.
  const rate = formatMoney(agreement.rate ?? agreement.appointment_price);
  const paymentSentence =
    agreement.rate != null || agreement.appointment_price
      ? `The agreed session fee is ${rate}. Payment shall be made through the agreed payment method under the terms provided by the Coach.`
      : 'No session fee has been recorded on this agreement. Please confirm the fee with the Coach before signing.';

  const responsibilities = agreement.responsibilities
    ? agreement.responsibilities.split('\n').filter(Boolean)
    : null;

  return (
    <article className="space-y-1">
      <Section number={1} title="Parties">
        <p>
          This Session Agreement is made between the <strong>Client</strong> and the{' '}
          <strong>Coach</strong> for the purpose of confirming the details, responsibilities,
          and terms of the agreed performing arts session.
        </p>
        <dl className="mt-3 space-y-1.5">
          <Fact label="Client" value={clientName || 'Not identified'} />
          <Fact label="Coach" value={coachName || 'Not identified'} />
        </dl>
      </Section>

      <Section number={2} title="Session Details">
        <dl className="space-y-1.5">
          <Fact label="Session" value={agreement.session_duration ?? 'To be agreed'} />
          <Fact label="Category" value={agreement.session_type ?? 'To be agreed'} />
          <Fact label="Date" value={formatDate(agreement.agreement_date)} />
          <Fact label="Time" value={formatTime(sessionTime)} />
          <Fact label="Duration" value={agreement.session_duration ?? 'To be agreed'} />
          <Fact label="Location" value={agreement.location ?? 'To be agreed'} />
          <Fact label="Session Goal" value={sessionGoal?.trim() || 'To be agreed'} />
        </dl>
      </Section>

      <Section number={3} title="Fees and Payment">
        <p>{paymentSentence}</p>
        <dl className="mt-3 space-y-1.5">
          <Fact label="Rate" value={rate} />
          <Fact label="Payment Method" value={agreement.payment_method ?? 'To be agreed'} />
        </dl>
        {agreement.payment_terms && (
          <p className="mt-2.5 text-[13px] leading-relaxed">{agreement.payment_terms}</p>
        )}
      </Section>

      <Section number={4} title="Session Responsibilities">
        {responsibilities ? (
          <>
            <p>
              Both parties acknowledge and agree to the session details, applicable fees,
              responsibilities, cancellation terms, and other conditions stated in this
              agreement.
            </p>
            <ul className="mt-2 space-y-1.5">
              {responsibilities.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent-text" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            Both parties acknowledge and agree to the session details, applicable fees,
            responsibilities, cancellation terms, and other conditions stated in this
            agreement. No further responsibilities have been recorded by the Coach.
          </p>
        )}
      </Section>

      <Section number={5} title="Cancellation and Rescheduling">
        {agreement.cancellation_terms ? (
          <p>{agreement.cancellation_terms}</p>
        ) : window ? (
          <p>
            Notice of {window} is required before the session. The Coach has not recorded a
            specific cancellation method, so please confirm the arrangement directly.
          </p>
        ) : (
          <p>
            The Coach has not recorded a cancellation policy or notice period for this
            session. Please confirm cancellation and rescheduling terms with the Coach before
            signing.
          </p>
        )}
        {agreement.cancellation_method && (
          <dl className="mt-3">
            <Fact label="Cancellation" value={agreement.cancellation_method} />
          </dl>
        )}
      </Section>

      <Section number={6} title="Session Guidelines">
        {agreement.terms ? (
          <p>{agreement.terms}</p>
        ) : (
          <p>
            No additional guidelines have been recorded for this session. The session will be
            conducted at the time and location stated above.
          </p>
        )}
      </Section>

      <Section number={7} title="Acknowledgment and Consent">
        <p>
          By signing this agreement, both parties confirm that they have reviewed the session
          details and understand and accept the terms stated above.
        </p>
        <p className="mt-2.5">
          This agreement becomes effective once both the Client and the Coach have signed it.
        </p>
      </Section>
    </article>
  );
}

/**
 * The signature block. Images come from short-lived signed URLs; the caller
 * resolves them. A party who has not signed shows an explicit pending state
 * rather than an empty box that could be mistaken for a blank signature.
 */
export function SessionAgreementSignatures({
  agreement,
  clientSignatureUrl,
  coachSignatureUrl,
}: {
  agreement: BookingAgreement;
  clientSignatureUrl: string | null;
  coachSignatureUrl: string | null;
}) {
  const cells = [
    {
      role: 'CLIENT',
      name: fullName(agreement.client) || 'Not identified',
      signedAt: agreement.client_signed_at,
      url: clientSignatureUrl,
    },
    {
      role: 'COACH',
      name: fullName(agreement.coach) || 'Not identified',
      signedAt: agreement.coach_signed_at,
      url: coachSignatureUrl,
    },
  ];

  return (
    <section className="mt-8 border-t border-border pt-7">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-text">
        8. Signatures
      </h3>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {cells.map((c) => {
          const signed = Boolean(c.signedAt);
          return (
            <div key={c.role}>
              <p className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground">{c.role}</p>
              {/* Always a white, bordered ground. The captured PNG is near-black
                  ink, so a dark or transparent box made it unreadable; an
                  explicit white background plus a border guarantees contrast
                  regardless of the surrounding theme. */}
              <div className="g-agreement-signature mt-2 flex h-24 flex-col items-center justify-end rounded-lg px-3 pt-3">
                {signed && c.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.url}
                    alt={`${c.role.toLowerCase()} signature`}
                    // Explicit ink colour rather than a theme token: the image
                    // is a PNG with near-black pixels, and a dark-mode filter
                    // would invert it into white-on-white.
                    className="max-h-16 w-auto object-contain"
                  />
                ) : (
                  <span className="pb-3 text-[12px] italic text-slate-500">
                    {signed ? 'Signature image unavailable' : 'Awaiting signature'}
                  </span>
                )}
                {/* The ruled line a signature sits on, as on a paper contract. */}
                <div className="mt-auto w-full border-b border-border-strong pb-1" aria-hidden="true" />
              </div>
              <dl className="mt-2.5 space-y-1">
                <Fact label="Name" value={c.name} />
                <Fact label="Date Signed" value={c.signedAt ? formatDateTime(c.signedAt) : '—'} />
              </dl>
              <p
                className={
                  signed
                    ? 'mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-success'
                    : 'mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground'
                }
              >
                <span aria-hidden="true">{signed ? '✓' : '⏳'}</span>
                {signed ? 'Signed' : 'Pending'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The complete document, letterhead through signatures. */
export function SessionAgreementDocument({
  agreement,
  clientSignatureUrl,
  coachSignatureUrl,
  sessionTime,
  sessionGoal,
}: {
  agreement: BookingAgreement;
  clientSignatureUrl: string | null;
  coachSignatureUrl: string | null;
  sessionTime?: string | null;
  sessionGoal?: string | null;
}) {
  return (
    <AgreementPaper>
      <div className="space-y-7">
        <AgreementLetterhead agreement={agreement} />
        <SessionAgreementBody
          agreement={agreement}
          sessionTime={sessionTime}
          sessionGoal={sessionGoal}
        />
        <SessionAgreementSignatures
          agreement={agreement}
          clientSignatureUrl={clientSignatureUrl}
          coachSignatureUrl={coachSignatureUrl}
        />
      </div>
    </AgreementPaper>
  );
}

export default SessionAgreementDocument;
