'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import type { Appointment, FullCoach, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  bookingGate,
  coachBookingGate,
  type VerificationGate,
} from '@/features/verification/services/verification';
import {
  isValidEmail,
  isValidMobile,
  normalizeContactForInput,
  normalizeContactForStorage,
} from '@/lib/profileFields';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalSection, ModalCard, ModalFooter } from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { formatCurrency } from '@/lib/utils';
import { explainBookingError } from '../services/bookingService';
import {
  clientBusyWindowsForDate,
  buildTimeSlots,
  composeCoachLocation,
  composeProfileAddress,
  formatBookingDate,
  formatClock,
  formatDuration,
  minutesToTime,
  overlaps,
  parseBookingStart,
  parseDurationMinutes,
  timeToMinutes,
} from '../services/bookingTime';

interface BookingModalProps {
  coach: FullCoach;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SESSION_TYPES = [
  { value: 'Face to Face Rehearsal', online: false, label: 'Face to face' },
  { value: 'Online 1-on-1 Coaching', online: true, label: 'Online' },
  { value: 'Studio Workshop', online: false, label: 'Studio workshop' },
  { value: 'Choreography Routine', online: false, label: 'Choreography routine' },
] as const;

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Professional'] as const;

const CHIP_OPEN_MINUTES = 8 * 60;
const CHIP_CLOSE_MINUTES = 20 * 60;

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function pickFirstAvailableStart(args: {
  date: string;
  durationMinutes: number;
  nowMs: number;
  earliestMs: number;
  busy: ReturnType<typeof clientBusyWindowsForDate>;
}): string {
  const slots = buildTimeSlots({
    ...args,
    openMinutes: CHIP_OPEN_MINUTES,
    closeMinutes: CHIP_CLOSE_MINUTES,
  });
  return slots.find((slot) => !slot.disabled)?.start ?? slots[0]?.start ?? '09:00';
}

function firstBookableDate(args: {
  nowMs: number;
  earliestMs: number;
  durationMinutes: number;
  busy?: ReturnType<typeof clientBusyWindowsForDate>;
}): string {
  const start = new Date(Math.max(args.nowMs, args.earliestMs));
  for (let offset = 0; offset < 21; offset += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const value = localDateValue(day);
    const slots = buildTimeSlots({
      date: value,
      durationMinutes: args.durationMinutes,
      nowMs: args.nowMs,
      earliestMs: args.earliestMs,
      busy: args.busy ?? [],
      openMinutes: CHIP_OPEN_MINUTES,
      closeMinutes: CHIP_CLOSE_MINUTES,
    });
    if (slots.some((slot) => !slot.disabled)) return value;
  }
  return localDateValue(start);
}

function ProfileTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-text">
      <UserRound className="h-2.5 w-2.5" aria-hidden="true" />
      From your profile
    </span>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-[11px] font-medium text-danger">
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function BookingModal({ coach, isOpen, onClose, onSuccess }: BookingModalProps) {
  const coachProfile = coach.coach_profile;
  const coachDisplayName =
    [coach.firstname, coach.lastname].filter(Boolean).join(' ') || coach.username || 'Coach';
  const durationMinutes = parseDurationMinutes(coachProfile?.duration);
  const rate = coachProfile?.service_fee ?? null;
  const rateLabel = rate === null ? 'Rate on request' : formatCurrency(rate);
  const coachLocation = composeCoachLocation(coach);
  const noticeMs =
    (coachProfile?.notice_days ?? 0) * 24 * 60 * 60 * 1000 +
    (coachProfile?.notice_hours ?? 0) * 60 * 60 * 1000;

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const earliestMs = nowMs + noticeMs;

  const initialDate = useMemo(
    () =>
      firstBookableDate({
        nowMs,
        earliestMs,
        durationMinutes,
      }),
    [durationMinutes, earliestMs, nowMs]
  );

  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(() =>
    pickFirstAvailableStart({
      date: initialDate,
      durationMinutes,
      nowMs,
      earliestMs: nowMs + noticeMs,
      busy: [],
    })
  );

  const endTime = useMemo(() => {
    const start = timeToMinutes(startTime);
    return start === null ? '' : minutesToTime(start + durationMinutes);
  }, [durationMinutes, startTime]);

  const [sessionType, setSessionType] = useState<(typeof SESSION_TYPES)[number]['value']>(
    SESSION_TYPES[0].value
  );
  const isOnline = sessionType === SESSION_TYPES[1].value;

  const [talent, setTalent] = useState(
    coachProfile?.talents?.split(',')[0]?.trim() || 'Dance'
  );
  const [experience, setExperience] = useState<string>(EXPERIENCE_LEVELS[0]);
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');

  const [nameEdited, setNameEdited] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);
  const [contactEdited, setContactEdited] = useState(false);
  const [addressEdited, setAddressEdited] = useState(false);

  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [ownAppointments, setOwnAppointments] = useState<Appointment[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdReference, setCreatedReference] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      const openNow = Date.now();
      const openEarliest = openNow + noticeMs;
      const openDate = firstBookableDate({
        nowMs: openNow,
        earliestMs: openEarliest,
        durationMinutes,
      });

