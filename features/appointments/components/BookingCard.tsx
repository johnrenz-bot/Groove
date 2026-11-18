'use client';

/**
 * One booking, on either dashboard. Compact by default; every fact of the
 * booking lives one tap away behind "Details" instead of a full-screen dialog.
 *
 * LAYOUT
 *   - Identity row: avatar + name (verified badge for coaches), discipline,
 *     "updated ... ago".
 *   - When/where/status chips + countdown.
 *   - The session goal (if any) in one calm callout.
 *   - Actions row: ONE primary CTA for the current status, an icon button for
 *     Messages, a calendar (.ics) icon button, a Google Calendar item and an
 *     overflow menu (kebab) with secondary actions.
 *   - "Details" expands inline: the shared tracker (incl. history + what's
 *     next), the agreement panel, a notes editor and the full role-aware
 *     action set (<BookingActions density="details">).
 *
 * OVERFLOW MENU
 *   View details / Add to Calendar (.ics) / Google Calendar / Reschedule
 *   (client or coach, when the booking can still move) / Copy booking
 *   reference / Cancel booking - Cancel opens an INLINE confirm inside the
 *   menu with an optional reason, never a full-screen modal.
 *
 * The menu, focus and Escape behaviour are self-contained; the card is the
 * containing block (the article does NOT need overflow hidden for this).
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FileSignature,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Pencil,
  Play,
  Star,
  Trash2,
} from 'lucide-react';
import type { BookingDetail } from '../services/bookingService';
import { sendBookingReminder, updateBookingNotes } from '../services/bookingService';
import { statusMeta } from '../services/bookingStatus';
import {
  formatBookingDate,
  formatClock,
  formatRelativeTime,
  getBookingCountdown,
  isActiveStatus,
  parseBookingStart,
} from '../services/bookingTime';
import { hasPendingReschedule } from '../services/rescheduleRequest';
import { downloadIcs, googleCalendarUrl } from '../services/ics';
import { SEP_DOT, EN_DASH } from '@/lib/typography';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VerifiedBadge } from '@/features/verification/components/VerifiedBadge';
import { cn } from '@/components/shared/cn';
import { getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { BookingTracker } from './BookingTracker';
import { BookingActions, type BookingActionsProps } from './BookingActions';
import { BookingAgreementPanel } from './BookingAgreementPanel';

const BADGE_VARIANT: Record<string, BadgeVariant> = {
  pending: 'pending',
  info: 'scheduled',
  success: 'confirmed',
  neutral: 'completed',
  danger: 'cancelled',
};

const COUNTDOWN_TONE = {
  urgent: ' bg-danger-soft text-danger',
  soon: ' bg-warning-soft text-warning',
  normal: ' border-accent-border bg-accent-soft text-accent-text',
  past: ' border border-border bg-muted text-muted-foreground',
} as const;

export interface BookingCardProps
  extends Omit<
    BookingActionsProps,
    'detail' | 'density' | 'className' | 'showReview' | 'onStart' | 'onNoShow' | 'onDecline'
  > {
  detail: BookingDetail;
  nowMs: number;
  /** Lifecycle stamps, from `stampsFor(appointment)`. */
  stamp: Partial<Record<string, string | null>>;
  /** The signed-in viewer, for the agreement panel. */
  viewerId: string;
  showReview?: boolean;
  /** Highlights the card after a realtime change for ~1.5s. */
  flash?: boolean;
  className?: string;
  /** (detail, reason?) - the optional reason is captured in the inline confirm. */
  onDecline: (detail: BookingDetail, reason?: string | null) => void;
  onReschedule: (detail: BookingDetail) => void;
  onStart?: (detail: BookingDetail) => void;
  onNoShow?: (detail: BookingDetail) => void;
  onCancel: (detail: BookingDetail, reason?: string | null) => void;
  /** Coach-only: pending request overlapping another active booking. */
  conflict?: boolean;
  /** Coach requests tab: a checkbox to batch-select this request. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (appointmentId: number, next: boolean) => void;
}

/** One primary action per status - never more than one. */
function PrimaryCta({
  detail,
  role,
  busy = false,
  showReview,
  onAccept,
  onStart,
  onComplete,
  onReview,
  onExpand,
  expandDisabled = false,
}: {
  detail: BookingDetail;
  role: 'client' | 'coach';
  busy?: boolean;
  showReview: boolean;
  onAccept: (d: BookingDetail) => void;
  onStart?: (d: BookingDetail) => void;
  onComplete: (d: BookingDetail) => void;
  onReview?: (d: BookingDetail) => void;
  onExpand: () => void;
  expandDisabled?: boolean;
}) {
  const appointment = detail.appointment;
  const status = appointment.status;
  const counterpartyId = role === 'client' ? appointment.coach_id : appointment.client_id;
  const hubMessagesHref = role === 'client' ? '/client/messages' : '/coach/messages';

  if (role === 'client') {
    switch (status) {
      case 'pending':
      case 'accepted':
        return (
          <Link href={`${hubMessagesHref}?conversation=${counterpartyId}`}>
            <Button
              type="button"
              size="sm"
              icon={<MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Message your coach
            </Button>
          </Link>
        );
      case 'agreement_required':
        return (
          <Button
            type="button"
            size="sm"
            icon={<FileSignature className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={onExpand}
            disabled={expandDisabled}
          >
            Sign agreement
          </Button>
        );
      case 'confirmed':
      case 'in_progress': {
        const address =
          appointment.is_online || !appointment.address
            ? null
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.address)}`;
        return address ? (
          <a href={address} target="_blank" rel="noopener noreferrer">
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={<Navigation className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Directions
            </Button>
          </a>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() =>
              downloadIcs({ appointment, counterpartyName: 'your coach' })
            }
          >
            Add to calendar
          </Button>
        );
      }
      case 'completed':
        if (showReview) {
          return (
            <Button
              type="button"
              size="sm"
              icon={<Star className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => onReview?.(detail)}
              disabled={busy}
            >
              Leave review
            </Button>
          );
        }
        return (
          <Link href={`/userprofile/${appointment.coach_id}`}>
            <Button
              type="button"
              size="sm"
              icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Book again
            </Button>
          </Link>
        );
      case 'expired':
      case 'cancelled':
        return (
          <Link href={`/userprofile/${appointment.coach_id}`}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Rebook with this coach
            </Button>
          </Link>
        );
      case 'declined':
        return (
          <Link href="/client/talent">
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Find another coach
            </Button>
          </Link>
        );
      default:
        return null;
    }
  }

  // Coach side
  switch (status) {
    case 'pending':
      return (
        <Button
          type="button"
          size="sm"
          icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => onAccept(detail)}
          disabled={busy}
        >
          Accept request
        </Button>
      );
    case 'accepted':
      return (
        <Button
          type="button"
          size="sm"
          icon={<FileSignature className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => onAccept(detail)}
          disabled={busy}
        >
          Send agreement
        </Button>
      );
    case 'agreement_required':
      return (
        <Link href={`${hubMessagesHref}?conversation=${counterpartyId}`}>
          <Button type="button" size="sm" variant="outline">
            Message your client
          </Button>
        </Link>
      );
    case 'confirmed':
      return (
        <Button
          type="button"
          size="sm"
          icon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => onStart?.(detail)}
          disabled={busy}
        >
          Start session
        </Button>
      );
    case 'in_progress':
      return (
        <Button
          type="button"
          size="sm"
          icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => onComplete(detail)}
          disabled={busy}
        >
          Mark completed
        </Button>
      );
    default:
      return null;
  }
}

/**
 * One booking, on either dashboard.
 *
 * The card is an OVERVIEW. The full agreement, every field and the audit
 * history live one tap away in the inline "Details" panel, so a long history
 * never pushes the next booking off the screen.
 */
export function BookingCard({
  detail,
  role,
  nowMs,
  stamp,
  viewerId,
  busy = false,
  canWrite,
  writeBlockedReason,
  showReview = false,
  flash = false,
  className,
  conflict = false,
  selectable = false,
  selected = false,
  onToggleSelect,
  onReschedule,
  onStart,
  onNoShow,
  onCancel,
  onAccept,
  onDecline,
  onComplete,
  onApproveReschedule,
  onDismissReschedule,
  onReview,
}: BookingCardProps) {
  const appointment = detail.appointment;
  const meta = statusMeta(appointment.status);
  const counterparty = role === 'client' ? appointment.coach : appointment.client;
  const counterpartyName =
    role === 'client'
      ? [appointment.coach?.firstname, appointment.coach?.lastname]
          .filter(Boolean)
          .join(' ') ||
        appointment.coach?.username ||
        'your coach'
      : appointment.name ||
        [appointment.client?.firstname, appointment.client?.lastname]
          .filter(Boolean)
          .join(' ') ||
        'your client';

  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /** 'cancel' | 'decline' | null - the inline confirm that replaces a modal. */
  const [confirmKind, setConfirmKind] = useState<'cancel' | 'decline' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noShowConfirm, setNoShowConfirm] = useState(false);
  const [reminderState, setReminderState] = useState<'idle' | 'sending' | string>('idle');
  const [note, setNote] = useState<string>(
    role === 'client' ? appointment.message ?? '' : appointment.coach_notes ?? ''
  );
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const kebabRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const countdown = getBookingCountdown(
    appointment.status,
    appointment.date,
    appointment.start_time,
    nowMs
  );
  const requestPending =
    hasPendingReschedule(appointment) && isActiveStatus(appointment.status);
  const clientDisplayName =
    appointment.name ||
    [appointment.client?.firstname, appointment.client?.lastname].filter(Boolean).join(' ') ||
    'Client';
  const coachDisplayName =
    [appointment.coach?.firstname, appointment.coach?.lastname].filter(Boolean).join(' ') ||
    appointment.coach?.username ||
    'Coach';
  // loadBookings joins only the COUNTERPARTY, so the viewer's own profile is not
  // available here. Build both actor names from the appointment itself and map
  // the viewer to "You"; falling back to "Someone" would be worse than a label.
  const actorNames: Record<string, string> = {
    [appointment.client_id]: role === 'client' ? 'You' : clientDisplayName,
    [appointment.coach_id]: role === 'coach' ? 'You' : coachDisplayName,
  };
  const needsAttention =
    requestPending ||
    (role === 'coach' && appointment.status === 'pending') ||
    appointment.status === 'agreement_required';

  const updatedLabel = formatRelativeTime(
    appointment.updated_at ?? appointment.created_at,
    nowMs
  );

  // Session due soon (or in progress) chip - honest urgency, 24h / 1h window.
  const startsAt = parseBookingStart(appointment.date, appointment.start_time);
  const msUntilStart = startsAt ? startsAt.getTime() - nowMs : null;
  const dueSoon =
    (appointment.status === 'confirmed' || appointment.status === 'in_progress') &&
    msUntilStart !== null &&
    msUntilStart > 0 &&
    msUntilStart <= 24 * 60 * 60 * 1000;

  // - Overflow menu: outside click + Escape close, focus returns to the kebab -
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || kebabRef.current?.contains(target)) return;
      setMenuOpen(false);
      setConfirmKind(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setConfirmKind(null);
        kebabRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const sendReminder = async () => {
    setReminderState('sending');
    try {
      const supabase = createClient();
      const result = await sendBookingReminder(supabase, appointment.id);
      setReminderState(result === 'sent' ? 'sent' : result);
    } catch (err) {
      setReminderState(
        err instanceof Error ? err.message : 'The reminder could not be sent.'
      );
    } finally {
      window.setTimeout(() => setReminderState('idle'), 4000);
    }
  };

  const copyReference = async () => {
    const ref = `BOOKING-${String(appointment.id).padStart(5, '0')}`;
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
    } catch {
      setCopied(true); // visual parity; nothing is secret in the reference
    }
    window.setTimeout(() => setCopied(false), 1500);
  };

  const saveNote = async () => {
    setSavingNote(true);
    setNoteError(null);
    try {
      const supabase = createClient();
      await updateBookingNotes(supabase, {
        appointmentId: appointment.id,
        role,
        message: role === 'client' ? note : undefined,
        coachNotes: role === 'coach' ? note : undefined,
      });
      setNoteSaved(true);
      window.setTimeout(() => setNoteSaved(false), 1500);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'The note could not be saved.');
    } finally {
      setSavingNote(false);
    }
  };

  const googleUrl = googleCalendarUrl({ appointment, counterpartyName });
  const showGoogle = Boolean(googleUrl);
  const calendarInput = useMemo(
    () => ({ appointment, counterpartyName }),
    [appointment, counterpartyName]
  );

  const canCancel = isActiveStatus(appointment.status);
  const canReschedule = canCancel && !requestPending;

  const noteVisible =
    appointment.status !== 'cancelled' &&
    appointment.status !== 'declined' &&
    appointment.status !== 'expired' &&
    appointment.status !== 'no_show';

  return (
    <article
      id={`booking-${appointment.id}`}
      data-flash={flash || undefined}
      className={cn(
        'group relative rounded-[20px] border border-border bg-card p-5 transition-colors sm:p-6',
        flash && 'booking-flash',
        needsAttention
          ? ' shadow-[var(--shadow-sm)]'
          : ' hover:',
        className
      )}
    >
      {/* A single gold edge marks the cards that need a decision. It is
          decoration, not information: the badge and the tracker say the same
          thing in text. */}
      {needsAttention && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-[20px] bg-brand-sunburst"
        />
      )}

      {/* - Identity + status - */}
      <div className="flex flex-col items-start justify-between gap-3 pb-4  sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {selectable && (
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`Select ${role === 'coach' ? clientDisplayName : counterpartyName} for batch action`}
              onClick={() => onToggleSelect?.(appointment.id, !selected)}
              className={cn(
                'inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border  transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? ' border-accent-border bg-accent text-accent-foreground' : ' border border-border bg-card text-muted-foreground hover:border-accent-border hover:border-border'
              )}
            >
              {selected && <Check className="h-5 w-5" aria-hidden="true" />}
            </button>
          )}
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden  bg-muted text-sm font-bold text-accent-text shadow-sm',
              role === 'client' ? 'rounded-2xl' : 'rounded-full'
            )}
          >
            {counterparty?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={counterparty.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>
                {role === 'client'
                  ? getInitials(appointment.coach?.firstname, appointment.coach?.lastname)
                  : getInitials(appointment.client?.firstname, appointment.client?.lastname)}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-foreground sm:text-base">
                {role === 'client' ? `Session with ${counterpartyName}` : counterpartyName}
              </h3>
              {role === 'coach' &&
                (appointment.client?.account_verified ? (
                  <VerifiedBadge verified size="sm" label="Verified client" />
                ) : (
                  <Badge variant="pending" dot>
                    Client unverified
                  </Badge>
                ))}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {appointment.session_type} {SEP_DOT}{' '}
              <span className="font-semibold text-accent-text">
                {appointment.talent || 'Dance'}
              </span>
              {role === 'coach' && appointment.experience
                ? ` ${SEP_DOT} Level: ${appointment.experience}`
                : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-subtle-foreground">
              Updated {updatedLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
          {countdown && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-bold tabular-nums',
                COUNTDOWN_TONE[countdown.tone]
              )}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {countdown.text}
            </span>
          )}
          {dueSoon && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning"
              title="Within 24 hours of the scheduled start"
            >
              Within 24h
            </span>
          )}
          {conflict && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger"
              title="This request overlaps another active session on this date"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Overlaps a booking
            </span>
          )}
          <Badge variant={BADGE_VARIANT[meta.badge] ?? 'neutral'} dot>
            {meta.label}
          </Badge>
        </div>
      </div>

      {/* - When / where - */}
      <dl className="grid grid-cols-1 gap-3 py-4 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Date</dt>
          <Calendar className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <dd className="font-medium tabular-nums text-foreground">
            {formatBookingDate(appointment.date)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Time</dt>
          <Clock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <dd className="font-medium tabular-nums text-foreground">
            {formatClock(appointment.start_time)} {EN_DASH} {formatClock(appointment.end_time)}
          </dd>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <dt className="sr-only">Location</dt>
          <MapPin className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <dd className="truncate">
            {appointment.is_online ? 'Online session' : appointment.address}
          </dd>
        </div>
      </dl>

      {appointment.purpose && (
        <div className="rounded-2xl border border-border bg-muted/60 p-3.5 text-xs leading-relaxed">
          <span className="font-semibold text-muted-foreground">
            {role === 'client' ? 'Rehearsal Goal: ' : 'Session Goal: '}
          </span>
          <span className="text-foreground">{appointment.purpose}</span>
          {role === 'coach' && appointment.message && (
            <p className="mt-1 italic text-muted-foreground">
              &ldquo;{appointment.message}&rdquo;
            </p>
          )}
        </div>
      )}

      {appointment.feedback && (
        <div className="mt-4 space-y-1.5 rounded-2xl border border-border bg-warning-soft p-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-warning">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span className="tabular-nums">
              {role === 'client' ? 'Your Review' : 'Student Rating'}: {appointment.rating} / 5
            </span>
          </div>
          <p className="leading-relaxed text-foreground/80">&ldquo;{appointment.feedback}&rdquo;</p>
        </div>
      )}

      {/* - Actions row - */}
      <div className="mt-4 flex flex-col gap-2  pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[36px]">
          <PrimaryCta
            detail={detail}
            role={role}
            busy={busy}
            showReview={showReview}
            onAccept={onAccept}
            onStart={onStart}
            onComplete={onComplete}
            onReview={onReview}
            onExpand={() => setExpanded(true)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Details toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Details
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              aria-hidden="true"
            />
          </button>

          {/* Add to calendar (.ics) */}
          <button
            type="button"
            onClick={() => downloadIcs(calendarInput)}
            title="Download .ics (Apple / Outlook)"
            aria-label="Download .ics calendar file"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Overflow menu */}
          <div className="relative shrink-0">
            <button
              ref={kebabRef}
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v);
                setConfirmKind(null);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More booking actions"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                aria-label="Booking actions"
                className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-2xl border border-border bg-elevated p-1.5 shadow-[var(--shadow-lg)]"
              >
                {confirmKind === null ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExpanded((v) => !v);
                        setMenuOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {expanded ? 'Hide details' : 'View details'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        downloadIcs(calendarInput);
                        setMenuOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                    >
                      <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      Add to Calendar
                    </button>
                    {showGoogle && (
                      <a
                        role="menuitem"
                        href={googleUrl ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        Add to Google Calendar
                      </a>
                    )}
                    {canReschedule && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onReschedule(detail);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        Propose new time
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void copyReference()}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                      {copied ? 'Copied to clipboard' : 'Copy booking reference'}
                    </button>
                    {canCancel && (
                      <>
                        <div className="my-1   bg-divider" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setConfirmKind('cancel')}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-danger transition hover:border-border-strong hover:bg-danger-soft focus-visible:outline-none focus-visible:bg-danger-soft"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Cancel booking
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  /* Inline destructive confirm - an optional reason, never a modal */
                  <div
                    className="space-y-2 p-2"
                    role="group"
                    aria-label={confirmKind === 'cancel' ? 'Cancel this booking?' : 'Decline this request?'}
                  >
                    <p className="text-xs font-bold text-foreground">
                      {confirmKind === 'cancel' ? 'Cancel this booking?' : 'Decline this request?'}
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {confirmKind === 'cancel'
                        ? 'This cannot be undone. The other party will be notified.'
                        : 'The client will be notified. They can rebook another time.'}
                    </p>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Reason (optional)
                      <textarea
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        rows={2}
                        maxLength={280}
                        placeholder="Tell them why, briefly..."
                        className="mt-1 w-full resize-none rounded-xl border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmKind(null)}
                        className="h-8 cursor-pointer rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {confirmKind === 'cancel' ? 'Keep booking' : 'Keep request'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setMenuOpen(false);
                          setConfirmKind(null);
                          const reason = cancelReason.trim() ? cancelReason.trim() : null;
                          if (confirmKind === 'cancel') void onCancel(detail, reason);
                          else onDecline(detail, reason);
                        }}
                        className="h-8 cursor-pointer rounded-full border border-border bg-danger px-3 text-[11px] font-bold text-danger-foreground transition hover: opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-60"
                      >
                        {busy
                          ? confirmKind === 'cancel'
                            ? 'Cancelling...'
                            : 'Declining...'
                          : confirmKind === 'cancel'
                            ? 'Cancel booking'
                            : 'Decline request'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* - Expandable details: tracker + agreement + notes + full actions - */}
      {expanded && (
        <div
          id={panelId}
          className="mt-4 space-y-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Booking tracker
            </h4>
            <span className="text-[10px] tabular-nums text-subtle-foreground">
              Ref BOOKING-{String(appointment.id).padStart(5, '0')}
            </span>
          </div>

          <BookingTracker
            appointment={appointment}
            stamp={stamp}
            events={detail.events}
            names={actorNames}
            role={role}
            nowMs={nowMs}
            compact={false}
            showHistory
          />

          {detail.agreement && (
            <BookingAgreementPanel
              agreement={detail.agreement}
              bookingStatus={appointment.status}
              userId={viewerId}
            />
          )}

          {/* Notes - the client edits their note to the coach; the coach keeps private notes */}
          {noteVisible && (
            <div className="space-y-1.5">
              <label
                htmlFor={`booking-note-${appointment.id}`}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                {role === 'client' ? 'Note for your coach' : 'Coach notes'}
              </label>
              <div className="flex items-start gap-2">
                <textarea
                  id={`booking-note-${appointment.id}`}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setNoteSaved(false);
                  }}
                  rows={2}
                  maxLength={500}
                  placeholder={
                    role === 'client'
                      ? 'Anything you want them to know before the session...'
                      : 'Private session notes...'
                  }
                  className="min-w-0 flex-1 resize-y rounded-xl border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void saveNote()}
                  disabled={savingNote}
                  className="h-9 shrink-0 cursor-pointer rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {savingNote ? 'Saving...' : noteSaved ? 'Saved' : 'Save'}
                </button>
              </div>
              {noteError && (
                <p role="alert" className="text-[11px] text-danger">
                  {noteError}
                </p>
              )}
            </div>
          )}

          {/* Full role-aware action set + reminder, or the inline no-show confirm */}
          {noShowConfirm && role === 'coach' ? (
            <div
              className="space-y-2 rounded-2xl border border-border p-3"
              role="group"
              aria-label="Mark this session as a no-show?"
            >
              <p className="text-xs font-bold text-foreground">Mark as a no-show?</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This tells the client the session did not happen. It cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setNoShowConfirm(false)}
                  className="h-9 cursor-pointer rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Keep session
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setNoShowConfirm(false);
                    onNoShow?.(detail);
                  }}
                  className="h-9 cursor-pointer rounded-full border border-border bg-danger px-3 text-[11px] font-bold text-danger-foreground transition hover: opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-60"
                >
                  {busy ? 'Saving...' : 'Confirm no-show'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1   border-t border-divider">
              {/* Send reminder - confirmed/in-progress only, server rate-limited */}
              {(appointment.status === 'confirmed' || appointment.status === 'in_progress') ? (
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void sendReminder()}
                    disabled={reminderState === 'sending'}
                    aria-label="Send a reminder to your session partner"
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <Bell className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                    {reminderState === 'sending' ? 'Sending...' : 'Send reminder'}
                  </button>
                  {typeof reminderState === 'string' && reminderState !== 'idle' && reminderState !== 'sending' && (
                    <span role="status" className="truncate text-[10px] text-muted-foreground">
                      {reminderState === 'sent' ? 'Reminder sent.' : reminderState}
                    </span>
                  )}
                </div>
              ) : (
                <span />
              )}
              <BookingActions
                detail={detail}
                role={role}
                busy={busy}
                canWrite={canWrite}
                writeBlockedReason={writeBlockedReason}
                showReview={showReview}
                density="details"
                onAccept={onAccept}
                onDecline={() => setConfirmKind('decline')}
                onComplete={onComplete}
                onApproveReschedule={onApproveReschedule}
                onDismissReschedule={onDismissReschedule}
                onReview={onReview}
                onStart={onStart}
                onNoShow={() => setNoShowConfirm(true)}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default BookingCard;

