'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
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
import { Modal, ModalSection, ModalCard, ModalFooter } from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
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
import { BookingCalendar } from './BookingCalendar';

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
  /** When supplied, each candidate day is checked against its own busy windows. */
  busyForDate?: (date: string) => ReturnType<typeof clientBusyWindowsForDate>;
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
      busy: args.busyForDate?.(value) ?? [],
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
    <span
      title="Prefilled from your profile"
      className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-text"
    >
      <UserRound className="h-3 w-3" aria-hidden="true" />
      Profile
    </span>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-snug text-danger"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function SectionHeading({
  id,
  icon,
  title,
  description,
  aside,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent-border/60 bg-accent-soft text-accent-text"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3
            id={id}
            className="text-sm font-bold tracking-[-0.01em] text-foreground sm:text-[0.9375rem]"
          >
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {aside ? <div className="shrink-0 pt-1 text-[11px] text-muted-foreground">{aside}</div> : null}
    </div>
  );
}

function FieldLabel({
  children,
  aside,
  required = false,
  optional = false,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <span className="mb-1.5 flex min-h-5 items-center justify-between gap-2 text-xs font-semibold text-foreground">
      <span className="inline-flex min-w-0 items-center gap-1">
        <span className="truncate">{children}</span>
        {required ? (
          <>
            <span className="text-danger" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </span>
      {aside ??
        (optional ? (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">
            Optional
          </span>
        ) : null)}
    </span>
  );
}

export function BookingModal({ coach, isOpen, onClose, onSuccess }: BookingModalProps) {
  const { notifySuccess } = useSuccessNotifications();
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
  const submittingRef = useRef(false);

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
      submittingRef.current = false;

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
            nowMs: openNow,
            earliestMs: openEarliest,
            busy: windows,
            openMinutes: CHIP_OPEN_MINUTES,
            closeMinutes: CHIP_CLOSE_MINUTES,
          });
          const firstOpen = slots.find((slot) => !slot.disabled);

          if (firstOpen) {
            setStartTime((current) => {
              const selected = slots.find((slot) => slot.start === current);
              if (selected && !selected.disabled) return current;
              return firstOpen.start;
            });
          } else {
            // The first bookable day was chosen before this client's own
            // bookings were readable. If those now fill it, move to the next
            // day that actually has a free start instead of showing a dead day.
            const nextDate = firstBookableDate({
              nowMs: openNow,
              earliestMs: openEarliest,
              durationMinutes,
              busyForDate: (value) => clientBusyWindowsForDate(rows, value),
            });
            setDate(nextDate);
            setStartTime(
              pickFirstAvailableStart({
                date: nextDate,
                durationMinutes,
                nowMs: openNow,
                earliestMs: openEarliest,
                busy: clientBusyWindowsForDate(rows, nextDate),
              })
            );
          }
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
  }, [coach.id, coachProfile?.talents, durationMinutes, isOpen, noticeMs]);

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

  const availableSlotCount = chipSlots.filter((slot) => !slot.disabled).length;

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
    if (!date) {
      next.date = 'Choose a session date.';
    } else if (!chipSlots.some((slot) => !slot.disabled)) {
      next.date = 'No start times are available on that date. Choose another date.';
    }
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
    chipSlots,
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
  } else if (false && !clientCheck.allowed) {
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
    submittingRef.current = false;
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
    setDate(nextDate);
    setStartTime((current) => {
      const selected = slots.find((slot) => slot.start === current);
      if (selected && !selected.disabled) return current;
      return slots.find((slot) => !slot.disabled)?.start ?? '';
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!valid) {
      // The submit button stays enabled so pressing it can explain what is
      // missing. Wait for the error text to render, then move focus to the
      // first field that needs attention.
      window.setTimeout(() => {
        const form = document.getElementById('booking-form');
        const firstInvalid = form?.querySelector<HTMLElement>(
          'input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"], button[aria-invalid="true"]'
        );
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }
        const dateTrigger = form?.querySelector<HTMLElement>('[data-invalid="true"]');
        if (dateTrigger) {
          dateTrigger.focus();
          return;
        }
        form
          ?.querySelector<HTMLButtonElement>(
            '[role="group"][aria-label="Available start times"] button:not([disabled])'
          )
          ?.focus();
      }, 0);
      return;
    }

    if (loading || submittingRef.current) return;

    submittingRef.current = true;
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

      const reference =
        typeof created?.appointment_id === 'number' ? created.appointment_id : null;
      setCreatedReference(reference);
      setSuccess(true);

      notifySuccess({
        title: 'Booking request sent',
        description: `${coachDisplayName} has been notified for ${formatBookingDate(
          date
        )} at ${formatClock(startTime)}.${
          reference !== null ? ` Reference #${String(reference).padStart(5, '0')}.` : ''
        }`,
        icon: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
        dedupeKey: `booking-request-${created?.id ?? reference ?? `${coach.id}-${date}-${startTime}`}`,
        duration: 6000,
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The booking request could not be sent.');
    } finally {
      submittingRef.current = false;
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

  const disabled = profileLoading || !gate.allowed || loading;
  const whenLabel = startTime
    ? `${formatBookingDate(date)} · ${formatClock(startTime)} – ${formatClock(endTime)}`
    : formatBookingDate(date);

  const footer = success ? (
    <ModalFooter className="px-5 py-3.5 sm:px-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {createdReference !== null
            ? `Booking reference #${String(createdReference).padStart(5, '0')}`
            : 'Your request is in your appointments.'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            type="button"
            size="sm"
            onClick={resetAndClose}
          >
            Close
          </Button>
          <Link href="/client/appointments">
            <Button
              variant="primary"
              className="rounded-full"
              type="button"
              size="sm"
              icon={<CalendarDays className="h-3.5 w-3.5" />}
            >
              Track my bookings
            </Button>
          </Link>
        </div>
      </div>
    </ModalFooter>
  ) : !gate.allowed ? (
    <ModalFooter className="px-5 py-3.5 sm:px-6">
      <div className="flex w-full justify-end">
        <Button
          variant="outline"
          className="rounded-full"
          type="button"
          size="sm"
          onClick={resetAndClose}
        >
          Close
        </Button>
      </div>
    </ModalFooter>
  ) : (
    <ModalFooter className="px-5 py-3.5 sm:px-6">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
            <span className="truncate">{whenLabel}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
            <span>{formatDuration(durationMinutes)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-accent-text">{rateLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedType.label}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full sm:flex-none"
            size="md"
            onClick={resetAndClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="booking-form"
            variant="primary"
            className="flex-1 rounded-full sm:flex-none"
            size="md"
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
            {loading ? 'Sending…' : 'Confirm booking'}
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
      size="xl"
      title={`Book a session with ${coachDisplayName}`}
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {formatDuration(durationMinutes)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-accent-text">{rateLabel}</span>
          {coachLocation ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {coachLocation}
              </span>
            </>
          ) : null}
        </span>
      }
      headerAccent={<span aria-hidden="true" />}
      bodyClassName="px-5 py-5 sm:px-6 sm:py-6"
      footer={footer}
    >
      {success ? (
        <ModalSection className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-success/30 bg-success-soft text-success">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-bold tracking-[-0.01em] text-foreground">
            Booking request sent
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Coach {coachDisplayName} has been asked for a {formatDuration(durationMinutes)}{' '}
            {talent} session. Nothing is confirmed until they accept and both agreements are
            signed.
          </p>
          <dl className="mx-auto mt-5 grid max-w-md gap-2.5 rounded-xl border border-divider bg-muted/25 p-4 text-left text-xs">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="text-right font-semibold text-foreground">
                {formatBookingDate(date)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Time</dt>
              <dd className="text-right font-semibold tabular-nums text-foreground">
                {formatClock(startTime)} – {formatClock(endTime)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Session</dt>
              <dd className="text-right font-semibold text-foreground">
                {formatDuration(durationMinutes)} · {talent}
              </dd>
            </div>
          </dl>
          {warning && (
            <ModalCard className="mx-auto mt-3 max-w-md border-warning/30 bg-warning-soft p-3 text-warning">
              <div className="flex items-start gap-2 text-xs leading-relaxed">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {warning}
              </div>
            </ModalCard>
          )}
        </ModalSection>
      ) : profileLoading ? (
        <ModalSection className="space-y-3 py-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            Loading your profile and the coach&apos;s booking details…
          </p>
          <div className="g-skeleton h-28 rounded-xl" />
          <div className="g-skeleton h-20 rounded-xl" />
          <div className="g-skeleton h-20 rounded-xl" />
        </ModalSection>
      ) : !gate.allowed ? (
        <ModalSection className="py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-warning/30 bg-warning-soft text-warning">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-lg font-bold tracking-[-0.01em] text-foreground">
            Booking unavailable
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {gate.reason}
          </p>
          {gate.ctaHref && (
            <div className="mt-5 flex justify-center">
              <Link href={gate.ctaHref}>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full"
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                >
                  Go to profile verification
                </Button>
              </Link>
            </div>
          )}
        </ModalSection>
      ) : (
        <form
          id="booking-form"
          onSubmit={handleSubmit}
          className="space-y-5 text-sm sm:space-y-6"
          noValidate
        >
          {profileError && (
            <ModalCard className="border-warning/30 bg-warning-soft p-3 text-warning">
              <div className="flex items-start gap-2 text-xs leading-relaxed">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Your saved details could not be loaded ({profileError}). You can still fill the form
                in manually.
              </div>
            </ModalCard>
          )}
          {error && (
            <ModalCard className="border-danger/30 bg-danger-soft p-3 text-danger">
              <div role="alert" className="flex items-start gap-2 text-xs leading-relaxed">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            </ModalCard>
          )}

          {/* ── Date and start time ── */}
          <section aria-labelledby="booking-schedule-heading" className="space-y-4">
            <SectionHeading
              id="booking-schedule-heading"
              icon={<Calendar className="h-4 w-4" />}
              title="Date & time"
              description={
                noticeMs > 0
                  ? `Choose a day and start time. This coach needs ${noticeLabel} notice.`
                  : 'Choose a day and start time. No advance notice required.'
              }
              aside={
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDuration(durationMinutes)}
                </span>
              }
            />

            <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
              <div className="grid gap-5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-6">
                <div className="min-w-0">
                  <FieldLabel required>Date</FieldLabel>
                  <BookingCalendar
                    value={date}
                    onChange={handleDateChange}
                    nowMs={nowMs}
                    earliestMs={earliestMs}
                    durationMinutes={durationMinutes}
                    ownAppointments={ownAppointments}
                    noticeLabel={noticeLabel || undefined}
                    invalid={attempted && Boolean(errors.date)}
                    describedBy={attempted && errors.date ? 'booking-date-error' : undefined}
                    disabled={loading}
                  />

                  <div
                    aria-live="polite"
                    className="mt-3 rounded-xl border border-accent-border bg-accent-soft/70 px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-text">
                          Selected session
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-foreground">
                          {formatBookingDate(date)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md border border-accent-border/60 bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        {formatDuration(durationMinutes)}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold tabular-nums text-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                      {startTime
                        ? `${formatClock(startTime)} – ${formatClock(endTime)}`
                        : 'Choose a start time'}
                    </p>
                  </div>

                  <FieldError
                    id="booking-date-error"
                    message={attempted ? errors.date : undefined}
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-subtle-foreground">
                    Times are requests. Your coach confirms the final slot.
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                      Start time
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                      <span className="sr-only"> (required)</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {availableSlotCount > 0
                        ? `${availableSlotCount} available`
                        : 'No times available'}
                    </span>
                  </div>

                  <div
                    role="group"
                    aria-label="Available start times"
                    aria-invalid={attempted && Boolean(errors.startTime) ? 'true' : undefined}
                    aria-describedby={
                      attempted && errors.startTime ? 'booking-start-error' : undefined
                    }
                    className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4"
                  >
                    {chipSlots.map((slot) => {
                      const active = slot.start === startTime;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={slot.disabled}
                          aria-pressed={active}
                          aria-label={`${formatClock(slot.start)} to ${formatClock(slot.end)}${
                            slot.disabled && slot.reason ? `. Unavailable: ${slot.reason}` : ''
                          }`}
                          title={slot.reason ?? undefined}
                          onClick={() => setStartTime(slot.start)}
                          className={cn(
                            'flex h-10 cursor-pointer items-center justify-center rounded-lg border px-1 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                            active
                              ? 'border-accent bg-accent text-accent-foreground shadow-[var(--shadow-sm)]'
                              : slot.kind === 'available'
                                ? 'border-border bg-card text-foreground hover:border-border-strong hover:bg-muted'
                                : slot.kind === 'conflict'
                                  ? 'cursor-not-allowed border-warning/30 bg-warning-soft text-warning/80 line-through'
                                  : slot.kind === 'notice'
                                    ? 'cursor-not-allowed border-dashed border-border bg-muted/30 text-subtle-foreground/60'
                                    : 'cursor-not-allowed border-border bg-muted/30 text-subtle-foreground/50 line-through'
                          )}
                        >
                          {formatClock(slot.start)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px] border border-border bg-card"
                        aria-hidden="true"
                      />
                      Open
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px] bg-accent"
                        aria-hidden="true"
                      />
                      Selected
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px] border border-warning/30 bg-warning-soft"
                        aria-hidden="true"
                      />
                      Booked by you
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-border bg-muted/40"
                        aria-hidden="true"
                      />
                      Past / notice
                    </span>
                  </div>

                  {availableSlotCount === 0 && (
                    <p className="mt-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[11px] leading-relaxed text-warning">
                      No open start times on this date. Choose another day to continue.
                    </p>
                  )}

                  <FieldError
                    id="booking-start-error"
                    message={attempted ? errors.startTime : undefined}
                  />
                  {conflict && !attempted && (
                    <p className="mt-2 text-[11px] font-medium text-warning">
                      You already have a booking at {conflict.label ?? 'that time'}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Session focus ── */}
          <section
            aria-labelledby="booking-focus-heading"
            className="space-y-4 border-t border-divider pt-5 sm:pt-6"
          >
            <SectionHeading
              id="booking-focus-heading"
              icon={<Sparkles className="h-4 w-4" />}
              title="Session focus"
              description="Tell the coach what you want to achieve and how the session should run."
              aside={
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDuration(durationMinutes)} session
                </span>
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <FieldLabel>Format</FieldLabel>
                <select
                  value={sessionType}
                  onChange={(event) =>
                    setSessionType(event.target.value as (typeof SESSION_TYPES)[number]['value'])
                  }
                  className="g-input h-11 w-full cursor-pointer text-sm"
                >
                  {SESSION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel
                  aside={
                    coachProfile?.talents ? (
                      <span className="text-[10px] font-medium text-accent-text">From coach</span>
                    ) : undefined
                  }
                >
                  Discipline
                </FieldLabel>
                <select
                  value={talent}
                  onChange={(event) => setTalent(event.target.value)}
                  className="g-input h-11 w-full cursor-pointer text-sm"
                >
                  {talentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel>Experience</FieldLabel>
                <select
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  className="g-input h-11 w-full cursor-pointer text-sm"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>What do you want to work on?</FieldLabel>
                <textarea
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  rows={3}
                  maxLength={255}
                  placeholder="e.g. Audition prep, a specific routine, vocal range…"
                  className="g-input w-full resize-none text-sm leading-relaxed"
                  style={{ minHeight: '5.5rem' }}
                  aria-invalid={attempted && errors.purpose ? 'true' : undefined}
                  aria-describedby={
                    attempted && errors.purpose ? 'booking-purpose-error' : undefined
                  }
                />
                <FieldError
                  id="booking-purpose-error"
                  message={attempted ? errors.purpose : undefined}
                />
              </label>

              <label className="block">
                <FieldLabel optional>Notes for the coach</FieldLabel>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Audio tracks, access instructions, anything else…"
                  className="g-input w-full resize-none text-sm leading-relaxed"
                  style={{ minHeight: '5.5rem' }}
                />
              </label>
            </div>
          </section>

          {/* ── Contact details ── */}
          <section
            aria-labelledby="booking-details-heading"
            className="space-y-4 border-t border-divider pt-5 sm:pt-6"
          >
            <SectionHeading
              id="booking-details-heading"
              icon={<UserRound className="h-4 w-4" />}
              title="Your details"
              description={
                clientProfile
                  ? 'Prefilled from your profile. Edit anything that should differ for this booking.'
                  : 'How the coach can reach you about this session.'
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <FieldLabel
                  required
                  aside={<ProfileTag show={Boolean(clientProfile) && !nameEdited} />}
                >
                  Full name
                </FieldLabel>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameEdited(true);
                  }}
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                  className="g-input h-11 w-full text-sm"
                  aria-invalid={attempted && errors.name ? 'true' : undefined}
                  aria-describedby={attempted && errors.name ? 'booking-name-error' : undefined}
                />
                <FieldError id="booking-name-error" message={attempted ? errors.name : undefined} />
              </label>

              <label className="block">
                <FieldLabel
                  required
                  aside={<ProfileTag show={Boolean(clientProfile) && !emailEdited} />}
                >
                  Email
                </FieldLabel>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailEdited(true);
                  }}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="g-input h-11 w-full text-sm"
                  aria-invalid={attempted && errors.email ? 'true' : undefined}
                  aria-describedby={attempted && errors.email ? 'booking-email-error' : undefined}
                />
                <FieldError id="booking-email-error" message={attempted ? errors.email : undefined} />
              </label>

              <label className="block">
                <FieldLabel
                  required
                  aside={<ProfileTag show={Boolean(clientProfile) && !contactEdited} />}
                >
                  Mobile number
                </FieldLabel>
                <div className="flex w-full">
                  <span
                    aria-hidden="true"
                    className="flex min-w-[64px] items-center justify-center gap-1 rounded-l-lg border border-r-0 border-input bg-muted/50 text-sm font-semibold text-muted-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" />
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
                    className="g-input h-11 w-full rounded-l-none border-l-0 text-sm"
                    aria-invalid={attempted && errors.contact ? 'true' : undefined}
                    aria-describedby={
                      attempted && errors.contact ? 'booking-contact-error' : undefined
                    }
                  />
                </div>
                <FieldError
                  id="booking-contact-error"
                  message={attempted ? errors.contact : undefined}
                />
                {!attempted && contact && !isValidMobile(contact) && (
                  <p className="mt-1.5 text-[11px] text-warning">
                    10 digits starting with 9, e.g. 9171234567.
                  </p>
                )}
              </label>

              {isOnline ? (
                <div className="block">
                  <FieldLabel>Service area</FieldLabel>
                  <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{coachLocation || 'Online session'}</span>
                  </div>
                </div>
              ) : (
                <label className="block">
                  <FieldLabel
                    required
                    aside={
                      <ProfileTag
                        show={Boolean(clientProfile) && !addressEdited && Boolean(address)}
                      />
                    }
                  >
                    Studio or meeting address
                  </FieldLabel>
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
                    className="g-input h-11 w-full text-sm"
                    aria-invalid={attempted && errors.address ? 'true' : undefined}
                    aria-describedby={
                      attempted && errors.address ? 'booking-address-error' : undefined
                    }
                  />
                  <FieldError
                    id="booking-address-error"
                    message={attempted ? errors.address : undefined}
                  />
                  {address && clientProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddress(composeProfileAddress(clientProfile));
                        setAddressEdited(false);
                      }}
                      className="mt-1.5 cursor-pointer text-[11px] font-semibold text-accent-text underline underline-offset-2"
                    >
                      Use my saved address
                    </button>
                  )}
                </label>
              )}
            </div>

            {isOnline && (
              <ModalCard className="border-info/30 bg-info-soft p-3 text-info">
                <div className="flex items-start gap-2 text-xs leading-relaxed">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Your coach will share the meeting link or studio details in Messages.
                </div>
              </ModalCard>
            )}
          </section>

          {/* ── Booking information ── */}
          <section
            aria-labelledby="booking-info-heading"
            className="border-t border-divider pt-5 sm:pt-6"
          >
            <h3 id="booking-info-heading" className="sr-only">
              Booking information
            </h3>
            <div className="grid gap-4 rounded-xl border border-divider bg-muted/25 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                  Session fee
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">{rateLabel}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {paymentNote}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                  Duration
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {formatDuration(durationMinutes)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {selectedType.label} · {talent}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle-foreground">
                  Before you book
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  This sends a request. The session is confirmed only after your coach accepts and
                  both agreements are signed.
                </p>
              </div>
            </div>
          </section>
        </form>
      )}
    </Modal>
  );
}

export default BookingModal;
