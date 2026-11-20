'use client';

/**
 * HubCaseView - the center piece of the hub.
 *
 * Tabs: Messages | Appointment | Agreement | Schedule.
 * The content of each tab is a thin adapter around EXISTING, already-tested
 * components from features/appointments and features/booking. Nothing about
 * the underlying booking state machine changes here.
 *
 * Props come from the page wrapper; message/thread state lives here so the
 * tab is a first-class surface (not a modal on top of /messages).
 */
import React, { useEffect, useRef, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CalendarDays,
  FileSignature,
  CalendarClock,
  ClipboardList,
  AlertCircle,
  Clock3,
  CheckCircle2,
  MoreHorizontal,
  X as XIcon,
  RotateCcw,
  Hash,
  Tag,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import {
  formatBookingDate,
  formatClock,
} from '@/features/appointments/services/bookingTime';
import { statusMeta, availableActions, type ActionSpec } from '@/features/appointments/services/bookingStatus';
import { Badge } from '@/components/ui/Badge';
import { deriveStepperSteps } from '../services/stepper';
import { stampMap } from '../services/stamps';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { SignoffStepper } from './SignoffStepper';
import { BookingAgreementPanel } from '@/features/appointments/components/BookingAgreementPanel';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import type { Profile } from '@/lib/types';
import type { HubRole, HubSection } from '../types';
import { SEP_DOT } from '@/lib/typography';
import { HubChat } from './HubChat';
import { HubBookingRequestForm } from './HubBookingRequestForm';

const SECTION_ICONS: Record<HubSection, React.ReactNode> = {
  messages: <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />,
  appointment: <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />,
  agreement: <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />,
  schedule: <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />,
};

const SECTION_LABELS: Record<HubSection, string> = {
  messages: 'Messages',
  appointment: 'Booking',
  agreement: 'Agreement',
  schedule: 'Schedule',
};

export function HubCaseView({
  detail,
  partner,
  viewer,
  role,
  viewerId,
  section,
  onSectionChange,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onNoShow,
  onCancel,
  onRequestCreated,
  unreadCount = 0,
}: {
  detail: BookingDetail | null;
  partner: Profile | null;
  viewer: Profile;
  role: HubRole;
  viewerId: string;
  section: HubSection;
  onSectionChange: (section: HubSection) => void;
  onAccept: (detail: BookingDetail) => void;
  onDecline: (detail: BookingDetail) => void;
  onStart: (detail: BookingDetail) => void;
  onComplete: (detail: BookingDetail) => void;
  onNoShow: (detail: BookingDetail) => void;
  onCancel: (detail: BookingDetail) => void;
  /** Called after the inline request form succeeds - parent refreshes the snapshot. */
  onRequestCreated?: () => void;
  /** Unread count in this thread from the viewer's own POV. */
  unreadCount?: number;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Signature timeline data, used for the chat's compact system rows.
  const timelineNames = useMemo(
    () => {
      const map: Record<string, string> = {};
      if (detail) {
        map[detail.appointment.client_id] =
          role === 'coach'
            ? [partner?.firstname, partner?.lastname].filter(Boolean).join(' ').trim() || 'Client'
            : 'You';
        map[detail.appointment.coach_id] =
          role === 'client'
            ? [partner?.firstname, partner?.lastname].filter(Boolean).join(' ').trim() || 'Coach'
            : 'You';
        map[viewerId] = 'You';
      }
      return map;
    },
    [detail, partner, role, viewerId]
  );

  // Empty state - no conversation selected at all.
  if (!partner) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="shrink-0   border-b border-divider bg-card/80">
          <div className="px-4 py-3 text-xs text-muted-foreground">
            Select a conversation on the left, or open a booking from the board.
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Nothing selected</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Bookings you accept will appear here with the full thread, agreement and tracker.
          </p>
        </div>
      </div>
    );
  }

  // A partner with no booking yet: the thread still works, and the client can
  // send the request from here.
  if (!detail) {
    const quickReplies =
      role === 'client'
        ? ['Hi! I would like to book a session.', 'What slots do you have this week?']
        : ['Sure, let us find a time.', 'Please send a booking request.'];
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div role="tablist" aria-label="Booking sections" className="flex shrink-0 gap-1 overflow-x-auto   border-b border-divider bg-card px-2 py-1.5">
          {(Object.keys(SECTION_LABELS) as HubSection[]).map((key) => {
            const active = key === section;
            return (
              <button
                key={key}
                role="tab"
                id={`hub-tab-${key}`}
                aria-selected={active}
                aria-controls={`hub-panel-${key}`}
                onClick={() => onSectionChange(key)}
                className={cn(
                  'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:border-accent-border hover:text-foreground'
                )}
              >
                {SECTION_ICONS[key]}
                {SECTION_LABELS[key]}
              </button>
            );
          })}
        </div>
        <div id="hub-panel-no-booking" role="tabpanel" aria-labelledby={`hub-tab-${section}`} className="min-h-0 flex-1 overflow-y-auto">
          {section === 'messages' && (
            <HubChat viewer={viewer} partner={partner} className="h-full" quickReplies={quickReplies} />
          )}
          {section === 'appointment' && role === 'client' && (
            <HubBookingRequestForm
              clientProfile={viewer}
              coach={partner}
              onCreated={() => {
                onRequestCreated?.();
                onSectionChange('appointment');
              }}
              onCancel={() => onSectionChange('messages')}
            />
          )}
          {section === 'appointment' && role === 'coach' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Waiting for their first request</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                When they send a booking request, the case will open here with its tracker and agreement.
              </p>
            </div>
          )}
          {(section === 'agreement' || section === 'schedule') && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Nothing here yet</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                This fills in after the first booking is requested.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const appointment = detail.appointment;
  const appointmentStatus = appointment.status;
  const counterpartName =
    [partner.firstname, partner.lastname].filter(Boolean).join(' ').trim() ||
    partner.username ||
    (role === 'client' ? 'your coach' : 'your student');

  // - Case header derivations -
  const stamps = stampMap(detail);
  const steps = deriveStepperSteps({
    status: appointmentStatus,
    stamps,
    createdAt: appointment.created_at ?? null,
    agreement: detail.agreement ?? null,
    feedback: appointment.feedback ?? null,
    clientId: appointment.client_id,
    coachId: appointment.coach_id,
    viewerId,
    names: timelineNames,
  });
  const totalSteps = steps.length;
  const doneSteps = steps.filter((s) => s.state === 'done' || s.state === 'skipped').length;
  const currentIndex = steps.findIndex((s) => s.state === 'current');
  const stepNumber = currentIndex >= 0 ? currentIndex + 1 : totalSteps;
  const actions = availableActions({ status: appointmentStatus, role, coachVerified: true });
  const primaryAction = actions.find((a) => a.variant === 'primary') ?? null;
  const isTerminal = ['declined', 'cancelled', 'expired', 'no_show'].includes(appointmentStatus);
  const TERMINAL_NOTICE: Record<string, string> = {
    declined: 'The coach declined this request.',
    cancelled: 'This booking was cancelled.',
    expired: 'The time passed without a response.',
    no_show: 'The student did not show up.',
  };
  const refLabel = String(appointment.appointment_id ?? appointment.id).padStart(5, '0');
  const verified = role === 'client' ? appointment.coach?.account_verified : appointment.client?.account_verified;
  const viewerSigned =
    role === 'coach'
      ? Boolean(detail.agreement?.coach_signed_at)
      : Boolean(detail.agreement?.client_signed_at);
  const missingSignatures = !detail.agreement
    ? 0
    : (detail.agreement.client_signed_at ? 0 : 1) + (detail.agreement.coach_signed_at ? 0 : 1);
  const waitingOnMeSign = appointmentStatus === 'agreement_required' && !viewerSigned;

  const agreementBadge = missingSignatures;
  const unreadBadge = unreadCount;
  const overflowActions = actions.filter((a) =>
    primaryAction ? a.action !== primaryAction.action : true
  );
  const runActionFor = (d: BookingDetail, action: string) => {
    switch (action) {
      case 'accept': return onAccept(d);
      case 'decline': return onDecline(d);
      case 'start': return onStart(d);
      case 'complete': return onComplete(d);
      case 'no_show': return onNoShow(d);
      case 'cancel': return onCancel(d);
      default: break;
    }
  };
  const runPrimary = (action: string) => runActionFor(detail, action);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* - Case header - */}
      <header className="shrink-0   border-b border-divider bg-card/80 px-4 pb-2.5 pt-3">
        {/* Identity row */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-[10px] font-bold text-accent-text">
            {partner?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(partner?.firstname ?? undefined, partner?.lastname ?? undefined)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="truncate text-xs font-bold text-foreground">{counterpartName}</p>
              {verified ? <VerifiedBadge verified size="sm" label={role === 'client' ? 'Verified coach' : 'Verified client'} /> : null}
              <span className="inline-flex h-5 items-center rounded-full border border-border bg-muted px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {role === 'client' ? 'Client POV' : 'Coach POV'}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge variant={badgeVariant(statusMeta(appointmentStatus).badge)} dot>
                {statusMeta(appointmentStatus).label}
              </Badge>
              <span className="inline-flex h-5 items-center gap-1 rounded-full border border-border bg-background px-2 text-[9px] font-semibold tabular-nums text-muted-foreground">
                <Hash className="h-2.5 w-2.5" aria-hidden="true" />
                {refLabel}
              </span>
              <span className="inline-flex h-5 items-center gap-1 rounded-full border border-border bg-background px-2 text-[9px] font-semibold text-muted-foreground">
                <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                {appointment.talent || 'Dance'}
                {appointment.experience ? ` ${SEP_DOT} ${appointment.experience}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Banner row - one primary CTA + overflow for the rest */}
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2',
            waitingOnMeSign || primaryAction ? 'border-accent/40 bg-accent-soft' : 'border-divider bg-background/60',
            isTerminal && 'border-danger/30 bg-danger-soft'
          )}
        >
          <p className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-foreground">
            {isTerminal ? (
              <span className="flex items-start gap-1.5 text-danger">
                <XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {TERMINAL_NOTICE[appointmentStatus] ?? 'This case is closed.'}
              </span>
            ) : waitingOnMeSign ? (
              <span className="flex items-start gap-1.5 text-accent-text">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Your turn: sign the agreement.
              </span>
            ) : primaryAction ? (
              <span className="flex items-start gap-1.5 text-accent-text">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Your turn: {primaryAction.label.toLowerCase()}
              </span>
            ) : (
              <span className="flex items-start gap-1.5 text-muted-foreground">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Waiting on {counterpartName} {SEP_DOT} {statusMeta(appointmentStatus).label.toLowerCase()}
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {isTerminal ? (
              role === 'client' && appointmentStatus !== 'cancelled' ? (
                <Link
                  href="/client/talent"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-accent px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Rebook
                </Link>
              ) : (
                <Link
                  href={`${role === 'client' ? '/client' : '/coach'}/messages?view=board`}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-accent px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View board
                </Link>
              )
            ) : waitingOnMeSign ? (
              <button
                type="button"
                onClick={() => onSectionChange('agreement')}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-accent px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
                Sign
              </button>
            ) : primaryAction ? (
              <button
                type="button"
                onClick={() => runPrimary(primaryAction.action)}
                className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border bg-accent px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {primaryAction.label}
              </button>
            ) : null}

            {!isTerminal && overflowActions.length > 0 && (
              <OverflowMenu actions={overflowActions} onRun={(action) => runActionFor(detail, action)} />
            )}
          </div>
        </div>

        {/* Compact progress - Step X of N */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[9px] font-bold tabular-nums uppercase tracking-[0.1em] text-muted-foreground">
            Step {stepNumber} of {totalSteps}
          </span>
          <div
            role="progressbar"
            aria-label={`Booking progress: step ${stepNumber} of ${totalSteps}`}
            aria-valuemin={0}
            aria-valuemax={totalSteps}
            aria-valuenow={doneSteps}
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.round((doneSteps / totalSteps) * 100)}%` }}
            />
          </div>
        </div>
      </header>

      {/* Section tabs - segmented, with count badges */}
      <div role="tablist" aria-label="Booking sections" className="sticky top-0 z-10 flex shrink-0 gap-1   border-b border-divider bg-card px-2 py-1.5">
        {(Object.keys(SECTION_LABELS) as HubSection[]).map((key) => {
          const active = key === section;
          const badge = key === 'messages' ? unreadBadge : key === 'agreement' ? agreementBadge : 0;
          return (
            <button
              key={key}
              role="tab"
              id={`hub-tab-${key}`}
              aria-selected={active}
              aria-controls={`hub-panel-${key}`}
              onClick={() => onSectionChange(key)}
              className={cn(
                'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:border-accent-border hover:text-foreground'
              )}
            >
              {SECTION_ICONS[key]}
              {SECTION_LABELS[key]}
              {badge > 0 && (
                <span
                  aria-label={key === 'messages' ? `${badge} unread` : `${badge} signatures pending`}
                  className={cn(
                    'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none tabular-nums',
                    active ? 'bg-accent-foreground/20 text-accent-foreground' : 'bg-accent text-accent-foreground'
                  )}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div
        ref={scrollRef}
        id={`hub-panel-${section}`}
        role="tabpanel"
        aria-labelledby={`hub-tab-${section}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {section === 'messages' && (
          <HubChat
            viewer={viewer}
            partner={partner}
            className="h-full"
            events={detail.events}
            names={timelineNames}
            quickReplies={
              role === 'client'
                ? ['Sounds good, see you then.', 'Can we move it to another day?']
                : ['Sure, see you then.', 'Let us find another time.']
            }
          />
        )}

        {section === 'appointment' && (
          <div className="space-y-4 p-4 sm:p-6">
            <SignoffStepper
              steps={steps}
              layout="horizontal"
              avatars={{
                client: appointment.client?.photo_url ?? null,
                coach: appointment.coach?.photo_url ?? null,
              }}
            />

            <section aria-labelledby="hub-appointment-facts">
              <h3 id="hub-appointment-facts" className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Session
              </h3>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-border bg-muted/60 p-3">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">Date</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">{formatBookingDate(appointment.date)}</dd>
                </div>
                <div className="rounded-2xl border border-border bg-muted/60 p-3">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">Time</dt>
                  <dd className="mt-0.5 tabular-nums font-semibold text-foreground">{formatClock(appointment.start_time)} - {formatClock(appointment.end_time)}</dd>
                </div>
                <div className="rounded-2xl border border-border bg-muted/60 p-3 col-span-2">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">Location</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">{appointment.is_online ? 'Online session' : appointment.address}</dd>
                </div>
                <div className="rounded-2xl border border-border bg-muted/60 p-3">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">Discipline</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">{appointment.talent || 'Dance'}{appointment.experience ? ` | ${appointment.experience}` : ''}</dd>
                </div>
                <div className="rounded-2xl border border-border bg-muted/60 p-3">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">Rate</dt>
                  <dd className="mt-0.5 tabular-nums font-semibold text-foreground">{appointment.rate ?? '-'}</dd>
                </div>
              </dl>
              {appointment.purpose && (
                <p className="mt-3 rounded-2xl border border-border bg-muted/60 p-3 text-[11px] leading-relaxed text-foreground/90">
                  <span className="font-semibold text-muted-foreground">Goal: </span>
                  {appointment.purpose}
                </p>
              )}
              {appointment.message && (
                <blockquote className="mt-2 border-l-2 border-border pl-3 text-[11px] text-muted-foreground">
                  &ldquo;{appointment.message}&rdquo;
                </blockquote>
              )}
            </section>
          </div>
        )}

        {section === 'agreement' && (
          <div className="space-y-3 p-4 sm:p-6">
            {detail.agreement ? (
              <BookingAgreementPanel
                agreement={detail.agreement}
                bookingStatus={appointmentStatus}
                userId={viewerId}
                onChanged={() => onSectionChange('agreement')}
              />
            ) : (
              <div role="status" className="flex items-center gap-2 rounded-2xl border border-border bg-warning-soft px-3 py-2.5 text-[11px] text-warning">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {appointmentStatus === 'agreement_required' || appointmentStatus === 'accepted'
                  ? 'The agreement is being prepared. Refresh if this persists.'
                  : 'No agreement yet - the coach sends this after accepting.'}
              </div>
            )}
          </div>
        )}

        {section === 'schedule' && (
          <div className="p-4 sm:p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Upcoming schedule
            </h3>
            <p className="mt-1 text-[10px] text-subtle-foreground">
              Dates are your local timezone (UTC stored).
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">Current session</dt>
                <dd className="font-semibold text-foreground">
                  {formatBookingDate(appointment.date)} at {formatClock(appointment.start_time)}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-semibold text-foreground">{statusMeta(appointmentStatus).label}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">Counterpart</dt>
                <dd className="font-semibold text-foreground">{counterpartName}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              For a full view, open the <a href={role === 'client' ? '/client/calendar' : '/coach/calendar'} className="font-semibold text-accent-text underline underline-offset-2">calendar</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function badgeVariant(b: string): 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' {
  return b === 'pending' ? 'pending' : b === 'info' ? 'scheduled' : b === 'success' ? 'confirmed' : b === 'neutral' ? 'completed' : 'cancelled';
}

function OverflowMenu({
  actions,
  onRun,
}: {
  actions: ActionSpec[];
  onRun: (action: ActionSpec['action']) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-divider bg-background text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="More actions"
          className="absolute right-0 top-10 z-30 w-60 rounded-xl border border-border bg-background p-1.5 shadow-lg"
        >
          {actions.map((a) => (
            <button
              key={a.action}
              role="menuitem"
              type="button"
              disabled={Boolean(a.blockedReason)}
              title={a.blockedReason ?? undefined}
              onClick={() => { setOpen(false); onRun(a.action); }}
              className={cn(
                'flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60',
                a.variant === 'danger' && 'text-danger hover:bg-danger-soft'
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
