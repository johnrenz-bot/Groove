'use client';

/**
 * HubCasePanel - right rail of the hub (desktop).
 *
 * Answers three questions at a glance, in grouped cards:
 *   1. WHO is the counterpart (avatar, verified badge, discipline)
 *   2. WHAT does the booking look like (date/time, place, ref, rate)
 *   3. WHERE in the pipeline are we (SignoffStepper - vertical here)
 *   4. NOTES (purpose + message, when they exist)
 *
 * With no case selected it renders a calm placeholder. The parent enforces
 * layout, so this component just draws.
 */
import React from 'react';
import { MapPin, CalendarDays, FileSignature, Hash } from 'lucide-react';
import { formatBookingDate, formatClock } from '@/features/appointments/services/bookingTime';
import { SignoffStepper } from './SignoffStepper';
import { getInitials } from '@/lib/utils';
import { deriveStepperSteps } from '../services/stepper';
import { stampMap } from '../services/stamps';
import { SEP_DOT } from '@/lib/typography';
import { VerifiedBadge as VerifiedChip } from '@/features/verification/components/VerifiedBadge';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import type { HubRole } from '../types';

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border   border-divider bg-card p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-subtle-foreground">
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function HubCasePanel({
  detail,
  role,
  onOpenAgreement,
}: {
  detail: BookingDetail | null;
  role: HubRole;
  onOpenAgreement: () => void;
}) {
  if (!detail) {
    return (
      <div className="select-none p-5 text-xs leading-relaxed text-muted-foreground">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-subtle-foreground">
          Case panel
        </p>
        <p className="mt-2">
          Pick a conversation to see the booking and who still needs to sign.
        </p>
      </div>
    );
  }

  const appointment = detail.appointment;
  const counterpart = role === 'client' ? appointment.coach : appointment.client;
  const counterpartPhoto = counterpart?.photo_url ?? null;
  const clientPhoto = appointment.client?.photo_url ?? null;
  const coachPhoto = appointment.coach?.photo_url ?? null;
  const name =
    role === 'client'
      ? [appointment.coach?.firstname, appointment.coach?.lastname].filter(Boolean).join(' ') ||
        appointment.coach?.username ||
        'Your coach'
      : appointment.name ||
        [appointment.client?.firstname, appointment.client?.lastname].filter(Boolean).join(' ') ||
        'Your student';
  const discipline = appointment.talent || 'Dance';
  const isOnline = Boolean(appointment.is_online);
  const ref = String(appointment.appointment_id ?? appointment.id).padStart(5, '0');
  const verified =
    role === 'client'
      ? appointment.coach?.account_verified
      : appointment.client?.account_verified;

  const steps = deriveStepperSteps({
    status: appointment.status,
    stamps: stampMap(detail),
    createdAt: appointment.created_at ?? null,
    agreement: detail.agreement ?? null,
    feedback: appointment.feedback ?? null,
    clientId: appointment.client_id,
    coachId: appointment.coach_id,
    viewerId: role === 'coach' ? appointment.coach_id : appointment.client_id,
    names: {
      [appointment.client_id]:
        role === 'coach'
          ? [appointment.client?.firstname, appointment.client?.lastname].filter(Boolean).join(' ').trim() || 'Client'
          : 'You',
      [appointment.coach_id]:
        role === 'client'
          ? [appointment.coach?.firstname, appointment.coach?.lastname].filter(Boolean).join(' ').trim() || 'Coach'
          : 'You',
    },
  });

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4" aria-label="Case panel">
      {/* Counterpart */}
      <Card title="Counterpart">
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-xs font-bold text-accent-text">
            {counterpartPhoto ? (
              // Partner photo from the app's own CDN; same exception as everywhere.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={counterpartPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(counterpart?.firstname ?? undefined, counterpart?.lastname ?? undefined)
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">{name}</p>
            {role === 'client' && (
              <span className="mt-1 inline-flex">
                {verified ? <VerifiedChip verified size="sm" label="Verified coach" /> : null}
              </span>
            )}
            {role === 'coach' && (
              <p className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {discipline}
              </p>
            )}
            {role === 'client' && (
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                {discipline}
                {appointment.experience ? ` ${SEP_DOT} ${appointment.experience}` : ''}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Session */}
      <Card title="Session">
        <dl className="grid gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            <dd className="min-w-0 font-medium text-foreground">
              {formatBookingDate(appointment.date)}
              <span className="block tabular-nums">
                {formatClock(appointment.start_time)} - {formatClock(appointment.end_time)}
              </span>
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            <dd className="min-w-0 truncate">
              {isOnline ? 'Online session' : appointment.address || 'TBC'}
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            <dd className="min-w-0 tabular-nums">Ref #{ref}</dd>
          </div>
        </dl>
        {appointment.rate != null && (
          <p className="mt-2 rounded-xl border border-border bg-muted/60 px-2.5 py-1.5 text-[10px] font-semibold text-foreground">
            Rate: {String(appointment.rate)}
          </p>
        )}
      </Card>

      {/* Sign-offs */}
      <Card
        title="Sign-offs"
        action={
          detail.agreement ? (
            <button
              type="button"
              onClick={onOpenAgreement}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-border bg-background px-2 text-[9px] font-semibold text-accent-text transition hover:border-accent-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileSignature className="h-3 w-3" aria-hidden="true" />
              Agreement
            </button>
          ) : undefined
        }
      >
        <SignoffStepper steps={steps} avatars={{ client: clientPhoto, coach: coachPhoto }} />
      </Card>

      {/* Notes */}
      {(appointment.purpose || appointment.message) && (
        <Card title="Notes">
          {appointment.purpose && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">Goal: </span>
              {appointment.purpose}
            </p>
          )}
          {appointment.message && (
            <p className="mt-2 text-[11px] italic leading-relaxed text-muted-foreground">
              &ldquo;{appointment.message}&rdquo;
            </p>
          )}
        </Card>
      )}

      {/* Terminal notice */}
      {['declined', 'cancelled', 'expired', 'no_show'].includes(appointment.status) && (
        <p role="status" className="rounded-2xl border border-border bg-danger-soft px-4 py-2 text-[10px] font-semibold leading-relaxed text-danger">
          {terminalNotice(appointment.status)}
        </p>
      )}
    </div>
  );
}

function terminalNotice(status: string): string {
  switch (status) {
    case 'declined':
      return 'This request was declined. You can rebook with this coach.';
    case 'cancelled':
      return 'This booking was cancelled.';
    case 'expired':
      return 'The time passed without a response. Rebook or pick another coach.';
    case 'no_show':
      return 'Marked as a no-show by the coach.';
    default:
      return 'This case is closed.';
  }
}