      setNowMs(openNow);
      setSuccess(false);
      setCreatedReference(null);
      setError(null);
      setWarning(null);
      setProfileError(null);
      setClientProfile(null);
      setOwnAppointments([]);
      setAttempted(false);
      setProfileLoading(true);
      setPurpose('');
      setMessage('');
      setTalent(coachProfile?.talents?.split(',')[0]?.trim() || 'Dance');
      setExperience(EXPERIENCE_LEVELS[0]);
      setSessionType(SESSION_TYPES[0].value);
      setDate(openDate);
      setStartTime(
        pickFirstAvailableStart({
          date: openDate,
          durationMinutes,
          nowMs: openNow,
          earliestMs: openEarliest,
          busy: [],
        })
      );

      void (async () => {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user || cancelled) return;

          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (cancelled) return;
          if (profileErr) {
            setProfileError(profileErr.message);
          } else if (profile) {
            const typed = profile as Profile;
            setClientProfile(typed);
            setName([typed.firstname, typed.lastname].filter(Boolean).join(' ').trim());
            setEmail(typed.email || user.email || '');
            setContact(normalizeContactForInput(typed.contact));
            setAddress(composeProfileAddress(typed));
            setNameEdited(false);
            setEmailEdited(false);
            setContactEdited(false);
            setAddressEdited(false);
          }

          const { data: appointments } = await supabase
            .from('appointments')
            .select('id,date,start_time,end_time,status,coach_id')
            .eq('client_id', user.id)
            .in('status', ['pending', 'accepted', 'agreement_required', 'confirmed']);

          if (cancelled) return;
          const rows = (appointments ?? []) as Appointment[];
          setOwnAppointments(rows);

          const windows = clientBusyWindowsForDate(rows, openDate);
          const slots = buildTimeSlots({
            date: openDate,
            durationMinutes,
            nowMs: Date.now(),
            earliestMs: Date.now() + noticeMs,
            busy: windows,
            openMinutes: CHIP_OPEN_MINUTES,
            closeMinutes: CHIP_CLOSE_MINUTES,
          });
          setStartTime((current) => {
            const selected = slots.find((slot) => slot.start === current);
            if (selected && !selected.disabled) return current;
            return slots.find((slot) => !slot.disabled)?.start ?? current;
          });
        } catch (err) {
          if (!cancelled) {
            setProfileError(
              err instanceof Error ? err.message : 'Your profile could not be loaded.'
            );
          }
        } finally {
          if (!cancelled) {
            setProfileLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, coach.id]);

