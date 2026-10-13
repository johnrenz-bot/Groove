'use client';

/**
 * The agreement terms, laid out as a form.
 *
 * WHY IT IS READ-ONLY
 *   `guard_agreement_edit_scope()` (07_hotfix_agreement_edit_scope.sql) is the
 *   authority on who may change what, and it is stricter than the UI:
 *
 *     - a CLIENT may only record their own signature; touching rate,
 *       duration, payment, cancellation, terms, version, location or
 *       scheduled_at raises 'A client may only record their own signature…';
 *     - a COACH may edit the document freely only while `OLD.status = 'draft'`,
 *       and the app's own creation path writes `awaiting_signatures`
 *       (app/(coach)/coach/appointments/page.tsx → buildAgreementTerms), which
 *       is not 'draft' — so a coach cannot rewrite an agreement the app has
 *       already sent either;
 *     - INSERT is coach-only at the RLS layer ('Coaches can create agreements'),
 *       so a client can never create one.
 *
 *   An editable form here would therefore raise a database error on every save,
 *   for both roles, on every agreement the app actually produces. This component
 *   presents each field the agreement supports in one place so both parties read
 *   the same document before signing, and the actions that ARE permitted —
 *   View Full Agreement, Review & Sign, PDF — stay on the card beside it.
 *
 * NOTHING INVENTED
 *   Every value is read from the row and rendered through the shared formatters
 *   in `services/bookingAgreement` and `services/agreementStatus`. A field the
 *   coach never filled in says "Not specified" / "To be agreed", which is the
 *   same honesty `buildAgreementTerms` writes into the document itself.
 */

import React from 'react';
import { CheckCircle2, Clock3, Info, ShieldCheck } from 'lucide-react';
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
import {
  sessionDateFor,
  sessionLocationFor,
  sessionTypeFor,
  type AgreementBooking,
} from '../services/agreementStatus';
import { cn } from '@/components/shared/cn';

/** One labelled value. `wide` gives prose fields the full row. */
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-xs font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-divider px-4 py-3.5 first:border-t-0 sm:px-5">
      <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text">
        {title}
      </h4>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** "Not specified" / "To be agreed" — never a blank cell, never a guess. */
const BLANK = 'Not specified';

function text(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  return v.length > 0 ? v : BLANK;
}

/** Multi-line prose, preserving the line breaks the document was written with. */
function Prose({ value }: { value: string | null | undefined }) {
  const v = (value ?? '').trim();
  if (!v) return <>{BLANK}</>;
  return (
    <span className="whitespace-pre-line leading-relaxed text-muted-foreground">{v}</span>
  );
}

function SignatureRow({
  party,
  name,
  signedAt,
}: {
  party: string;
  name: string;
  signedAt: string | null;
}) {
  const signed = Boolean(signedAt);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            signed ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'
          )}
        >
          {signed ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Clock3 className="h-3.5 w-3.5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-foreground">{party}</p>
          <p className="truncate text-[11px] text-muted-foreground">{name}</p>
        </div>
      </div>
      <p
        className={cn(
          'shrink-0 text-right text-[11px] font-semibold',
          signed ? 'text-success' : 'text-muted-foreground'
        )}
      >
        {signed ? formatDateTime(signedAt) : 'Awaiting signature'}
      </p>
    </div>
  );
}

export function AgreementTermsForm({
  agreement,
  booking,
  currentUserId,
  className = '',
}: {
  agreement: BookingAgreement;
  booking?: AgreementBooking | null;
  currentUserId: string;
  className?: string;
}) {
  const iAmClient = agreement.client_id === currentUserId;
  const sessionDate = sessionDateFor(agreement, booking);
  const window = noticeWindow(agreement);
  const ref = agreementReference(agreement);

  /* A short, truthful statement of who may change these terms, taken from the
     trigger's rules rather than from a hope that the UI is the only guard. */
  const editRule = iAmClient
    ? 'These terms are set by your coach. You can review the full document and add your signature — the terms themselves are locked once the agreement is sent.'
    : 'These terms were generated from your published profile when you accepted this booking. They are locked once sent; the client still has to sign before the session is confirmed.';

  return (
    <section
      aria-label={`Terms of session agreement ${ref}`}
      className={cn(
        'w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
        className
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-divider bg-muted/30 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text"
          >
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-foreground">Agreement terms</h3>
            <p className="text-[11px] text-muted-foreground">
              Every field this agreement supports, for {ref}
            </p>
          </div>
        </div>
      </header>

      <Group title="Session">
        <Field label="Session type">{text(sessionTypeFor(agreement, booking))}</Field>
        <Field label="Duration">{text(agreement.session_duration)}</Field>
        <Field label="Date">
          {sessionDate ? formatDate(sessionDate) : 'To be agreed'}
        </Field>
        <Field label="Time">
          {booking?.start_time ? (
            <>
              {formatTime(booking.start_time)}
              {booking.end_time ? ` – ${formatTime(booking.end_time)}` : ''}
            </>
          ) : agreement.scheduled_at ? (
            formatDateTime(agreement.scheduled_at)
          ) : (
            'To be agreed'
          )}
        </Field>
        <Field label="Location" wide>
          {text(sessionLocationFor(agreement, booking))}
        </Field>
        <Field label="Scope" wide>
          <Prose value={agreement.content} />
        </Field>
      </Group>

      <Group title="Commercial">
        <Field label="Rate / fee">
          <span className="text-accent-text">
            {formatMoney(agreement.rate ?? agreement.appointment_price)}
          </span>
        </Field>
        <Field label="Payment method">{text(agreement.payment_method)}</Field>
        <Field label="Payment terms" wide>
          <Prose value={agreement.payment_terms} />
        </Field>
      </Group>

      <Group title="Terms & cancellation">
        <Field label="Notice period">{window ?? 'None published'}</Field>
        <Field label="Cancellation method">{text(agreement.cancellation_method)}</Field>
        <Field label="Cancellation terms" wide>
          <Prose value={agreement.cancellation_terms} />
        </Field>
        <Field label="Terms" wide>
          <Prose value={agreement.terms} />
        </Field>
        <Field label="Responsibilities" wide>
          <Prose value={agreement.responsibilities} />
        </Field>
      </Group>

      <Group title="Document">
        <Field label="Reference">{ref}</Field>
        <Field label="Version">{text(agreement.version)}</Field>
        <Field label="Written on">
          {agreement.agreement_date ? formatDate(agreement.agreement_date) : 'Not recorded'}
        </Field>
        <Field label="Agreement status">{text(agreement.status)}</Field>
      </Group>

      <Group title="Signatures">
        <div className="space-y-2 sm:col-span-2">
          <SignatureRow
            party="Client"
            name={fullName(agreement.client) || '—'}
            signedAt={agreement.client_signed_at}
          />
          <SignatureRow
            party="Coach"
            name={fullName(agreement.coach) || '—'}
            signedAt={agreement.coach_signed_at}
          />
        </div>
      </Group>

      <p className="flex items-start gap-2 border-t border-divider bg-muted/20 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground sm:px-5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
        <span>{editRule}</span>
      </p>
    </section>
  );
}

export default AgreementTermsForm;
