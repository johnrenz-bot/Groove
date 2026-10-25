'use client';

import React from 'react';
import {
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import type { BookingDetail } from '../services/bookingService';
import { statusMeta } from '../services/bookingStatus';
import {
  formatBookingDate,
  formatClock,
  formatDuration,
  formatRelativeTime,
} from '../services/bookingTime';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ModalSection, ModalCard } from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { formatCurrency, getInitials } from '@/lib/utils';
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

export interface BookingDetailsModalProps
  extends Omit<BookingActionsProps, 'detail' | 'density' | 'className'> {
  detail: BookingDetail | null;
  nowMs: number;
  viewerId: string;
  /** Lifecycle stamps, from `stampsFor(appointment)`. */
  stamp: Partial<Record<string, string | null>>;
  onClose: () => void;
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-xs font-medium leading-relaxed text-foreground">{children}</dd>
      </div>
    </div>
  );
}

/**
 * The full booking, including the parts that are too heavy for a card: the
 * agreement, every contact field, and the audit history.
 *
 * It renders the SAME `<BookingTracker>` and `<BookingActions>` as the card, so
 * the two surfaces cannot disagree about progress or permission.
 */
export function BookingDetailsModal({
  detail,
  role,
  nowMs,
  viewerId,
  stamp,
  busy = false,
  canWrite,
  writeBlockedReason,
  showReview = false,
  onClose,
  ...actions
}: BookingDetailsModalProps) {
  if (!detail) return null;

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

  const updatedLabel = formatRelativeTime(
    appointment.updated_at ?? appointment.created_at,
    nowMs
  );
  const clientDisplayName =
    appointment.name ||
    [appointment.client?.firstname, appointment.client?.lastname].filter(Boolean).join(' ') ||
    'Client';
  const coachDisplayName =
    [appointment.coach?.firstname, appointment.coach?.lastname].filter(Boolean).join(' ') ||
    appointment.coach?.username ||
    'Coach';
  const actorNames: Record<string, string> = {
    [appointment.client_id]: role === 'client' ? 'You' : clientDisplayName,
    [appointment.coach_id]: role === 'coach' ? 'You' : coachDisplayName,
  };

  return (
    <Modal
      open
      onClose={onClose}
      animated
      size="lg"
      title="Booking details"
      description={`Booking #${appointment.id} · ${meta.label}`}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <BookingActions
            detail={detail}
            role={role}
            busy={busy}
            canWrite={canWrite}
            writeBlockedReason={writeBlockedReason}
            showReview={showReview}
            density="details"
            {...actions}
          />
        </div>
      }
    >
      <ModalSection className="space-y-4">
        {/* Identity */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-border bg-card text-sm font-bold text-accent-text',
                role === 'client' ? 'rounded-2xl' : 'rounded-full'
              )}
            >
              {counterparty?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={counterparty.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials(counterparty?.firstname, counterparty?.lastname)}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {role === 'client' ? `Session with ${counterpartyName}` : counterpartyName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Updated {updatedLabel} · {appointment.session_type}
              </p>
            </div>
          </div>
          <Badge variant={BADGE_VARIANT[meta.badge] ?? 'neutral'} dot>
            {meta.label}
          </Badge>
        </div>

        {/* Progress + real history */}
        <BookingTracker
          appointment={appointment}
          stamp={stamp}
          events={detail.events}
          names={actorNames}
          role={role}
          nowMs={nowMs}
        />

        {/* Facts */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Session details
          </h3>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Date">
              {formatBookingDate(appointment.date)}
            </DetailRow>
            <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Time">
              {formatClock(appointment.start_time)} – {formatClock(appointment.end_time)}
              {appointment.duration_minutes
                ? ` · ${formatDuration(appointment.duration_minutes)}`
                : ''}
            </DetailRow>
            <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
              {appointment.is_online ? 'Online session' : appointment.address}
            </DetailRow>
            <DetailRow icon={<Sparkles className="h-3.5 w-3.5" />} label="Focus">
              {appointment.talent || 'Dance'} · {appointment.experience || 'Level not set'}
            </DetailRow>
            {appointment.rate != null && (
              <DetailRow icon={<Star className="h-3.5 w-3.5" />} label="Agreed rate">
                {formatCurrency(appointment.rate)}
              </DetailRow>
            )}
            <DetailRow icon={<UserRound className="h-3.5 w-3.5" />} label="Session type">
              {appointment.session_type}
            </DetailRow>
            <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Contact number">
              {appointment.contact || 'Not provided'}
            </DetailRow>
            <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
              <span className="break-all">{appointment.email || 'Not provided'}</span>
            </DetailRow>
          </dl>
        </div>

        {appointment.purpose && (
          <ModalCard>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {role === 'client' ? 'Rehearsal goal' : 'Session goal'}
            </p>
            <p className="mt-1 text-xs text-foreground">{appointment.purpose}</p>
            {appointment.message && (
              <p className="mt-2 italic text-xs text-muted-foreground">&ldquo;{appointment.message}&rdquo;</p>
            )}
          </ModalCard>
        )}

        {detail.agreement && (
          <section aria-label="Session agreement">
            <BookingAgreementPanel
              agreement={detail.agreement}
              bookingStatus={appointment.status}
              userId={viewerId}
              onChanged={() => {
                /* The page reloads on realtime/refresh; this dialog re-renders
                   from the new detail prop. */
              }}
            />
          </section>
        )}

        {appointment.cancellation_reason && meta.isTerminal && (
          <ModalCard>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cancellation note
            </p>
            <p className="mt-1 text-xs text-foreground">{appointment.cancellation_reason}</p>
          </ModalCard>
        )}

        {appointment.feedback && (
          <ModalCard className="border-warning/30 bg-warning-soft text-warning">
            <div className="flex items-center gap-1.5 font-bold">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span className="tabular-nums">
                {role === 'client' ? 'Your review' : 'Student rating'}: {appointment.rating} / 5
              </span>
            </div>
            <p className="mt-1 leading-relaxed text-xs text-foreground/80">&ldquo;{appointment.feedback}&rdquo;</p>
          </ModalCard>
        )}
      </ModalSection>
    </Modal>
  );
}

export default BookingDetailsModal;