  const dateOptions = useMemo(() => {
    const firstDay = new Date(Math.max(nowMs, earliestMs));
    return Array.from({ length: 21 }, (_, index) => {
      const day = new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        firstDay.getDate() + index
      );
      const value = localDateValue(day);
      const dayEnd = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        23,
        59,
        59,
        999
      ).getTime();
      return {
        value,
        weekday: day.toLocaleDateString(undefined, { weekday: 'short' }),
        day: day.getDate(),
        month: day.toLocaleDateString(undefined, { month: 'short' }),
        disabled: dayEnd < earliestMs,
      };
    });
  }, [earliestMs, nowMs]);

  const busyWindows = useMemo(
    () => clientBusyWindowsForDate(ownAppointments, date),
    [date, ownAppointments]
  );

  const chipSlots = useMemo(
    () =>
      buildTimeSlots({
        date,
        durationMinutes,
        nowMs,
        earliestMs,
        busy: busyWindows,
        openMinutes: CHIP_OPEN_MINUTES,
        closeMinutes: CHIP_CLOSE_MINUTES,
      }),
    [busyWindows, date, durationMinutes, earliestMs, nowMs]
  );

  const startAt = parseBookingStart(date, startTime);
  const endAt = parseBookingStart(date, endTime);
  const noticeLabel = [
    coachProfile?.notice_days ? `${coachProfile.notice_days}d` : '',
    coachProfile?.notice_hours ? `${coachProfile.notice_hours}h` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const conflict = useMemo(() => {
    if (!startAt || !endAt) return null;
    return (
      busyWindows.find((window) => overlaps(startAt, endAt, window.start, window.end)) ?? null
    );
  }, [busyWindows, endAt, startAt]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    const startMinutes = timeToMinutes(startTime);
    if (name.trim().length < 2) next.name = 'Enter the name the coach should expect.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!isValidMobile(contact)) {
      next.contact = 'Use a 10-digit Philippine mobile number starting with 9 (e.g. 9171234567).';
    }
    if (!isOnline && address.trim().length < 5) {
      next.address = 'Enter the studio or meeting address.';
    }
    if (purpose.trim().length < 5) {
      next.purpose = 'Tell the coach what you want to work on.';
    }
    if (!date) next.date = 'Choose a session date.';
    if (startMinutes === null) {
      next.startTime = 'Choose a start time.';
    } else if (startMinutes + durationMinutes > 24 * 60) {
      next.startTime = 'That session would run past midnight. Choose an earlier start time.';
    }
    if (startAt && startAt.getTime() <= nowMs) {
      next.startTime = 'That start time has already passed. Choose a later time.';
    } else if (startAt && startAt.getTime() < earliestMs) {
      next.startTime = `This coach needs ${noticeLabel || 'a notice period'}. Choose a later time.`;
    }
    if (conflict) {
      next.startTime = `You already have a booking at ${conflict.label ?? 'that time'}. Choose another time.`;
    }
    return next;
  }, [
    address,
    conflict,
    contact,
    date,
    durationMinutes,
    earliestMs,
    email,
    isOnline,
    name,
    noticeLabel,
    nowMs,
    purpose,
    startAt,
    startTime,
  ]);

  const valid = Object.keys(errors).length === 0;

  const clientCheck = bookingGate(clientProfile);
  const coachCheck = coachBookingGate(coach);
  let gate: VerificationGate;
  if (profileLoading && !clientProfile) {
    gate = { allowed: true, reason: null, ctaHref: null };
  } else if (!profileLoading && profileError && !clientProfile) {
    gate = {
      allowed: false,
      reason:
        'Your profile could not be loaded, so your verification status cannot be checked. Close this dialog and open it again to retry.',
      ctaHref: null,
    };
  } else if (!clientCheck.allowed) {
    gate = clientCheck;
  } else if (!coachCheck.allowed) {
    gate = {
      allowed: false,
      reason:
        'This coach is not verified yet, so bookings cannot be accepted. Please choose a verified coach.',
      ctaHref: null,
    };
  } else {
    gate = { allowed: true, reason: null, ctaHref: null };
  }

  const resetAndClose = () => {
    if (loading) return;
    const closeNow = Date.now();
    const closeEarliest = closeNow + noticeMs;
    const closeDate = firstBookableDate({
      nowMs: closeNow,
      earliestMs: closeEarliest,
      durationMinutes,
    });
    setNowMs(closeNow);
    setSuccess(false);
    setCreatedReference(null);
    setError(null);
    setWarning(null);
    setAttempted(false);
    setLoading(false);
    setProfileLoading(true);
    setProfileError(null);
    setClientProfile(null);
    setOwnAppointments([]);
    setName('');
    setEmail('');
    setContact('');
    setAddress('');
    setNameEdited(false);
    setEmailEdited(false);
    setContactEdited(false);
    setAddressEdited(false);
    setPurpose('');
    setMessage('');
    setTalent(coachProfile?.talents?.split(',')[0]?.trim() || 'Dance');
    setExperience(EXPERIENCE_LEVELS[0]);
    setSessionType(SESSION_TYPES[0].value);
    setDate(closeDate);
    setStartTime(
      pickFirstAvailableStart({
        date: closeDate,
        durationMinutes,
        nowMs: closeNow,
        earliestMs: closeEarliest,
        busy: [],
      })
    );
    onClose();
  };

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    const windows = clientBusyWindowsForDate(ownAppointments, nextDate);
    const slots = buildTimeSlots({
      date: nextDate,
      durationMinutes,
      nowMs,
      earliestMs,
      busy: windows,
      openMinutes: CHIP_OPEN_MINUTES,
      closeMinutes: CHIP_CLOSE_MINUTES,
    });
    const selected = slots.find((slot) => slot.start === startTime);
    if (!selected || selected.disabled) {
      const first = slots.find((slot) => !slot.disabled);
      if (first) setStartTime(first.start);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!valid || loading) return;

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to book a session.');

      const submitGate = bookingGate(clientProfile);
      if (!submitGate.allowed) {
        throw new Error(submitGate.reason ?? 'Your account cannot book right now.');
      }
      if (!coach.account_verified) {
        throw new Error(
          'This coach is not verified yet, so bookings cannot be accepted. Please choose a verified coach.'
        );
      }

      const clientName =
        name.trim() ||
        [clientProfile?.firstname, clientProfile?.lastname].filter(Boolean).join(' ') ||
        user.email ||
        'Client';
      const bookingEmail = email.trim() || user.email || clientProfile?.email || '';
      if (!bookingEmail) {
        throw new Error('Your account has no email address. Add one in your profile settings.');
      }

      const finalAddress = isOnline ? 'Online session' : address.trim();

      const { data: created, error: insertError } = await supabase
        .from('appointments')
        .insert({
          coach_id: coach.id,
          client_id: user.id,
          date,
          start_time: startTime,
          end_time: endTime,
          session_type: sessionType,
          talent,
          experience,
          purpose: purpose.trim(),
          message: message.trim() || null,
          address: finalAddress,
          contact: normalizeContactForStorage(contact),
          status: 'pending',
          name: clientName,
          email: bookingEmail,
          rate,
          duration_minutes: durationMinutes,
          location: isOnline ? 'Online' : finalAddress,
          is_online: isOnline,
        })
        .select('id, appointment_id')
        .single();

      if (insertError) throw new Error(explainBookingError(insertError));

      try {
        const { error: notifyError } = await supabase.from('notifications').insert({
          user_id: coach.id,
          title: 'New Session Request Received',
          message: `${clientName} sent a booking request for ${talent} on ${formatBookingDate(
            date
          )} at ${formatClock(startTime)}.`,
          cta_url: '/coach/appointments',
        });
        if (notifyError) {
          setWarning(
            'Your request was saved, but the in-app notification could not be created. The coach will still see the booking on their dashboard.'
          );
        }
      } catch {
        setWarning(
          'Your request was saved, but the in-app notification could not be created. The coach will still see the booking on their dashboard.'
        );
      }

      setCreatedReference(
        typeof created?.appointment_id === 'number' ? created.appointment_id : null
      );
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The booking request could not be sent.');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = SESSION_TYPES.find((type) => type.value === sessionType) ?? SESSION_TYPES[0];
  const paymentNote =
    coachProfile?.payment_type === 'online'
      ? `Online payment${coachProfile.payment_handle ? ` via ${coachProfile.payment_handle}` : ' — confirm the handle with your coach'}.`
      : coachProfile?.payment_type === 'cash'
        ? 'Cash on session.'
        : 'Payment method to be confirmed with your coach.';
  const talentOptions = coachProfile?.talents
    ? coachProfile.talents
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [talent];

  const disabled = profileLoading || !gate.allowed || loading || !valid;

  const footer = success ? (
    <ModalFooter>
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {createdReference !== null
            ? `Booking reference #${String(createdReference).padStart(5, '0')}`
            : 'Your request is in your appointments.'}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full" type="button" size="sm" onClick={resetAndClose}>
            Close
          </Button>
          <Link href="/client/appointments">
            <Button variant="primary" className="rounded-full" type="button" size="sm" icon={<CalendarDays className="h-3.5 w-3.5" />}>
              Track my bookings
            </Button>
          </Link>
        </div>
      </div>
    </ModalFooter>
  ) : !gate.allowed ? (
    <ModalFooter>
      <div className="flex w-full justify-end">
        <Button variant="outline" className="rounded-full" type="button" size="sm" onClick={resetAndClose}>
          Close
        </Button>
      </div>
    </ModalFooter>
  ) : (
    <ModalFooter>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-foreground">
            <Calendar className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
            {formatBookingDate(date)} · {formatClock(startTime)} – {formatClock(endTime)}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>{formatDuration(durationMinutes)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-accent-text">{rateLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedType.label}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            size="sm"
            onClick={resetAndClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="booking-form"
            variant="primary"
            className="rounded-full"
            size="sm"
            loading={loading}
            disabled={disabled}
            title={
              profileLoading
                ? 'Loading your profile…'
                : !gate.allowed
                  ? gate.reason ?? undefined
                  : !valid
                    ? 'Complete the highlighted fields first.'
                    : undefined
            }
          >
            {loading ? 'Sending request…' : 'Confirm Booking'}
          </Button>
        </div>
      </div>
    </ModalFooter>
  );

  return (
    <Modal
      open={isOpen}
      onClose={resetAndClose}
      animated
      size="lg"
      title={`Book Session with ${coachDisplayName}`}
      description={`${sessionType} · ${coachLocation || 'Service area not published'}`}
      footer={footer}
    >
      {success ? (
        <ModalSection className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-success/30 bg-success-soft text-success">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-foreground">Booking request sent</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Coach {coachDisplayName} has been asked for a {formatDuration(durationMinutes)}{' '}
            {talent} session on <strong className="text-foreground">{formatBookingDate(date)}</strong>{' '}
            at <strong className="text-foreground">{formatClock(startTime)}</strong>. Nothing is
            confirmed until they accept and both agreements are signed.
          </p>
          {warning && (
            <ModalCard className="mt-3 mx-auto max-w-md border-warning/30 bg-warning-soft text-warning">
              <div className="flex items-start gap-2 text-[11px] leading-relaxed">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {warning}
              </div>
            </ModalCard>
          )}
          <Link
            href="/client/appointments"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground"
          >
            <Calendar className="h-4 w-4 text-accent-text" aria-hidden="true" />
            Track status under Appointments
          </Link>
        </ModalSection>
      ) : profileLoading ? (
        <ModalSection className="space-y-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            Loading your profile and the coach&apos;s booking details…
          </p>
          <div className="g-skeleton h-24 rounded-2xl" />
          <div className="g-skeleton h-24 rounded-2xl" />
          <div className="g-skeleton h-24 rounded-2xl" />
        </ModalSection>
      ) : !gate.allowed ? (
        <ModalSection className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-warning/30 bg-warning-soft text-warning">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">Booking unavailable</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {gate.reason}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {gate.ctaHref && (
              <Link href={gate.ctaHref}>
                <Button variant="primary" className="rounded-full" icon={<ShieldCheck className="h-4 w-4" />}>Go to profile verification</Button>
              </Link>
            )}
            <Button variant="outline" className="rounded-full" onClick={resetAndClose}>
              Close
            </Button>
          </div>
        </ModalSection>
      ) : (
        <form id="booking-form" onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          {profileError && (
            <ModalCard className="border-warning/30 bg-warning-soft text-warning">
              <div className="flex items-start gap-2 text-[11px] leading-relaxed">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Your saved details could not be loaded ({profileError}). You can still fill the form
                in manually.
              </div>
            </ModalCard>
          )}
          {error && (
            <ModalCard className="border-danger/30 bg-danger-soft text-danger">
              <div className="flex items-start gap-2 text-[11px] leading-relaxed">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            </ModalCard>
          )}

          {/* ── 1. Date and time ── */}
          <ModalSection
            step={1}
            icon={<Calendar className="h-3.5 w-3.5" />}
            title="Date & time"
          >
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                    Pick a day *
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {noticeMs > 0
                      ? `Coach needs ${noticeLabel} notice`
                      : 'No published notice period'}
                  </span>
                </div>
                <div className="g-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {dateOptions.map((option) => {
                    const active = option.value === date;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        aria-pressed={active}
                        onClick={() => handleDateChange(option.value)}
                        className={cn(
                          'flex min-w-[58px] shrink-0 cursor-pointer flex-col items-center rounded-xl border px-2 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40',
                          active
                            ? 'border-accent-border bg-accent-soft text-accent-text'
                            : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                        )}
                      >
                        <span className="text-[10px] font-semibold uppercase">{option.weekday}</span>
                        <span className="text-sm font-bold tabular-nums">{option.day}</span>
                        <span className="text-[10px]">{option.month}</span>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-2 block">
                  <span className="sr-only">Exact session date</span>
                  <input
                    type="date"
                    value={date}
                    min={localDateValue(new Date(earliestMs))}
                    onChange={(event) => handleDateChange(event.target.value)}
                    className="g-input h-10 w-full text-xs"
                  />
                </label>
                <FieldError message={attempted ? errors.date : undefined} />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                    Available start times *
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDuration(durationMinutes)} session
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {chipSlots.map((slot) => {
                    const active = slot.start === startTime;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={slot.disabled}
                        aria-pressed={active}
                        title={slot.reason ?? undefined}
                        onClick={() => setStartTime(slot.start)}
                        className={cn(
                          'min-h-[36px] cursor-pointer rounded-lg border px-1.5 text-[11px] font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-muted/30 disabled:text-subtle-foreground disabled:line-through',
                          active
                            ? 'border-accent-border bg-accent-soft text-accent-text'
                            : 'border-border bg-card text-foreground hover:border-border-strong hover:bg-muted'
                        )}
                      >
                        {formatClock(slot.start)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 flex items-center gap-1 text-[10px] leading-relaxed text-muted-foreground">
                  <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Past times, the coach&apos;s notice period, and your own active or requested
                  sessions are disabled. Your coach still confirms the final slot.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Or type a start time
                    </span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="g-input h-10 w-full text-xs"
                      aria-invalid={attempted && errors.startTime ? 'true' : undefined}
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Ends
                    </span>
                    <div className="flex h-10 items-center rounded-lg border border-border bg-muted/40 px-3 text-xs font-semibold tabular-nums text-foreground">
                      {endTime ? formatClock(endTime) : '—'}
                    </div>
                  </div>
                </div>
                <FieldError message={attempted ? errors.startTime : undefined} />
                {conflict && !attempted && (
                  <p className="mt-1 text-[11px] font-medium text-warning">
                    You already have a booking at {conflict.label ?? 'that time'}.
                  </p>
                )}
              </div>
            </div>
          </ModalSection>

          {/* ── 2. Session format ── */}
          <ModalSection step={2} icon={<Sparkles className="h-3.5 w-3.5" />} title="Session focus">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Format
                </span>
                <select
                  value={sessionType}
                  onChange={(event) =>
                    setSessionType(event.target.value as (typeof SESSION_TYPES)[number]['value'])
                  }
                  className="g-input h-10 w-full cursor-pointer text-xs"
                >
                  {SESSION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Discipline
                  {coachProfile?.talents && (
                    <span className="text-[9px] font-bold normal-case tracking-normal text-accent-text">
                      From coach
                    </span>
                  )}
                </span>
                <select
                  value={talent}
                  onChange={(event) => setTalent(event.target.value)}
                  className="g-input h-10 w-full cursor-pointer text-xs"
                >
                  {talentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Experience
                </span>
                <select
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  className="g-input h-10 w-full cursor-pointer text-xs"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                What do you want to work on? *
              </span>
              <textarea
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                rows={2}
                maxLength={255}
                placeholder="e.g. Audition prep, learning a specific routine, vocal range extension…"
                className="g-input w-full resize-none p-2.5 text-xs leading-relaxed"
                aria-invalid={attempted && errors.purpose ? 'true' : undefined}
              />
              <FieldError message={attempted ? errors.purpose : undefined} />
            </label>

            <label className="mt-2 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                Notes for the coach <span className="font-normal normal-case text-muted-foreground">(optional)</span>
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Audio tracks, access instructions, or anything else the coach should know…"
                className="g-input w-full resize-none p-2.5 text-xs leading-relaxed"
              />
            </label>
          </ModalSection>

          {/* ── 3. Contact details ── */}
          <ModalSection step={3} icon={<UserRound className="h-3.5 w-3.5" />} title="Your details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Full name *
                  <ProfileTag show={Boolean(clientProfile) && !nameEdited} />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameEdited(true);
                  }}
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                  className="g-input h-10 w-full text-xs"
                  aria-invalid={attempted && errors.name ? 'true' : undefined}
                />
                <FieldError message={attempted ? errors.name : undefined} />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Email *
                  <ProfileTag show={Boolean(clientProfile) && !emailEdited} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailEdited(true);
                  }}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="g-input h-10 w-full text-xs"
                  aria-invalid={attempted && errors.email ? 'true' : undefined}
                />
                <FieldError message={attempted ? errors.email : undefined} />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Mobile number *
                  <ProfileTag show={Boolean(clientProfile) && !contactEdited} />
                </span>
                <div className="flex w-full">
                  <span
                    aria-hidden="true"
                    className="flex min-w-[74px] items-center justify-center gap-1 rounded-l-lg border border-r-0 border-border bg-muted/50 text-xs font-semibold text-muted-foreground"
                  >
                    <Phone className="h-3 w-3" />
                    +63
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={contact}
                    onChange={(event) => {
                      setContact(event.target.value.replace(/\D/g, '').slice(0, 10));
                      setContactEdited(true);
                    }}
                    autoComplete="tel-national"
                    placeholder="9171234567"
                    className="g-input h-10 w-full rounded-l-none border-l-0 text-xs"
                    aria-invalid={attempted && errors.contact ? 'true' : undefined}
                  />
                </div>
                <FieldError message={attempted ? errors.contact : undefined} />
                {!attempted && contact && !isValidMobile(contact) && (
                  <p className="mt-1 text-[11px] text-warning">
                    10 digits starting with 9, e.g. 9171234567.
                  </p>
                )}
              </label>

              <div className="block">
                <span className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Service area
                </span>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-[11px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                  <span className="truncate">{coachLocation || 'Not published by the coach'}</span>
                </div>
              </div>
            </div>

            {isOnline ? (
              <ModalCard className="border-info/30 bg-info-soft text-info">
                <div className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  This is an online session. Your coach will share the meeting link or studio
                  details in Messages.
                </div>
              </ModalCard>
            ) : (
              <label className="mt-3 block">
                <span className="mb-1 flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Studio or meeting address *
                  <ProfileTag show={Boolean(clientProfile) && !addressEdited && Boolean(address)} />
                </span>
                <input
                  type="text"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setAddressEdited(true);
                  }}
                  placeholder={
                    coachLocation
                      ? `e.g. a studio in ${coachLocation}`
                      : 'Studio name, street, barangay, city'
                  }
                  className="g-input h-10 w-full text-xs"
                  aria-invalid={attempted && errors.address ? 'true' : undefined}
                />
                <FieldError message={attempted ? errors.date : undefined} />
                {address && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddress(composeProfileAddress(clientProfile));
                      setAddressEdited(false);
                    }}
                    className="mt-1 cursor-pointer text-[10px] font-semibold text-accent-text underline underline-offset-2"
                  >
                    Use my saved address
                  </button>
                )}
              </label>
            )}
          </ModalSection>

          {/* ── 4. Terms summary ── */}
          <ModalSection step={4} icon={<FileText className="h-3.5 w-3.5" />} title="Booking summary">
            <dl className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  When
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                  {formatBookingDate(date)}
                  <br />
                  {formatClock(startTime)} – {formatClock(endTime)}
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Duration
                </dt>
                <dd className="mt-0.5 font-semibold text-foreground">
                  {formatDuration(durationMinutes)}
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Fee
                </dt>
                <dd className="mt-0.5 font-bold text-accent-text">{rateLabel}</dd>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Payment
                </dt>
                <dd className="mt-0.5 font-semibold text-foreground">{paymentNote}</dd>
              </div>
            </dl>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <Target className="mt-0.5 h-3 w-3 shrink-0 text-accent-text" aria-hidden="true" />
              Sending this creates a request only. The session is confirmed after the coach accepts
              and both parties sign the agreement.
            </p>
          </ModalSection>
        </form>
      )}
    </Modal>
  );
}

export default BookingModal;
