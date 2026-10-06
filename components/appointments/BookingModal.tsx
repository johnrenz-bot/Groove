'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Phone,
  Target,
  FileText,
} from 'lucide-react';
import { FullCoach, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { bookingGate, coachBookingGate, type VerificationGate } from '@/lib/verification';
import { Button } from '@/components/ui/Button';

interface BookingModalProps {
  coach: FullCoach;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_SJDM_STUDIOS = [
  'Star Studio, Tungkong Mangga, SJDM',
  'SJDM Performing Arts Space, Muzon',
  'Groove Hub Rehearsal Hall, SJDM',
  'Online 1-on-1 Studio Session',
];

export function BookingModal({ coach, isOpen, onClose, onSuccess }: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Default to tomorrow's date
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [date, setDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [sessionType, setSessionType] = useState('Face to Face Rehearsal');
  const [talent, setTalent] = useState(coach.coach_profile?.talents?.split(',')[0] || 'Dance');
  const [experience, setExperience] = useState('Beginner');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('Star Studio, Tungkong Mangga, SJDM');
  const [contact, setContact] = useState('');

  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [gateResolved, setGateResolved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (!cancelled && profile) {
          setClientProfile(profile as Profile);
          if (profile.contact_number) {
            setContact(profile.contact_number);
          }
        }
      } catch {
        if (!cancelled) setClientProfile(null);
      } finally {
        if (!cancelled) setGateResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Calculate session duration in hours / minutes
  const sessionDuration = useMemo(() => {
    if (!startTime || !endTime) return null;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (totalMinutes <= 0) return null;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`;
    return `${m} mins`;
  }, [startTime, endTime]);

  const isTimeInvalid = useMemo(() => {
    if (!startTime || !endTime) return false;
    return endTime <= startTime;
  }, [startTime, endTime]);

  if (!isOpen) return null;

  if (isOpen && !gateResolved) {
    return (
      <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground rounded-2xl border border-border bg-card p-6 shadow-xl">
          <Loader2 className="g-spin h-6 w-6 text-accent" aria-hidden="true" />
          <span>Verifying booking eligibility…</span>
        </div>
      </div>
    );
  }

  const clientCheck = bookingGate(clientProfile);
  const coachCheck = coachBookingGate(coach);
  const gate: VerificationGate = !clientCheck.allowed
    ? clientCheck
    : !coachCheck.allowed
      ? {
          allowed: false,
          reason:
            'This coach is not verified yet, so bookings cannot be accepted. Please choose a verified coach.',
          ctaHref: null,
        }
      : { allowed: true, reason: null, ctaHref: null };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTimeInvalid) {
      setError('Session end time must be later than start time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Please login to book an appointment.');
      }

      const { data: currentClient } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const clientName = currentClient
        ? `${currentClient.firstname} ${currentClient.lastname}`.trim()
        : user.email || 'Client';

      const submitGate = bookingGate((currentClient as Profile) ?? null);
      if (!submitGate.allowed) {
        throw new Error(submitGate.reason ?? 'Your account is not verified yet.');
      }
      if (!coach.account_verified) {
        throw new Error(
          'This coach is not verified yet, so bookings cannot be accepted. Please choose a verified coach.'
        );
      }

      if (!user.email) {
        throw new Error(
          'Your account has no email address, which is required for a booking. Please add one in your profile settings.'
        );
      }

      const { error: insertError } = await supabase
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
          purpose,
          message,
          address,
          contact,
          status: 'pending',
          name: clientName,
          email: user.email,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create notification for coach
      await supabase.from('notifications').insert({
        user_id: coach.id,
        title: 'New Session Request Received',
        message: `${clientName} sent a booking request for ${talent} on ${date} at ${startTime}.`,
        cta_url: '/coach/appointments',
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create appointment.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const rate = coach.coach_profile?.service_fee ?? 500;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md transition-opacity duration-200 sm:p-5 animate-in fade-in select-none sm:select-text"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Book session with Coach ${coach.firstname}`}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl animate-in zoom-in-95 duration-200 sm:rounded-3xl">
        {/* Fixed Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-divider bg-card px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted font-bold text-accent-text shadow-sm">
              {coach.photo_url ? (
                <img src={coach.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                coach.firstname?.[0]
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-bold text-foreground sm:text-lg">
                  Book Session with Coach {coach.firstname}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-text">
                  ₱{rate}
                </span>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-accent-text" />
                San Jose del Monte Coaching Hub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            aria-label="Close booking modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="g-scroll flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {!gate.allowed ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-warning/30 bg-warning-soft text-warning shadow-sm">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h4 className="mt-4 text-lg font-bold text-foreground">Booking Unavailable</h4>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {gate.reason}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {gate.ctaHref && (
                  <Link href={gate.ctaHref}>
                    <Button icon={<ShieldCheck className="h-4 w-4" />}>
                      Go to profile verification
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : success ? (
            <div className="py-10 text-center space-y-3.5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-success/30 bg-success-soft text-success shadow-sm animate-in zoom-in-75">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h4 className="text-xl font-bold text-foreground">Booking Request Sent!</h4>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Coach {coach.firstname} has been notified for your {talent} session on{' '}
                <strong className="text-foreground">{date}</strong> at{' '}
                <strong className="text-foreground">{startTime}</strong>.
              </p>
              <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground">
                <Calendar className="h-4 w-4 text-accent-text" />
                Track status under Appointments
              </div>
            </div>
          ) : (
            <form id="booking-form" onSubmit={handleSubmit} className="space-y-5 text-xs">
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Schedule & Duration */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 sm:p-5">
                <div className="flex items-center justify-between border-b border-divider pb-2.5">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-text">
                    <Calendar className="h-4 w-4" />
                    1. Rehearsal Schedule &amp; Time
                  </span>
                  {sessionDuration && !isTimeInvalid && (
                    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-[11px] text-accent-text">
                      Duration: {sessionDuration}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                      Session Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="g-input h-10 w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="g-input h-10 w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`g-input h-10 w-full text-xs ${
                        isTimeInvalid ? 'border-danger focus:border-danger' : ''
                      }`}
                    />
                  </div>
                </div>

                {isTimeInvalid && (
                  <p className="text-[11px] font-medium text-danger">
                    End time must be later than start time.
                  </p>
                )}
              </div>

              {/* Step 2: Session Discipline */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 sm:p-5">
                <span className="flex items-center gap-2 border-b border-divider pb-2.5 text-xs font-bold uppercase tracking-wider text-accent-text">
                  <Sparkles className="h-4 w-4" />
                  2. Session Focus &amp; Experience
                </span>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                      Session Type
                    </label>
                    <select
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="g-input h-10 w-full text-xs cursor-pointer"
                    >
                      <option value="Face to Face Rehearsal">Face to Face Rehearsal</option>
                      <option value="Online 1-on-1 Coaching">Online 1-on-1 Coaching</option>
                      <option value="Studio Workshop">Studio Workshop</option>
                      <option value="Choreography Routine">Choreography Routine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                      Talent Category
                    </label>
                    <select
                      value={talent}
                      onChange={(e) => setTalent(e.target.value)}
                      className="g-input h-10 w-full text-xs cursor-pointer"
                    >
                      <option value="Dance">Dance</option>
                      <option value="Singing">Singing</option>
                      <option value="Acting">Acting</option>
                      <option value="Theater">Theater</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                      Experience Level
                    </label>
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="g-input h-10 w-full text-xs cursor-pointer"
                    >
                      <option value="Beginner">Beginner (First time / basic)</option>
                      <option value="Intermediate">Intermediate (1-3 yrs)</option>
                      <option value="Advanced">Advanced (3+ yrs)</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Location & Contact */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 sm:p-5">
                <span className="flex items-center gap-2 border-b border-divider pb-2.5 text-xs font-bold uppercase tracking-wider text-accent-text">
                  <MapPin className="h-4 w-4" />
                  3. Studio Venue &amp; Contact Number
                </span>

                <div className="space-y-2.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground">
                    Studio or Venue Address (San Jose del Monte) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Star Studio, Tungkong Mangga, San Jose del Monte"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="g-input h-10 w-full text-xs"
                  />

                  {/* Quick Venue Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground mr-1">Quick pick:</span>
                    {COMMON_SJDM_STUDIOS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAddress(s)}
                        className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] text-muted-foreground transition hover:border-accent-border hover:bg-accent-soft hover:text-accent-text cursor-pointer"
                      >
                        {s.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                    Client Contact Number *
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      placeholder="09123456789"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="g-input h-10 w-full pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Goals & Details */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3 sm:p-5">
                <span className="flex items-center gap-2 border-b border-divider pb-2.5 text-xs font-bold uppercase tracking-wider text-accent-text">
                  <Target className="h-4 w-4" />
                  4. Session Purpose &amp; Goals
                </span>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                    Session Purpose &amp; Goals *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Audition prep, learning specific choreography, vocal range extension, stage presence..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="g-input w-full p-2.5 resize-none text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-1">
                    Additional Notes / Message (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any special requests, audio tracks, or guidelines for the coach..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="g-input w-full p-2.5 resize-none text-xs leading-relaxed"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Sticky Footer */}
        {gate.allowed && !success && (
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-divider bg-muted/40 px-5 py-3.5 backdrop-blur-sm sm:px-7 sm:py-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Session Fee:</span>
              <span className="text-sm font-bold text-accent-text">₱{rate}</span>
              <span className="text-[10px] text-muted-foreground">/ session</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="booking-form"
                disabled={loading || isTimeInvalid}
                className="px-5 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:bg-accent-hover disabled:opacity-50 transition cursor-pointer min-h-[38px] shadow-sm flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting Request…
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

export default BookingModal;
